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

    await pool.query(`
        ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_mayor NUMERIC(10, 2) DEFAULT 0.00;
        ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefono VARCHAR(20);
        ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS puntos INTEGER DEFAULT 0;
        ALTER TABLE pagos_yape_plin ADD COLUMN IF NOT EXISTS telefono VARCHAR(20);
        ALTER TABLE pagos_yape_plin ADD COLUMN IF NOT EXISTS detalles_pedido JSONB DEFAULT '[]'::jsonb;

        CREATE TABLE IF NOT EXISTS productos_canje (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(150) NOT NULL,
            imagen_url TEXT NOT NULL,
            puntos_requeridos INTEGER NOT NULL DEFAULT 1,
            precio_adicional NUMERIC(10, 2) DEFAULT 0.00,
            stock INTEGER DEFAULT 10,
            activo BOOLEAN DEFAULT TRUE,
            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS historial_canjes (
            id SERIAL PRIMARY KEY,
            usuario_id INTEGER REFERENCES usuarios(id),
            producto_canje_id INTEGER REFERENCES productos_canje(id),
            puntos_usados INTEGER NOT NULL,
            monto_adicional_pagado NUMERIC(10, 2) DEFAULT 0.00,
            metodo_pago VARCHAR(50) DEFAULT 'Solo Puntos',
            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
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
    const { orden, cliente, telefono, total, metodo, nro_operacion, imagen_voucher, hash_imagen, huella_visual, detalles_pedido } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const opLimpia = nro_operacion ? String(nro_operacion).trim() : null;
        const huellaLimpia = huella_visual ? String(huella_visual).trim() : null;

        const check = await client.query(
            `SELECT id FROM pagos_yape_plin
             WHERE hash_imagen = $1
                OR ($2::text IS NOT NULL AND huella_visual = $2)
                OR ($3::text IS NOT NULL AND nro_operacion = $3)`,
            [hash_imagen, huellaLimpia, opLimpia]
        );
        if (check.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Este comprobante o Nro. de operación ya fue utilizado anteriormente. No se permite subir más de una vez.' });
        }

        const listaDetalles = Array.isArray(detalles_pedido) ? detalles_pedido : [];

        for (const item of listaDetalles) {
            const qtyToDeduct = Math.max(1, Number(item.cantidad) || 1);
            const sizeKey = item.talla;
            const colorKey = String(item.color || '').trim().toLowerCase();

            let prodRow = null;
            if (item.codigo && String(item.codigo).startsWith('LIZ-')) {
                const parsedId = parseInt(String(item.codigo).replace('LIZ-', ''), 10);
                if (!isNaN(parsedId)) {
                    const byId = await client.query('SELECT * FROM productos WHERE id = $1', [parsedId]);
                    if (byId.rows.length > 0) prodRow = byId.rows[0];
                }
            }
            if (!prodRow && item.titulo) {
                const byTitle = await client.query('SELECT * FROM productos WHERE LOWER(TRIM(titulo)) = LOWER(TRIM($1)) LIMIT 1', [item.titulo]);
                if (byTitle.rows.length > 0) prodRow = byTitle.rows[0];
            }

            if (!prodRow) continue;

            let variants = typeof prodRow.variant_details === 'string'
                ? JSON.parse(prodRow.variant_details)
                : (Array.isArray(prodRow.variant_details) ? prodRow.variant_details : []);

            let stockBySize = typeof prodRow.stock_by_size === 'string'
                ? JSON.parse(prodRow.stock_by_size)
                : (prodRow.stock_by_size && typeof prodRow.stock_by_size === 'object' ? prodRow.stock_by_size : { S: 0, M: 0, L: 0, XL: 0, XXL: 0 });

            if (variants.length > 0) {
                const vIdx = variants.findIndex(v => String(v.color || '').trim().toLowerCase() === colorKey);
                if (vIdx >= 0 && variants[vIdx].stockBySize && sizeKey) {
                    const actual = Number(variants[vIdx].stockBySize[sizeKey] || 0);
                    variants[vIdx].stockBySize[sizeKey] = Math.max(0, actual - qtyToDeduct);
                }
                stockBySize = variants.reduce((acc, v) => {
                    acc.S = Number(acc.S || 0) + Number(v.stockBySize?.S || 0);
                    acc.M = Number(acc.M || 0) + Number(v.stockBySize?.M || 0);
                    acc.L = Number(acc.L || 0) + Number(v.stockBySize?.L || 0);
                    acc.XL = Number(acc.XL || 0) + Number(v.stockBySize?.XL || 0);
                    acc.XXL = Number(acc.XXL || 0) + Number(v.stockBySize?.XXL || 0);
                    return acc;
                }, { S: 0, M: 0, L: 0, XL: 0, XXL: 0 });
            } else if (sizeKey) {
                const actual = Number(stockBySize[sizeKey] || 0);
                stockBySize[sizeKey] = Math.max(0, actual - qtyToDeduct);
            }

            await client.query(
                `UPDATE productos SET stock_by_size = $1, variant_details = $2 WHERE id = $3`,
                [JSON.stringify(stockBySize), JSON.stringify(variants), prodRow.id]
            );
        }

        const result = await client.query(
            `INSERT INTO pagos_yape_plin (orden, cliente, telefono, total, metodo, nro_operacion, imagen_voucher, hash_imagen, huella_visual, detalles_pedido)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [orden, cliente || 'Cliente Web', telefono || '', total, metodo, opLimpia, imagen_voucher, hash_imagen, huellaLimpia, JSON.stringify(listaDetalles)]
        );

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        if (err && err.code === '23505') {
            return res.status(409).json({ error: 'Este comprobante o número de operación ya está registrado en el sistema y no puede repetirse.' });
        }
        res.status(400).json({ error: 'El comprobante ya está registrado en el sistema o hubo un error al guardarlo.' });
    } finally {
        client.release();
    }
});

