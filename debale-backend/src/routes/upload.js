const express = require('express');
const multer = require('multer');
const router = express.Router();
const supabase = require('../services/supabase');
const { auth } = require('../middleware/auth');
const { security } = require('../services/logger');

const ALLOWED_BUCKETS = ['photos', 'agreements', 'id-photos', 'debale-uploads'];

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg','image/png','image/webp','application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, WebP and PDF files are allowed'));
  }
});

// POST /api/upload/file
router.post('/file', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const bucket = req.body.bucket || 'photos';

    // Restrict bucket names
    if (!ALLOWED_BUCKETS.includes(bucket)) {
      security.uploadSuspicious(req.user.id, bucket, req.ip);
      return res.status(400).json({ error: 'Invalid upload bucket' });
    }

    const ext = req.file.originalname.split('.').pop();
    const filename = `${req.user.id}/${Date.now()}.${ext}`;

    // Check if bucket exists — do NOT auto-create
    const { error: bucketErr } = await supabase.storage.getBucket(bucket);
    if (bucketErr) {
      return res.status(400).json({ error: 'Upload bucket not available' });
    }

    const { error } = await supabase.storage.from(bucket).upload(filename, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filename);

    res.json({ url: publicUrl, file_url: publicUrl, filename, bucket });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Handle multer errors
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = router;
