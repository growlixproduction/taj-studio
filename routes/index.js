const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/publicController');
const invoiceCtrl = require('../controllers/invoiceController');

router.get('/', ctrl.home);
router.get('/videos', ctrl.videosLanding);
router.get('/photos', ctrl.photosLanding);
router.get('/videos/:category', ctrl.videoCategory);
router.get('/photos/:category', ctrl.photoCategory);
router.get('/pricing', ctrl.pricingPage);
router.get('/contact', ctrl.contactPage);
router.post('/contact', ctrl.contactSubmit);
router.get('/quote/:quoteNumber', invoiceCtrl.viewPublicQuote);

module.exports = router;
