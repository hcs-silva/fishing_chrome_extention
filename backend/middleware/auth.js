const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to verify JWT token and attach user to request
 */
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ erro: 'Autenticação necessária' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fishing_secret_key_change_in_production');
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ erro: 'Usuário não encontrado' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ erro: 'Token inválido' });
  }
};

module.exports = auth;
