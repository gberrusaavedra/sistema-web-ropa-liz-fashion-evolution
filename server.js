const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const SECRET_KEY = process.env.JWT_SECRET || 'Teddy12@12';

async function initDB() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            email VARCHAR(150) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
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
            stock_by_size JSONB NOT NULL,
            porcentaje_vendido INTEGER DEFAULT 35,
            material TEXT,
            descripcion TEXT,
            imagen_url TEXT NOT NULL,
            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE productos
        ADD COLUMN IF NOT EXISTS porcentaje_vendido INTEGER DEFAULT 35;

        CREATE TABLE IF NOT EXISTS configuracion_tienda (
            clave VARCHAR(50) PRIMARY KEY,
            valor TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS modelos_fabricacion (
            id SERIAL PRIMARY KEY,
            titulo VARCHAR(150) NOT NULL,
            categoria VARCHAR(80) NOT NULL,
            precio NUMERIC(10, 2) NOT NULL,
            colores JSONB NOT NULL,
            tallas JSONB NOT NULL,
            imagen_url TEXT NOT NULL,
            fecha_limite BIGINT NOT NULL,
            descripcion TEXT,
            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS pedidos_fabricacion (
            id SERIAL PRIMARY KEY,
            codigo_pedido VARCHAR(30) NOT NULL,
            cliente_nombre VARCHAR(120) NOT NULL,
            cliente_telefono VARCHAR(30) NOT NULL,
            notas TEXT,
            items JSONB NOT NULL,
            total NUMERIC(10, 2) NOT NULL,
            estado VARCHAR(30) DEFAULT 'Pendiente',
            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await pool.query(`
        INSERT INTO usuarios (nombre, email, password, palabra_secreta, rol)
        VALUES ('Liz Admin', 'admin@rematestyle.com', 'admin1234', 'piura2026', 'admin')
        ON CONFLICT (email) DO NOTHING;
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
    const { nombre, email, password, palabra_secreta } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO usuarios (nombre, email, password, palabra_secreta, rol) VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre, email, rol',
            [nombre, email, password, palabra_secreta, 'cliente']
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
        res.json({ token, usuario: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === CATÁLOGO REMATE ===
app.get('/api/productos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM productos ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/productos', soloAdmin, async (req, res) => {
    const { titulo, categoria, etiqueta, precio_remate, precio_original, stock_by_size, porcentaje_vendido, material, descripcion, imagen_url } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO productos (titulo, categoria, etiqueta, precio_remate, precio_original, stock_by_size, porcentaje_vendido, material, descripcion, imagen_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [titulo, categoria, etiqueta, precio_remate, precio_original, JSON.stringify(stock_by_size), porcentaje_vendido ?? 35, material, descripcion, imagen_url]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/productos/:id', soloAdmin, async (req, res) => {
    const { titulo, categoria, etiqueta, precio_remate, precio_original, stock_by_size, porcentaje_vendido, material, descripcion, imagen_url } = req.body;
    try {
        const result = await pool.query(
            `UPDATE productos SET titulo=$1, categoria=$2, etiqueta=$3, precio_remate=$4, precio_original=$5,
             stock_by_size=$6, porcentaje_vendido=$7, material=$8, descripcion=$9, imagen_url=$10 WHERE id=$11 RETURNING *`,
            [titulo, categoria, etiqueta, precio_remate, precio_original, JSON.stringify(stock_by_size), porcentaje_vendido ?? 35, material, descripcion, imagen_url, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/productos/:id', soloAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM productos WHERE id = $1', [req.params.id]);
        res.json({ mensaje: 'Eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === RELOJ OFERTA FLASH ===
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
            `INSERT INTO configuracion_tienda (clave, valor)
             VALUES ('offer_end_time', $1)
             ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor`,
            [String(offer_end_time)]
        );
        res.json({ mensaje: 'Horario guardado en Neon', offer_end_time: Number(offer_end_time) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === MODELOS PARA FABRICACIÓN (ADMIN PUBLICA / CLIENTE PIDE) ===
app.get('/api/fabricacion/modelos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM modelos_fabricacion ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/fabricacion/modelos', soloAdmin, async (req, res) => {
    const { titulo, categoria, precio, colores, tallas, imagen_url, fecha_limite, descripcion } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO modelos_fabricacion (titulo, categoria, precio, colores, tallas, imagen_url, fecha_limite, descripcion)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [titulo, categoria, precio, JSON.stringify(colores), JSON.stringify(tallas), imagen_url, fecha_limite, descripcion || '']
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/fabricacion/modelos/:id', soloAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM modelos_fabricacion WHERE id = $1', [req.params.id]);
        res.json({ mensaje: 'Modelo eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === PEDIDOS DE FABRICACIÓN INGRESADOS POR CLIENTES ===
app.get('/api/fabricacion/pedidos', soloAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM pedidos_fabricacion ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/fabricacion/pedidos', async (req, res) => {
    const { cliente_nombre, cliente_telefono, notas, items, total } = req.body;
    if (!cliente_nombre || !cliente_telefono || !items || items.length === 0) {
        return res.status(400).json({ error: 'Completa tus datos y agrega al menos una prenda al pedido.' });
    }
    const codigo = 'FAB-' + Math.floor(100000 + Math.random() * 900000);
    try {
        const result = await pool.query(
            `INSERT INTO pedidos_fabricacion (codigo_pedido, cliente_nombre, cliente_telefono, notas, items, total)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [codigo, cliente_nombre, cliente_telefono, notas || '', JSON.stringify(items), total]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/fabricacion/pedidos/:id/estado', soloAdmin, async (req, res) => {
    const { estado } = req.body;
    try {
        const result = await pool.query(
            'UPDATE pedidos_fabricacion SET estado = $1 WHERE id = $2 RETURNING *',
            [estado, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));