const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Controllers
const csvController = require('../controllers/csvController');
const imageController = require('../controllers/imageController');
const phoneController = require('../controllers/phoneController');
const distributeController = require('../controllers/distributeController');

// Multer setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'csv_files') {
            cb(null, 'public/assets/uploads/csv/');
        } else if (file.fieldname === 'image') {
            cb(null, 'public/assets/uploads/screenshots/');
        }
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// Routes
router.post('/upload-csv', upload.array('csv_files'), csvController.uploadCSV);
router.post('/analyze-image', upload.single('image'), imageController.analyzeImage);
router.get('/get-phones', phoneController.getPhones);
router.post('/distribute', distributeController.distribute);
router.post('/save-batch', csvController.saveBatch);

module.exports = router;