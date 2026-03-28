const pool = require('../config/db');

const IncidentModel = {

  async create({ user_id, type, description, quartier, lat, lng, since, image_url, danger_level }) {
    const { rows } = await pool.query(
      `INSERT INTO incidents (user_id, type, description, quartier, lat, lng, since, image_url, danger_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [user_id, type, description, quartier, lat, lng, since, image_url || null, danger_level || null]
    );
    return rows[0];
  },

  async findAll({ quartier, type, date } = {}) {
    let query = `SELECT i.*, u.name AS user_name FROM incidents i
                 LEFT JOIN users u ON i.user_id = u.id WHERE 1=1`;
    const params = [];
    let idx = 1;

    if (quartier) { query += ` AND i.quartier = $${idx++}`; params.push(quartier); }
    if (type)     { query += ` AND i.type = $${idx++}`;     params.push(type); }
    if (date)     { query += ` AND i.created_at::date = $${idx++}`; params.push(date); }

    query += ' ORDER BY i.created_at DESC';
    const { rows } = await pool.query(query, params);
    return rows;
  },

  async getStats() {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'open')                          AS open_total,
        COUNT(*) FILTER (WHERE status = 'in_progress')                   AS in_progress_total,
        COUNT(*) FILTER (WHERE status = 'resolved' AND created_at::date = CURRENT_DATE) AS resolved_today,
        COUNT(*) FILTER (WHERE status = 'resolved' AND created_at::date = CURRENT_DATE - 1) AS resolved_yesterday,
        COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)          AS new_today,
        COUNT(*) FILTER (WHERE danger_level = 'High' AND status != 'resolved') AS critical_alerts,
        COUNT(*)                                                          AS total,
        ROUND(
          COUNT(*) FILTER (WHERE status = 'in_progress') * 100.0 / NULLIF(COUNT(*), 0), 0
        ) AS in_progress_percent
      FROM incidents
    `);

    const s = rows[0];
    return {
      signalements_ouverts:     parseInt(s.open_total),
      nouveaux_aujourdhui:      parseInt(s.new_today),
      en_cours_de_traitement:   parseInt(s.in_progress_total),
      en_cours_percent:         parseInt(s.in_progress_percent || 0),
      resolus_aujourdhui:       parseInt(s.resolved_today),
      resolus_hier:             parseInt(s.resolved_yesterday),
      delta_resolus:            parseInt(s.resolved_today) - parseInt(s.resolved_yesterday),
      alertes_critiques:        parseInt(s.critical_alerts),
      total:                    parseInt(s.total)
    };
  },

  async findAll_forN8N() {
    const { rows } = await pool.query(
      `SELECT id, type, description, quartier, lat, lng, since, created_at FROM incidents ORDER BY created_at DESC`
    );
    return rows;
  },

  async getTotalIncidents() {
    const { rows } = await pool.query(`SELECT COUNT(*) AS total FROM incidents`);
    return rows[0];
  },

  async getWeeklyReports() {
    const { rows } = await pool.query(`
      SELECT COUNT(*) AS total
      FROM incidents
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `);
    return rows[0];
  }

};

module.exports = IncidentModel;