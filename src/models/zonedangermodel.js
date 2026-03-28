const pool = require('../config/db');

const ZoneDangerModel = {

  async findAll() {
    const { rows } = await pool.query(
      `SELECT * FROM zones_danger ORDER BY updated_at DESC`
    );
    return rows;
  },

  async upsert({ nom, lat, lng, score, recommandation }) {
    const { rows } = await pool.query(
      `INSERT INTO zones_danger (nom, lat, lng, score, recommandation, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (nom) DO UPDATE
       SET lat = $2, lng = $3, score = $4, recommandation = $5, updated_at = NOW()
       RETURNING *`,
      [nom, lat, lng, score, recommandation]
    );
    return rows[0];
  }
};

module.exports = ZoneDangerModel;
