const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/analyticsController');
const AlertsController = require('../controllers/alertsController');
//const PrioritiesController = require('../controllers/prioritiesController');
const { protect, restrictTo } = require('../middleware/authMiddleware');


router.get('/analytics', AnalyticsController.getAnalytics);


router.get('/alerts', AlertsController.getAlerts);
router.get('/alerts/history', AlertsController.getAlertHistory);



//router.put('/priorities/:quartier/resolve', PrioritiesController.resolveZone);

module.exports = router;
