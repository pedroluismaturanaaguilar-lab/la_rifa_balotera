function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  // Si es una llamada de API, responder JSON; si no, redirigir al login
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(401).json({ ok: false, error: 'No autenticado.' });
  }
  return res.redirect('/admin/login');
}

module.exports = { requireAuth };
