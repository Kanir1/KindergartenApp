const express = require('express');
const router = express.Router();
const { v2: cloudinary } = require('cloudinary');
const upload = require('../middleware/upload');
const { requireAuth, requireRole } = require('../middleware/auth');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// POST /api/uploads/photos  (admin only)
// FormData: photos (one or many), optional child for folder organization
router.post('/photos', requireAuth, requireRole('admin'), upload.array('photos', 10), async (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json({ message: 'No files uploaded' });
    const childId = req.body.child || 'unassigned';

    // helper: upload a single buffer to Cloudinary
    const uploadBuffer = (file) =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: `kindergarten/${childId}`, resource_type: 'image' },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(file.buffer);
      });

    const results = await Promise.all(req.files.map(uploadBuffer));
    // Return the URLs (secure_url is https)
    res.status(201).json({
      count: results.length,
      photos: results.map(r => ({ url: r.secure_url, publicId: r.public_id }))
    });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Upload failed' });
  }
});

module.exports = router;
