// routes/_childAccessProxy.js
const { ensureCanAccessChild } = require('../middleware/auth');
module.exports = (req, res, next) => ensureCanAccessChild(req, res, next);
