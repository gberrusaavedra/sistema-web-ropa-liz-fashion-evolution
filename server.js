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

// Crear tablas automáticamente si aún no existen en Neon
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
    `);

    // Crear cuenta Admin por defecto si no existe
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

// Obtener fecha de fin de oferta flash (público para todos los visitantes)
app.get('/api/oferta-tiempo', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT valor FROM configuracion_tienda WHERE clave = 'offer_end_time'"
        );
        if (result.rows.length > 0) {
            res.json({ offer_end_time: Number(result.rows[0].valor) });
        } else {
            res.json({ offer_end_time: null });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Guardar o actualizar fecha de fin de oferta flash (solo Admin)
app.put('/api/oferta-tiempo', soloAdmin, async (req, res) => {
    const { offer_end_time } = req.body;
    if (!offer_end_time) {
        return res.status(400).json({ error: 'Fecha y hora inválidas' });
    }
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));