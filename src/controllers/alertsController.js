const pool = require('../config/db');

const AlertsController = {

  async getAlerts(req, res) {
    try {
      const { rows } = await pool.query(`
        SELECT 
          i.*,
          u.name AS user_name,
          ROUND(EXTRACT(EPOCH FROM (NOW() - i.created_at)) / 60) AS minutes_ago
        FROM incidents i
        LEFT JOIN users u ON i.user_id = u.id
        WHERE i.danger_level = 'High'
          AND i.status != 'resolved'
        ORDER BY i.created_at DESC
      `);

      const { rows: countRow } = await pool.query(`
        SELECT COUNT(*) AS total FROM incidents
        WHERE danger_level = 'High' AND status != 'resolved'
      `);

      res.status(200).json({
        active_count: parseInt(countRow[0].total),
        alerts: rows
      });
    } catch (err) {
      console.error('getAlerts error:', err);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  },

  async getAlertHistory(req, res) {
    try {
      const { rows } = await pool.query(`
        SELECT 
          i.id, i.type, i.quartier, i.danger_level, i.status,
          i.created_at,
          ROUND(EXTRACT(EPOCH FROM (NOW() - i.created_at)) / 3600) AS hours_ago,
          u.name AS user_name
        FROM incidents i
        LEFT JOIN users u ON i.user_id = u.id
        WHERE i.status = 'resolved'
        ORDER BY i.created_at DESC
        LIMIT 20
      `);
      res.status(200).json({ history: rows });
    } catch (err) {
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }
};

module.exports = AlertsController;
