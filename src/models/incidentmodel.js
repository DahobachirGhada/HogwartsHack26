const pool = require('../config/db');

const IncidentModel = {

  async create({ user_id, type, description, quartier, lat, lng, since, image_url }) {
    const { rows } = await pool.query(
      `INSERT INTO incidents (user_id, type, description, quartier, lat, lng, since, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [user_id, type, description, quartier, lat, lng, since, image_url || null]
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
        COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE) AS today_total,
        type AS most_frequent_type
      FROM incidents
      GROUP BY type
      ORDER BY COUNT(*) DESC
      LIMIT 1
    `);
    return rows[0];
  },

  async findAll_forN8N() {
    const { rows } = await pool.query(
      `SELECT id, type, description, quartier, lat, lng, since, created_at FROM incidents ORDER BY created_at DESC`
    );
    return rows;
  }
};

module.exports = IncidentModel;
