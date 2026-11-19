const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const SECRET_KEY = process.env.JWT_SECRET || 'Teddy12@12';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || 'TU_GOOGLE_CLIENT_ID.apps.googleusercontent.com');

async function initDB() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            email VARCHAR(150) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            telefono VARCHAR(20),
            palabra_secreta VARCHAR(100) NOT NULL,
            rol VARCHAR(20) DEFAULT 'cliente' CHECK (rol IN ('admin', 'cliente')),
            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS productos (
            id SERIAL PRIMARY KEY,
            titulo VARCHAR(150) NOT NULL,
            categoria VARCHAR(50) NOT NULL,
            etiqueta VARCHAR(50) DEFAULT 'Remate Final',
            precio_remate NUMERIC(10, 2) NOT NULL,
            precio_original NUMERIC(10, 2) NOT NULL,
            precio_mayor NUMERIC(10, 2) DEFAULT 0.00,
            stock_by_size JSONB NOT NULL,
            porcentaje_vendido INTEGER DEFAULT 35,
            material TEXT,
            descripcion TEXT,
            imagen_url TEXT NOT NULL,
            colores JSONB DEFAULT '["Corinto", "Negro", "Rojo", "Beige"]'::jsonb,
            imagenes JSONB DEFAULT '[]'::jsonb,
            variant_details JSONB DEFAULT '[]'::jsonb,
            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS configuracion_tienda (
            clave VARCHAR(50) PRIMARY KEY,
            valor TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS prendas_confeccion (
            id SERIAL PRIMARY KEY,
            modelo VARCHAR(255) NOT NULL,
            precio NUMERIC(10, 2) NOT NULL,
            colores JSONB NOT NULL DEFAULT '[]'::jsonb,
            tallas JSONB NOT NULL DEFAULT '[]'::jsonb,
            imagen TEXT,
            imagenes JSONB NOT NULL DEFAULT '[]'::jsonb,
            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS config_confeccion (
            id INTEGER PRIMARY KEY DEFAULT 1,
            fecha_inicio VARCHAR(50) NOT NULL,
            fecha_fin VARCHAR(50) NOT NULL,
            comunicado TEXT
        );

        CREATE TABLE IF NOT EXISTS pedidos_confeccion (
            id SERIAL PRIMARY KEY,
            orden VARCHAR(50) NOT NULL,
            fecha VARCHAR(100) NOT NULL,
            modelo VARCHAR(255) NOT NULL,
            color VARCHAR(100) NOT NULL,
            talla VARCHAR(50) NOT NULL,
            precio NUMERIC(10, 2) NOT NULL,
            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS pagos_yape_plin (
            id SERIAL PRIMARY KEY,
            orden VARCHAR(50) NOT NULL,
            cliente VARCHAR(150),
            telefono VARCHAR(20),
            total NUMERIC(10, 2) NOT NULL,
            metodo VARCHAR(20) NOT NULL,
            imagen_voucher TEXT NOT NULL,
            hash_imagen VARCHAR(64) UNIQUE NOT NULL,
            estado VARCHAR(20) DEFAULT 'Pendiente',
            detalles_pedido JSONB DEFAULT '[]'::jsonb,
            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Asegurar compatibilidad si las tablas ya existían sin las columnas nuevas
    await pool.query(`
        ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_mayor NUMERIC(10, 2) DEFAULT 0.00;
        ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefono VARCHAR(20);
        ALTER TABLE pagos_yape_plin ADD COLUMN IF NOT EXISTS telefono VARCHAR(20);
        ALTER TABLE pagos_yape_plin ADD COLUMN IF NOT EXISTS detalles_pedido JSONB DEFAULT '[]'::jsonb;
    `);

    await pool.query(`
        INSERT INTO usuarios (nombre, email, password, palabra_secreta, rol)
        VALUES ('Liz Admin', 'admin@rematestyle.com', 'admin1234', 'piura2026', 'admin')
        ON CONFLICT (email) DO NOTHING;

        INSERT INTO config_confeccion (id, fecha_inicio, fecha_fin, comunicado)
        VALUES (
            1,
            TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI'),
            TO_CHAR(NOW() + INTERVAL '7 days', 'YYYY-MM-DD"T"HH24:MI'),
            '¡Bienvenidos a nuestra campaña de confección personalizada! Selecciona tu modelo favorito, color y talla dentro del plazo indicado.'
        )
        ON CONFLICT (id) DO NOTHING;
    `);
}
initDB().catch(console.error);

function soloAdmin(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token requerido' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err || user.rol !== 'admin') return res.status(403).json({ error: 'Acceso exclusivo para Administrador' });
        req.user = user;
        next();
    });
}

app.get('/', (req, res) => res.send('API REMATE STYLE activa'));

app.post('/api/registro', async (req, res) => {
    const { nombre, email, password, telefono, palabra_secreta } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO usuarios (nombre, email, password, telefono, palabra_secreta, rol) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, nombre, email, telefono, rol',
            [nombre, email, password, telefono || '', palabra_secreta, 'cliente']
        );
        const user = result.rows[0];
        const token = jwt.sign({ id: user.id, rol: user.rol, nombre: user.nombre }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, usuario: user });
    } catch (err) {
        res.status(400).json({ error: 'El correo ya está registrado.' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND password = $2', [email, password]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });

        const user = result.rows[0];
        const token = jwt.sign({ id: user.id, rol: user.rol, nombre: user.nombre }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, usuario: { id: user.id, nombre: user.nombre, email: user.email, telefono: user.telefono, rol: user.rol } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =====================================================================
// RUTA DE RECUPERACIÓN DE CONTRASEÑA CON PALABRA SECRETA
// =====================================================================
app.post('/api/recuperar-password', async (req, res) => {
    const { email, palabra_secreta, nueva_password } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE email = $1 AND palabra_secreta = $2',
            [email, palabra_secreta]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Correo o palabra secreta incorrectos' });
        }

        await pool.query(
            'UPDATE usuarios SET password = $1 WHERE email = $2',
            [nueva_password, email]
        );

        res.json({ success: true, message: 'Contraseña actualizada con éxito' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error en el servidor al recuperar contraseña' });
    }
});

app.get('/api/productos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM productos ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/productos', soloAdmin, async (req, res) => {
    const { titulo, categoria, etiqueta, precio_remate, precio_original, precio_mayor, stock_by_size, porcentaje_vendido, material, descripcion, imagen_url, colores, imagenes, variant_details } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO productos (titulo, categoria, etiqueta, precio_remate, precio_original, precio_mayor, stock_by_size, porcentaje_vendido, material, descripcion, imagen_url, colores, imagenes, variant_details)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
            [
                titulo, categoria, etiqueta, precio_remate, precio_original, precio_mayor || 0,
                JSON.stringify(stock_by_size), porcentaje_vendido || 35, material, descripcion, imagen_url, 
                JSON.stringify(colores || ['Corinto', 'Negro', 'Rojo', 'Beige']), 
                JSON.stringify(imagenes || [imagen_url]),
                JSON.stringify(variant_details || [])
            ]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/productos/:id', soloAdmin, async (req, res) => {
    const { id } = req.params;
    const { titulo, categoria, etiqueta, precio_remate, precio_original, precio_mayor, stock_by_size, porcentaje_vendido, material, descripcion, imagen_url, colores, imagenes, variant_details } = req.body;
    try {
        const result = await pool.query(
            `UPDATE productos SET titulo=$1, categoria=$2, etiqueta=$3, precio_remate=$4, precio_original=$5, precio_mayor=$6, stock_by_size=$7, porcentaje_vendido=$8, material=$9, descripcion=$10, imagen_url=$11, colores=$12, imagenes=$13, variant_details=$14 WHERE id=$15 RETURNING *`,
            [
                titulo, categoria, etiqueta, precio_remate, precio_original, precio_mayor || 0,
                JSON.stringify(stock_by_size), porcentaje_vendido || 35, material, descripcion, imagen_url, 
                JSON.stringify(colores || ['Corinto', 'Negro', 'Rojo', 'Beige']), 
                JSON.stringify(imagenes || [imagen_url]),
                JSON.stringify(variant_details || []), id
            ]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/productos/:id', soloAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM productos WHERE id = $1', [req.params.id]);
        res.json({ mensaje: 'Prenda eliminada correctamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/oferta-tiempo', async (req, res) => {
    try {
        const result = await pool.query("SELECT valor FROM configuracion_tienda WHERE clave = 'offer_end_time'");
        res.json({ offer_end_time: result.rows.length > 0 ? Number(result.rows[0].valor) : null });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/oferta-tiempo', soloAdmin, async (req, res) => {
    const { offer_end_time } = req.body;
    if (!offer_end_time) return res.status(400).json({ error: 'Fecha inválida' });
    try {
        await pool.query(
            `INSERT INTO configuracion_tienda (clave, valor) VALUES ('offer_end_time', $1)
             ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor`,
            [String(offer_end_time)]
        );
        res.json({ mensaje: 'Horario guardado en Neon', offer_end_time: Number(offer_end_time) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =====================================================================
// MÓDULO DE PAGO YAPE Y PLIN (VALIDACIÓN DE VOUCHERS Y DUPLICADOS)
// =====================================================================

app.get('/api/pagos/cliente/:nombre', async (req, res) => {
    const { nombre } = req.params;
    try {
        const query = `
            SELECT * FROM pagos_yape_plin 
            WHERE cliente ILIKE $1 OR cliente ILIKE $2 
            ORDER BY id DESC
        `;
        const result = await pool.query(query, [nombre, `%${nombre}%`]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/pagos', soloAdmin, async (req, res) => {
    try {
        const query = `
            SELECT p.*, COALESCE(p.telefono, u.telefono) as telefono 
            FROM pagos_yape_plin p
            LEFT JOIN usuarios u ON LOWER(TRIM(p.cliente)) = LOWER(TRIM(u.nombre))
            ORDER BY p.id DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/pagos', async (req, res) => {
    const { orden, cliente, telefono, total, metodo, imagen_voucher, hash_imagen, detalles_pedido } = req.body;
    try {
        const check = await pool.query('SELECT id FROM pagos_yape_plin WHERE hash_imagen = $1', [hash_imagen]);
        if (check.rows.length > 0) {
            return res.status(400).json({ error: 'Este comprobante de pago ya fue utilizado anteriormente. No se permite subir dos veces la misma captura.' });
        }

        const result = await pool.query(
            `INSERT INTO pagos_yape_plin (orden, cliente, telefono, total, metodo, imagen_voucher, hash_imagen, detalles_pedido)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [orden, cliente || 'Cliente Web', telefono || '', total, metodo, imagen_voucher, hash_imagen, JSON.stringify(detalles_pedido || [])]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(400).json({ error: 'El comprobante ya está registrado en el sistema.' });
    }
});

app.put('/api/pagos/:id/estado', soloAdmin, async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    try {
        const result = await pool.query('UPDATE pagos_yape_plin SET estado = $1 WHERE id = $2 RETURNING *', [estado, id]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =====================================================================
// MÓDULO DE CONFECCIÓN PERSONALIZADA (CONECTADO A NEON)
// =====================================================================
app.get('/api/confeccion/config', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM config_confeccion WHERE id = 1');
        res.json(result.rows[0] || null);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/confeccion/config', soloAdmin, async (req, res) => {
    const { fecha_inicio, fecha_fin, comunicado } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO config_confeccion (id, fecha_inicio, fecha_fin, comunicado)
             VALUES (1, $1, $2, $3)
             ON CONFLICT (id) DO UPDATE SET
                fecha_inicio = EXCLUDED.fecha_inicio,
                fecha_fin = EXCLUDED.fecha_fin,
                comunicado = EXCLUDED.comunicado
             RETURNING *`,
            [fecha_inicio, fecha_fin, comunicado]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/confeccion/prendas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM prendas_confeccion ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/confeccion/prendas', soloAdmin, async (req, res) => {
    const { modelo, precio, colores, tallas, imagen, imagenes } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO prendas_confeccion (modelo, precio, colores, tallas, imagen, imagenes)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [
                modelo,
                precio,
                JSON.stringify(colores || []),
                JSON.stringify(tallas || []),
                imagen || (imagenes && imagenes[0]) || '',
                JSON.stringify(imagenes || [])
            ]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/confeccion/prendas/:id', soloAdmin, async (req, res) => {
    const { id } = req.params;
    const { modelo, precio, colores, tallas, imagen, imagenes } = req.body;
    try {
        const result = await pool.query(
            `UPDATE prendas_confeccion
             SET modelo=$1, precio=$2, colores=$3, tallas=$4, imagen=$5, imagenes=$6
             WHERE id=$7 RETURNING *`,
            [
                modelo,
                precio,
                JSON.stringify(colores || []),
                JSON.stringify(tallas || []),
                imagen || (imagenes && imagenes[0]) || '',
                JSON.stringify(imagenes || []),
                id
            ]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/confeccion/prendas/:id', soloAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM prendas_confeccion WHERE id = $1', [req.params.id]);
        res.json({ mensaje: 'Prenda de confección eliminada' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/confeccion/pedidos', soloAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM pedidos_confeccion ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/confeccion/pedidos', async (req, res) => {
    const { orden, fecha, modelo, color, talla, precio } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO pedidos_confeccion (orden, fecha, modelo, color, talla, precio)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [orden, fecha, modelo, color, talla, precio]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/confeccion/pedidos/:id', soloAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM pedidos_confeccion WHERE id = $1', [req.params.id]);
        res.json({ mensaje: 'Pedido eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/confeccion/pedidos', soloAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM pedidos_confeccion');
        res.json({ mensaje: 'Historial de pedidos limpiado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =====================================================================
// MÓDULO DE MERCADO PAGO (UBICADO CORRECTAMENTE ANTES DEL PUERTO)
// =====================================================================
const { MercadoPagoConfig, Preference } = require('mercadopago');

const clientMP = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || 'APP_USR-tu-access-token-de-prueba-o-produccion' });

app.post('/api/crear-preferencia-mp', async (req, res) => {
    try {
        const { items, cliente, telefono, orden } = req.body;

        const preference = new Preference(clientMP);
        
        const itemsMP = items.map(item => ({
            title: `${item.titulo} (Talla: ${item.talla} - Color: ${item.color})`,
            unit_price: Number(item.precio_remate),
            quantity: Number(item.cantidad),
            currency_id: 'PEN'
        }));

        const result = await preference.create({
            body: {
                items: itemsMP,
                payer: {
                    name: cliente || 'Cliente Liz Fashion',
                    phone: { number: telefono || '' }
                },
                back_urls: {
                    success: "https://tu-dominio-en-render.onrender.com/?status=success",
                    failure: "https://tu-dominio-en-render.onrender.com/?status=failure",
                    pending: "https://tu-dominio-en-render.onrender.com/?status=pending"
                },
                auto_return: "approved",
                external_reference: orden
            }
        });

        res.json({ 
            init_point: result.init_point,
            sandbox_init_point: result.sandbox_init_point 
        });
    } catch (err) {
        console.error("Error al crear preferencia de Mercado Pago:", err);
        res.status(500).json({ error: err.message });
    }
});

// =====================================================================
// INICIO DEL SERVIDOR
// =====================================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));

// =====================================================================
// WEBHOOK DE MERCADO PAGO (NOTIFICACIONES AUTOMÁTICAS)
// =====================================================================
app.post('/api/webhook-mp', async (req, res) => {
    try {
        const evento = req.body || {};
        const tipo = evento.type || req.query.type || evento.topic || req.query.topic || 'desconocido';
        const dataId = evento.data?.id || req.query['data.id'] || req.query.id || null;

        console.log('Webhook Mercado Pago recibido:', { tipo, dataId });

        // Si llega una notificación de pago y tenemos referencia/orden, podemos actualizar en Neon
        const referenciaOrden = evento.external_reference || req.query.external_reference || null;
        if (referenciaOrden && (tipo === 'payment' || evento.action === 'payment.created' || evento.action === 'payment.updated')) {
            await pool.query(
                `UPDATE pagos_yape_plin SET estado = 'Aprobado' WHERE orden = $1 AND metodo ILIKE '%Mercado Pago%'`,
                [String(referenciaOrden)]
            );
        }

        // Mercado Pago exige responder con estado 200/201 para confirmar recepción
        res.status(200).json({ recibido: true, tipo, id: dataId });
    } catch (err) {
        console.error('Error en /api/webhook-mp:', err);
        res.status(200).json({ recibido: true, error: err.message });
    }
});