app.put('/api/pagos/:id/estado', soloAdmin, async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    const estadoNormalizado = estado === 'Aprobado' ? 'Aprobado' : (estado === 'Rechazado' ? 'Rechazado' : 'Pendiente');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const pagoRes = await client.query('SELECT * FROM pagos_yape_plin WHERE id = $1 FOR UPDATE', [id]);
        if (pagoRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Pago no encontrado.' });
        }

        const pago = pagoRes.rows[0];
        await client.query('UPDATE pagos_yape_plin SET estado = $1 WHERE id = $2', [estadoNormalizado, id]);

        if (estadoNormalizado === 'Aprobado' && pago.orden && String(pago.orden).startsWith('CANJE-')) {
            const partesOrden = String(pago.orden).split('-');
            const productoCanjeId = parseInt(partesOrden[1], 10);

            if (!isNaN(productoCanjeId)) {
                const prodRes = await client.query('SELECT * FROM productos_canje WHERE id = $1 FOR UPDATE', [productoCanjeId]);
                if (prodRes.rows.length > 0) {
                    const producto = prodRes.rows[0];
                    const ptsReq = Number(producto.puntos_requeridos) || 0;

                    await client.query(
                        'UPDATE productos_canje SET stock = GREATEST(0, COALESCE(stock, 1) - 1), activo = FALSE WHERE id = $1',
                        [productoCanjeId]
                    );

                    if (pago.cliente) {
                        const userRes = await client.query(
                            'SELECT id, puntos FROM usuarios WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1)) LIMIT 1 FOR UPDATE',
                            [pago.cliente]
                        );
                        if (userRes.rows.length > 0) {
                            const userId = userRes.rows[0].id;
                            const ptsActuales = Number(userRes.rows[0].puntos) || 0;
                            const ptsDescontar = Math.min(ptsActuales, ptsReq);
                            const ptsNuevos = Math.max(0, ptsActuales - ptsDescontar);

                            await client.query('UPDATE usuarios SET puntos = $1 WHERE id = $2', [ptsNuevos, userId]);
                            await client.query(
                                `INSERT INTO historial_canjes (usuario_id, producto_canje_id, puntos_usados, monto_adicional_pagado, metodo_pago)
                                 VALUES ($1, $2, $3, $4, $5)`,
                                [userId, productoCanjeId, ptsDescontar, Number(pago.total) || 0, `${pago.metodo} (Aprobado)`]
                            );
                        }
                    }
                }
            }
        }

        const pagoActualizadoRes = await client.query(
            `SELECT p.*, COALESCE(NULLIF(TRIM(p.telefono), ''), u.telefono, '') AS telefono
             FROM pagos_yape_plin p
             LEFT JOIN usuarios u ON LOWER(TRIM(p.cliente)) = LOWER(TRIM(u.nombre))
             WHERE p.id = $1`,
            [id]
        );
        const pagoFinal = pagoActualizadoRes.rows[0] || pago;

        await client.query('COMMIT');
        res.json({
            success: true,
            estado: estadoNormalizado,
            pago: pagoFinal,
            cliente: pagoFinal.cliente,
            orden: pagoFinal.orden,
            metodo: pagoFinal.metodo,
            total: pagoFinal.total,
            telefono: pagoFinal.telefono || ''
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error al actualizar estado de pago:', err);
        res.status(500).json({ error: 'Error al actualizar estado en el servidor.' });
    } finally {
        client.release();
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
// Obtener datos actuales del cliente
app.get('/api/cliente/perfil/:id', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, nombre, email, telefono, rol, COALESCE(puntos, 0) AS puntos
             FROM usuarios
             WHERE id = $1 AND rol = 'cliente'`,
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        res.json({ usuario: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Editar y guardar datos del cliente
app.put('/api/cliente/perfil/:id', async (req, res) => {
    const { nombre, email, telefono } = req.body;
    try {
        const result = await pool.query(
            `UPDATE usuarios
             SET nombre = $1, email = $2, telefono = $3
             WHERE id = $4 AND rol = 'cliente'
             RETURNING id, nombre, email, telefono, rol, COALESCE(puntos, 0) AS puntos`,
            [String(nombre || '').trim(), String(email || '').trim(), String(telefono || '').trim(), req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Solo los clientes pueden editar este perfil' });
        }
        res.json({ usuario: result.rows[0] });
    } catch (err) {
        if (err && err.code === '23505') {
            return res.status(400).json({ error: 'Ese correo electrónico ya está en uso por otra cuenta' });
        }
        res.status(500).json({ error: err.message });
    }
});
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));

// =====================================================================
// MÓDULO DE MERCADO PAGO
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
// MÓDULO DE PUNTOS Y CANJES
// =====================================================================
app.get('/api/canjes/productos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM productos_canje WHERE activo = TRUE ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/canjes/productos', async (req, res) => {
    const { nombre, imagen_url, puntos_requeridos, precio_adicional, stock } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO productos_canje (nombre, imagen_url, puntos_requeridos, precio_adicional, stock) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [nombre, imagen_url, puntos_requeridos, precio_adicional || 0, stock || 10]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/canjes/productos/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, imagen_url, puntos_requeridos, precio_adicional } = req.body;
    try {
        const result = await pool.query(
            'UPDATE productos_canje SET nombre = $1, imagen_url = $2, puntos_requeridos = $3, precio_adicional = $4 WHERE id = $5 RETURNING *',
            [nombre, imagen_url, puntos_requeridos, precio_adicional, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/canjes/productos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE productos_canje SET activo = FALSE WHERE id = $1', [id]);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/canjes/sumar-puntos', async (req, res) => {
    const { usuario_id, cantidad_prendas } = req.body;
    try {
        const result = await pool.query(
            'UPDATE usuarios SET puntos = COALESCE(puntos, 0) + $1 WHERE id = $2 RETURNING puntos',
            [cantidad_prendas, usuario_id]
        );
        res.json({ puntos_actuales: result.rows[0].puntos });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/canjes/procesar', async (req, res) => {
    const { usuario_id, producto_canje_id, pagar_adicional, monto_adicional, metodo_pago, confirmado_con_comprobante } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const userRes = await client.query('SELECT puntos FROM usuarios WHERE id = $1 FOR UPDATE', [usuario_id]);
        const prodRes = await client.query('SELECT * FROM productos_canje WHERE id = $1 FOR UPDATE', [producto_canje_id]);

        if (userRes.rows.length === 0) throw new Error('Usuario no encontrado.');
        if (prodRes.rows.length === 0) throw new Error('Prenda de canje no encontrada.');

        const puntosUsuario = Number(userRes.rows[0].puntos) || 0;
        const producto = prodRes.rows[0];
        const puntosReq = Number(producto.puntos_requeridos) || 0;

        if (producto.activo === false) {
            throw new Error('Esta prenda ya fue canjeada.');
        }

        if (pagar_adicional && !confirmado_con_comprobante) {
            throw new Error('Debes subir el comprobante antes de descontar la prenda.');
        }

        if (!pagar_adicional && puntosUsuario < puntosReq) {
            throw new Error(`Te faltan puntos (${puntosUsuario}/${puntosReq} pts). Marca "Pagar adicional" para cubrir la diferencia.`);
        }

        const puntosADescontar = pagar_adicional ? Math.min(puntosUsuario, puntosReq) : puntosReq;
        const montoPagado = pagar_adicional ? (parseFloat(monto_adicional) || 0) : 0;
        const nuevosPuntos = Math.max(0, puntosUsuario - puntosADescontar);

        await client.query('UPDATE usuarios SET puntos = $1 WHERE id = $2', [nuevosPuntos, usuario_id]);
        await client.query('UPDATE productos_canje SET stock = GREATEST(0, COALESCE(stock, 1) - 1), activo = FALSE WHERE id = $1', [producto_canje_id]);
        await client.query(
            'INSERT INTO historial_canjes (usuario_id, producto_canje_id, puntos_usados, monto_adicional_pagado, metodo_pago) VALUES ($1, $2, $3, $4, $5)',
            [usuario_id, productoCanjeId, ptsADescontar, montoPagado, pagar_adicional ? (metodo_pago || 'Yape / Plin Adicional') : 'Solo Puntos']
        );

        await client.query('COMMIT');
        res.json({
            success: true,
            nuevos_puntos: nuevosPuntos,
            puntos_usados: puntosADescontar
        });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.get('/api/canjes/clientes-puntos', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, nombre, email, telefono, COALESCE(puntos, 0) AS puntos FROM usuarios ORDER BY puntos DESC, id ASC'
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});