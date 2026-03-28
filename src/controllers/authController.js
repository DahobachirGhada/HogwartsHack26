const AuthService = require('../services/authService.js');

const AuthController = {

  async register(req, res) {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password)
        return res.status(400).json({ message: 'All fields are required' });

      const data = await AuthService.register({ name, email, password });
      res.status(201).json({ message: 'Account created successfully', ...data });

    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || 'Server error' });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password)
        return res.status(400).json({ message: 'Email and password required' });

      const data = await AuthService.login({ email, password });
      res.status(200).json({ message: 'Login successful', ...data });

    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || 'Server error' });
    }
  },

  async me(req, res) {
    try {
      const user = await AuthService.me(req.user.id);
      res.status(200).json({ user });
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || 'Server error' });
    }
  },

  async refreshToken(req, res) {
    try {
      const data = await AuthService.refreshToken(req.body.refreshToken);
      res.status(200).json(data);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || 'Server error' });
    }
  }
};

module.exports = AuthController;