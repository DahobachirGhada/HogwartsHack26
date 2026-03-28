const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const UserModel = {
  async create({ name, email, password, role_id = 1 }) {
    const hashed = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password, role_id)
       VALUES ($1, $2, $3, $4) RETURNING id, name, email, role_id, created_at`,
      [name, email, hashed, role_id]
    );
    return rows[0];
  },

  async findByEmail(email) {
    const { rows } = await pool.query(
      `SELECT u.*, r.name AS role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.email = $1`,
      [email]
    );
    return rows[0];
  },

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.is_verified, u.created_at, r.name AS role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [id]
    );
    return rows[0];
  },

  async comparePassword(plain, hashed) {
    return bcrypt.compare(plain, hashed);
  }
};

module.exports = UserModel;