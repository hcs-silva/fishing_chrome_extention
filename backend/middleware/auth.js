const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/config');

/**
 * Middleware to verify JWT token and attach user to request
 */
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ erro: 'Autenticação necessária' });
    }

    if (!JWT_SECRET) {
      return res.status(500).json({ erro: 'Servidor não configurado corretamente' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ erro: 'Utilizador não encontrado' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ erro: 'Token inválido' });
  }
};

module.exports = auth;
