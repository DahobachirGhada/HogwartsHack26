const pool = require('../config/db');

const ChatSessionModel = {

  async findByUserId(user_id) {
    const { rows } = await pool.query(
      `SELECT * FROM chat_sessions WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1`,
      [user_id]
    );
    return rows[0];
  },

  async create({ user_id, quartier, lat, lng }) {
    const { rows } = await pool.query(
      `INSERT INTO chat_sessions (user_id, quartier, lat, lng, step, collected)
       VALUES ($1, $2, $3, $4, 'awaiting_type', '{}')
       RETURNING *`,
      [user_id, quartier, lat, lng]
    );
    return rows[0];
  },

  async update(id, { step, collected }) {
    const { rows } = await pool.query(
      `UPDATE chat_sessions SET step = $1, collected = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [step, JSON.stringify(collected), id]
    );
    return rows[0];
  },

  async delete(id) {
    await pool.query(`DELETE FROM chat_sessions WHERE id = $1`, [id]);
  }
};

module.exports = ChatSessionModel;
