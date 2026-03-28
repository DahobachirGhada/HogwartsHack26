const authValidator = {

  register(req, res, next) {
    const { name, email, password } = req.body;
    const errors = [];

    if (!name || name.trim().length < 2)
      errors.push('Name must be at least 2 characters');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.push('Valid email is required');

    if (!password || password.length < 8)
      errors.push('Password must be at least 8 characters');

    if (!/[A-Z]/.test(password))
      errors.push('Password must contain at least one uppercase letter');

    if (!/[0-9]/.test(password))
      errors.push('Password must contain at least one number');

    if (errors.length > 0)
      return res.status(400).json({ message: 'Validation failed', errors });

    next();
  },

  login(req, res, next) {
    const { email, password } = req.body;
    const errors = [];

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.push('Valid email is required');

    if (!password)
      errors.push('Password is required');

    if (errors.length > 0)
      return res.status(400).json({ message: 'Validation failed', errors });

    next();
  },

  refreshToken(req, res, next) {
    const { refreshToken } = req.body;

    if (!refreshToken)
      return res.status(400).json({ message: 'Refresh token is required' });

    next();
  }
};

module.exports = authValidator;