const asyncHandler = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);
const getPagination = q => ({ limit: Math.min(parseInt(q.limit)||20,100), offset: parseInt(q.offset)||0 });
const sanitizeUser = u => { if (!u) return null; const {password_hash,...s}=u; return s; };
const getMonthRange = (y,m) => { const p=n=>String(n).padStart(2,'0'); return { period_start:`${y}-${p(m)}-01`, period_end:`${y}-${p(m)}-${new Date(y,m,0).getDate()}` }; };
module.exports = { asyncHandler, getPagination, sanitizeUser, getMonthRange };
