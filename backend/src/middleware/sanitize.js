const xss = require('xss');

function sanitizeString(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return xss(trimmed, { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: ['script', 'style'] });
}

function deepSanitize(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepSanitize);
  const out = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val && typeof val === 'object') {
      out[key] = deepSanitize(val);
    } else {
      out[key] = sanitizeString(val);
    }
  }
  return out;
}

function sanitizeRequest(req, res, next) {
  if (req.body) req.body = deepSanitize(req.body);
  if (req.query) req.query = deepSanitize(req.query);
  if (req.params) req.params = deepSanitize(req.params);
  next();
}

module.exports = { sanitizeRequest };


