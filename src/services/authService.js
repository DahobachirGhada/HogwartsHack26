const jwt = require('jsonwebtoken');
const UserModel = require('../models/usermodel.js');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

const signRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN });

const AuthService = {

async register({ name, email, password, phone, wilaya }) {
  const existing = await UserModel.findByEmail(email);
  if (existing) throw { status: 409, message: 'Email already in use' };

  const user = await UserModel.create({ name, email, password, phone, wilaya });

  const token = signToken(user.id);
  const refreshToken = signRefreshToken(user.id);

  return {
    token,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: 'citoyen' }
  };
},

  async login({ email, password }) {
    const user = await UserModel.findByEmail(email);
    if (!user) throw { status: 401, message: 'Invalid credentials' };

    const valid = await UserModel.comparePassword(password, user.password);
    if (!valid) throw { status: 401, message: 'Invalid credentials' };

    const token = signToken(user.id);
    const refreshToken = signRefreshToken(user.id);

    return {
      token,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    };
  },

  async me(id) {
    const user = await UserModel.findById(id);
    if (!user) throw { status: 404, message: 'User not found' };
    return user;
  },

  async refreshToken(refreshToken) {
    if (!refreshToken) throw { status: 400, message: 'Refresh token required' };
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      return { token: signToken(decoded.id) };
    } catch {
      throw { status: 401, message: 'Invalid or expired refresh token' };
    }
  }
};

module.exports = AuthService;