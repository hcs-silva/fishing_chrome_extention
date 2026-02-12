const express = require('express');
const router = express.Router();
const spots = require('../utils/spots');
const auth = require('../middleware/auth');
const { isPremium } = require('../middleware/planCheck');
const { apiLimiter } = require('../middleware/rateLimiter');
const User = require('../models/User');

/**
 * GET /api/spots/all
 * Get all fishing spots (Premium only)
 */
router.get('/all', apiLimiter, auth, isPremium, (req, res) => {
  res.json({
    spots: spots,
    total: spots.length
  });
});

/**
 * GET /api/spots/favorites
 * Get user's favorite spots
 */
router.get('/favorites', apiLimiter, auth, async (req, res) => {
  try {
    const user = req.user;
    const favoriteSpots = spots.filter(spot => 
      user.spotsFavoritos.includes(spot.id)
    );

    res.json({
      favorites: favoriteSpots,
      total: favoriteSpots.length
    });
  } catch (error) {
    console.error('Error getting favorites:', error);
    res.status(500).json({ erro: 'Erro ao obter favoritos' });
  }
});

/**
 * POST /api/spots/favorites
 * Add a spot to favorites (Premium only)
 */
router.post('/favorites', apiLimiter, auth, isPremium, async (req, res) => {
  try {
    const { spotId } = req.body;
    const user = req.user;

    if (!spotId) {
      return res.status(400).json({ erro: 'spotId é obrigatório' });
    }

    // Check if spot exists
    const spot = spots.find(s => s.id === parseInt(spotId));
    if (!spot) {
      return res.status(404).json({ erro: 'Spot não encontrado' });
    }

    // Check if already in favorites
    if (user.spotsFavoritos.includes(parseInt(spotId))) {
      return res.status(400).json({ erro: 'Spot já está nos favoritos' });
    }

    // Add to favorites
    user.spotsFavoritos.push(parseInt(spotId));
    await user.save();

    res.json({
      mensagem: 'Spot adicionado aos favoritos',
      spotsFavoritos: user.spotsFavoritos
    });
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ erro: 'Erro ao adicionar favorito' });
  }
});

/**
 * DELETE /api/spots/favorites/:spotId
 * Remove a spot from favorites
 * Note: Does not require premium plan - users can remove favorites even after downgrading
 */
router.delete('/favorites/:spotId', apiLimiter, auth, async (req, res) => {
  try {
    const { spotId } = req.params;
    const user = req.user;

    const spotIdInt = parseInt(spotId);
    
    // Check if in favorites
    if (!user.spotsFavoritos.includes(spotIdInt)) {
      return res.status(404).json({ erro: 'Spot não está nos favoritos' });
    }

    // Remove from favorites
    user.spotsFavoritos = user.spotsFavoritos.filter(id => id !== spotIdInt);
    await user.save();

    res.json({
      mensagem: 'Spot removido dos favoritos',
      spotsFavoritos: user.spotsFavoritos
    });
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ erro: 'Erro ao remover favorito' });
  }
});

module.exports = router;
