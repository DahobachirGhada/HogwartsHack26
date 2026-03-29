const pool = require('../config/db');

const AnalyticsController = {

  async getAnalytics(req, res) {
    try {
      const { period = 'month' } = req.query;

      let interval;
      if (period === 'week')  interval = '7 days';
      else if (period === 'year') interval = '1 year';
      else interval = '30 days';

      // 1. Signalements par jour
      const { rows: byDay } = await pool.query(`
        SELECT 
          DATE(created_at) AS date,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'resolved') AS resolved
        FROM incidents
        WHERE created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `);

      const { rows: byCategory } = await pool.query(`
        SELECT 
          type AS category,
          COUNT(*) AS total,
          ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 0) AS percentage
        FROM incidents
        WHERE created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY type
        ORDER BY total DESC
      `);


      const { rows: byQuartier } = await pool.query(`
        SELECT 
          quartier,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE danger_level = 'High') AS high_count
        FROM incidents
        WHERE created_at >= NOW() - INTERVAL '${interval}'
          AND quartier IS NOT NULL
        GROUP BY quartier
        ORDER BY total DESC
        LIMIT 6
      `);
      const { rows: stats } = await pool.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'resolved') AS resolved,
          COUNT(*) FILTER (WHERE status = 'open') AS open,
          COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
          COUNT(*) FILTER (WHERE danger_level = 'High') AS critical,
          ROUND(
            COUNT(*) FILTER (WHERE status = 'resolved') * 100.0 / NULLIF(COUNT(*), 0), 0
          ) AS resolution_rate
        FROM incidents
        WHERE created_at >= NOW() - INTERVAL '${interval}'
      `);

      res.status(200).json({
        period,
        by_day: byDay,
        by_category: byCategory,
        by_quartier: byQuartier,
        stats: stats[0]
      });

    } catch (err) {
      console.error('analytics error:', err);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }
};

module.exports = AnalyticsController;
