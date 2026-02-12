const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/config');
const { authLimiter, apiLimiter } = require('../middleware/rateLimiter');

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', authLimiter, [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Password deve ter no mínimo 6 caracteres')
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ erros: errors.array() });
    }

    const { email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ erro: 'Email já registrado' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
      plano: 'free',
      planoStatus: 'active'
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      mensagem: 'Usuário registrado com sucesso',
      user: {
        id: user._id,
        email: user.email,
        plano: user.plano
      },
      token
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ erro: 'Erro ao registrar usuário' });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', authLimiter, [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').exists().withMessage('Password é obrigatório')
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ erros: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ erro: 'Email ou password incorretos' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ erro: 'Email ou password incorretos' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      mensagem: 'Login bem-sucedido',
      user: {
        id: user._id,
        email: user.email,
        plano: user.plano,
        planoStatus: user.planoStatus,
        planoExpiraEm: user.planoExpiraEm
      },
      token
    });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ erro: 'Erro ao fazer login' });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (client should delete token)
 */
router.post('/logout', apiLimiter, auth, (req, res) => {
  // In a stateless JWT system, logout is handled client-side by deleting the token
  // This endpoint exists for consistency and can be extended with token blacklisting if needed
  res.json({ mensagem: 'Logout bem-sucedido' });
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', apiLimiter, auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({
      user: {
        id: user._id,
        email: user.email,
        plano: user.plano,
        planoStatus: user.planoStatus,
        planoExpiraEm: user.planoExpiraEm,
        spotsFavoritos: user.spotsFavoritos,
        configuracoes: user.configuracoes,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).json({ erro: 'Erro ao obter informações do usuário' });
  }
});

module.exports = router;
