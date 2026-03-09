const errorHandler = (err, req, res, next) => {
  console.error('[ERROR]', req.method, req.path, err.message);
  if (err.code === '23505') return res.status(409).json({ error: 'Already exists', detail: err.detail });
  if (err.code === '23503') return res.status(400).json({ error: 'Reference not found', detail: err.detail });
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
};
module.exports = { errorHandler };