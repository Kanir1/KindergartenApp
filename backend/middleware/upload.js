const multer = require('multer');

const ALLOWED = ['image/jpeg','image/png','image/webp','image/gif'];
const MAX_MB = 5;

const storage = multer.memoryStorage();
const fileFilter = (_req, file, cb) => {
  if (!ALLOWED.includes(file.mimetype)) return cb(new Error('Invalid file type'));
  cb(null, true);
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_MB * 1024 * 1024 } // 5MB
});
