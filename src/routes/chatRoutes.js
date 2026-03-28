const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/chatController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Public — get all quartiers for dropdown
router.get('/quartiers', ChatController.getQuartiers);

// Citizen — start chat session (pick quartier)
router.post('/chat/start', protect, restrictTo('citoyen'), ChatController.startSession);

// Citizen — send message to Gemini
router.post('/chat', protect, restrictTo('citoyen'), ChatController.chat);


router.get('/incidents', protect, restrictTo('mairie'), ChatController.getIncidents);
router.get('/stats', protect, restrictTo('mairie'), ChatController.getStats);


router.get('/zones', ChatController.getZones);

module.exports = router;
