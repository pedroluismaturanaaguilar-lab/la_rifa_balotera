require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const http = require('http');
const { Server } = require('socket.io');

const { getDb, DB_PATH } = require('./database/db');
const userModel = require('./models/userModel');
const authRoutes = require('./routes/auth');
const settingsRoutes = require('./routes/settings');
const drawRoutes = require('./routes/draw');
const participantsRoutes = require('./routes/participants');
const ticketsRoutes = require('./routes/tickets');
const { requireAuth } = require('./config/authMiddleware');

const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'cambia-esta-clave-en-produccion';
const SESSION_DIR = process.env.SESSION_DIR || path.join(__dirname, 'database');
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

fs.mkdirSync(SESSION_DIR, { recursive: true });
fs.mkdirSync(path.dirname(process.env.DB_PATH || path.join(__dirname, 'database', 'rifa.db')), { recursive: true });

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set('io', io);

// Render (y la mayoría de plataformas de hosting) atienden HTTPS en un
// proxy delante de la app; sin esto, Express no reconoce la conexión como
// segura y las cookies "secure" no se guardarían nunca.
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: SESSION_DIR }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 8, // 8 horas
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PRODUCTION // en Render (HTTPS) exige cookie segura; en local (http) no
  }
}));

app.use(express.static(path.join(__dirname, 'public')));

// ---------- Rutas de API ----------
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/draw', drawRoutes);
app.use('/api/participants', participantsRoutes);
app.use('/api/tickets', ticketsRoutes);

// ---------- Vistas ----------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'welcome.html'));
});

app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-login.html'));
});

app.get('/admin', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html'));
});

// Pantalla pública del sorteo: la ven los participantes / el televisor.
// A propósito NO requiere login — es la vitrina del espectáculo, no el
// panel de control. Es instalable como app aparte (manifest-pantalla.json).
app.get('/pantalla', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'pantalla.html'));
});

// ---------- Socket.IO (listo para fases 4 y 6: sorteo en vivo / pantalla publica) ----------
io.on('connection', (socket) => {
  socket.on('join_public_screen', () => {
    socket.join('public_screen');
  });
});

// ---------- Arranque ----------
async function start() {
  await getDb(); // crea el archivo y aplica el esquema si no existe
  console.log(`Base de datos SQLite lista en: ${DB_PATH}`);

  const adminCount = await userModel.countUsers();
  if (adminCount === 0) {
    const defaultUser = process.env.ADMIN_USER || 'ADMIN';
    const defaultPass = process.env.ADMIN_PASSWORD || 'ADMIN123';
    await userModel.createUser(defaultUser, defaultPass, 'admin');
    console.log('======================================================');
    console.log(' Se creó un usuario administrador por defecto:');
    console.log(`   Usuario:    ${defaultUser}`);
    console.log(`   Contraseña: ${defaultPass}`);
    console.log(' Cámbiala apenas inicies sesión (Configuración > Usuarios).');
    console.log('======================================================');
  }

  server.listen(PORT, () => {
    console.log(`La Rifa Ganadora corriendo en http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Error al iniciar el servidor:', err);
  process.exit(1);
});
