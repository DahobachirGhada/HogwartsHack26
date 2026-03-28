const pool = require('../config/db');

const QuartierModel = {

  async findAll() {
    const { rows } = await pool.query(
      `SELECT id, nom, lat, lng FROM quartiers ORDER BY nom ASC`
    );
    return rows;
  },
  async findById(id) {
    const { rows } = await pool.query(
      `SELECT * FROM quartiers WHERE id = $1`,
      [id]
    );
    return rows[0];
  },
  async findByName(nom) {
    const { rows } = await pool.query(
      `SELECT * FROM quartiers WHERE nom ILIKE $1 LIMIT 1`,
      [nom]
    );
    return rows[0];
  }
};

module.exports = QuartierModel;
