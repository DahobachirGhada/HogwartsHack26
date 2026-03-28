import pool from '../config/db.js';

const RefreshToken = {
  create: async (user_id, token, expires_at) => {
    const [result] = await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user_id, token, expires_at]
    );
    return result.insertId;
  },

  findByToken: async (token) => {
    const [rows] = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = ?', [token]
    );
    return rows[0];
  },

  deleteByToken: async (token) => {
    const [result] = await pool.query(
      'DELETE FROM refresh_tokens WHERE token = ?', [token]
    );
    return result.affectedRows;
  },

  deleteByUserId: async (user_id) => {
    const [result] = await pool.query(
      'DELETE FROM refresh_tokens WHERE user_id = ?', [user_id]
    );
    return result.affectedRows;
  },
};

export default RefreshToken;