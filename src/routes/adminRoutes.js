const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/analyticsController');
const AlertsController = require('../controllers/alertsController');
const prioritiesController = require('../controllers/prioritiesController');
const getLatestThree = require('../controllers/aitableController');
const { protect, restrictTo } = require('../middleware/authMiddleware');


router.get('/analytics', AnalyticsController.getAnalytics);


router.get('/alerts', AlertsController.getAlerts);
router.get('/alerts/history', AlertsController.getAlertHistory);
router.post('/priorities', prioritiesController.getBriefing);
router.get('/aitable', getLatestThree);

router.put('/priorities/:id/resolve', prioritiesController.resolveIncident);

module.exports = router;
