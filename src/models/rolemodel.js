import pool from '../config/db.js';

const Role = {
  findByName: async (role_name) => {
    const [rows] = await pool.query(
      'SELECT * FROM roles WHERE role_name = ?', [role_name]
    );
    return rows[0];
  },

  assignToUser: async (user_id, role_id) => {
    const [result] = await pool.query(
      'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [user_id, role_id]
    );
    return result.insertId;
  },

  getUserRoles: async (user_id) => {
    const [rows] = await pool.query(
      `SELECT r.role_name FROM roles r
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = ?`, [user_id]
    );
    return rows;
  },
};

export default Role;