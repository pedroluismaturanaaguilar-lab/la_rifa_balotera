const userModel = require('../models/userModel');

async function login(req, res) {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ ok: false, error: 'Usuario y contraseña son obligatorios.' });
    }

    const user = await userModel.findByUsername(username);
    const valid = await userModel.verifyPassword(user, password);

    if (!user || !valid) {
      return res.status(401).json({ ok: false, error: 'Usuario o contraseña incorrectos.' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;

    res.json({ ok: true, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error interno al iniciar sesión.' });
  }
}

function logout(req, res) {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
}

function me(req, res) {
  if (req.session && req.session.userId) {
    return res.json({ ok: true, user: { id: req.session.userId, username: req.session.username, role: req.session.role } });
  }
  res.status(401).json({ ok: false });
}

module.exports = { login, logout, me };
