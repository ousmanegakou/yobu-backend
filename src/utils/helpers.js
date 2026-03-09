const sanitizeUser = (user) => { if (!user) return null; const { password_hash, ...safe } = user; return safe; };
const getPagination = (query, defaultLimit = 20) => {
  const limit = Math.min(parseInt(query.limit) || defaultLimit, 100);
  const page  = Math.max(parseInt(query.page) || 1, 1);
  return { limit, offset: (page - 1) * limit, page };
};
const formatPrice = (val) => parseFloat(parseFloat(val || 0).toFixed(2));
const getMonthRange = (year, month) => {
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 0);
  return { period_start: start.toISOString().split('T')[0], period_end: end.toISOString().split('T')[0] };
};
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
module.exports = { sanitizeUser, getPagination, formatPrice, getMonthRange, asyncHandler };