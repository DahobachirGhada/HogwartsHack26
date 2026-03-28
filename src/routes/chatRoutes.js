const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/chatController');
const IngestController = require('../controllers/ingestController');
const { protect, restrictTo } = require('../middleware/authMiddleware');


router.get('/quartiers', ChatController.getQuartiers);

router.post('/chat/start', protect, restrictTo('citoyen'), ChatController.startSession);

router.post('/chat', protect, restrictTo('citoyen'), ChatController.chat);


router.get('/incidents', protect, restrictTo('mairie'), ChatController.getIncidents);
router.get('/stats', protect, restrictTo('mairie'), ChatController.getStats);
router.get('/home', protect, restrictTo('citoyen'), ChatController.getHomeStats);
router.get('/zones', ChatController.getZones);


router.post('/ingest', IngestController.ingest);
module.exports = router;
