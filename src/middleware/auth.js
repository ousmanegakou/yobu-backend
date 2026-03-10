const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const authenticate = (roles=[]) => (req,res,next) => {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({error:'No token'});
  try { const p = jwt.verify(h.slice(7), JWT_SECRET); if (roles.length && !roles.includes(p.role)) return res.status(403).json({error:'Forbidden'}); req.user=p; next(); }
  catch { res.status(401).json({error:'Invalid token'}); }
};
module.exports = { authenticate };
