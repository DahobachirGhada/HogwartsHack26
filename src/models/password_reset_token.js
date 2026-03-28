import pool from '../config/db.js';

const PasswordResetToken = {
  create: async (user_id, token, expires_at) => {
    const [result] = await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user_id, token, expires_at]
    );
    return result.insertId;
  },

  findByToken: async (token) => {
    const [rows] = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND used = FALSE AND expires_at > NOW()',
      [token]
    );
    return rows[0];
  },

  markAsUsed: async (token) => {
    const [result] = await pool.query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE token = ?', [token]
    );
    return result.affectedRows;
  },

  deleteByUserId: async (user_id) => {
    const [result] = await pool.query(
      'DELETE FROM password_reset_tokens WHERE user_id = ?', [user_id]
    );
    return result.affectedRows;
  },

  markAsVerified: async (token) => {
  const [result] = await pool.query(
    'UPDATE password_reset_tokens SET is_verified = TRUE WHERE token = ?', [token]
  );
  return result.affectedRows;
},

findVerifiedById: async (user_id) => {
  const [rows] = await pool.query(
    `SELECT * FROM password_reset_tokens 
     WHERE user_id = ? AND is_verified = TRUE 
     AND expires_at > NOW() AND used = FALSE`,
    [user_id]
  );
  return rows[0];
},
};

export default PasswordResetToken;