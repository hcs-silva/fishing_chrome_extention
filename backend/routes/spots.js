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

/**
 * GET /api/spots/personalizados
 * Get user's custom spots
 */
router.get('/personalizados', apiLimiter, auth, async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      spots: user.spotsPersonalizados || [],
      total: (user.spotsPersonalizados || []).length,
      plano: user.plano,
      limite: user.plano === 'premium' ? null : 1
    });
  } catch (error) {
    console.error('Error getting custom spots:', error);
    res.status(500).json({ erro: 'Erro ao obter spots personalizados' });
  }
});

/**
 * POST /api/spots/personalizados
 * Add a custom spot
 * Free users: limited to 1 spot
 * Premium users: unlimited spots
 */
router.post('/personalizados', apiLimiter, auth, async (req, res) => {
  try {
    const { nome, lat, lng } = req.body;
    const user = req.user;

    // Validate input
    if (!nome || !lat || !lng) {
      return res.status(400).json({ erro: 'Nome, latitude e longitude são obrigatórios' });
    }

    // Validate coordinates
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ erro: 'Coordenadas inválidas' });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ erro: 'Coordenadas fora do intervalo válido' });
    }

    // Check spot limit for free users
    if (user.plano !== 'premium') {
      if ((user.spotsPersonalizados || []).length >= 1) {
        return res.status(403).json({ 
          erro: 'Utilizadores FREE podem adicionar apenas 1 spot. Faz upgrade para Premium para spots ilimitados.',
          plano: user.plano,
          limite: 1
        });
      }
    }

    // Generate unique ID for the spot
    const existingIds = (user.spotsPersonalizados || []).map(s => s.id);
    let newId = 1000; // Start custom spot IDs at 1000 to avoid conflicts with predefined spots
    while (existingIds.includes(newId)) {
      newId++;
    }

    // Create new spot
    const newSpot = {
      id: newId,
      nome: nome.trim(),
      lat: latitude,
      lng: longitude,
      criadoEm: new Date()
    };

    // Add to user's custom spots
    if (!user.spotsPersonalizados) {
      user.spotsPersonalizados = [];
    }
    user.spotsPersonalizados.push(newSpot);
    await user.save();

    res.json({
      mensagem: 'Spot personalizado adicionado',
      spot: newSpot,
      total: user.spotsPersonalizados.length,
      limite: user.plano === 'premium' ? null : 1
    });
  } catch (error) {
    console.error('Error adding custom spot:', error);
    res.status(500).json({ erro: 'Erro ao adicionar spot personalizado' });
  }
});

/**
 * DELETE /api/spots/personalizados/:spotId
 * Remove a custom spot
 */
router.delete('/personalizados/:spotId', apiLimiter, auth, async (req, res) => {
  try {
    const { spotId } = req.params;
    const user = req.user;

    const spotIdInt = parseInt(spotId);
    
    // Check if spot exists
    const spotIndex = (user.spotsPersonalizados || []).findIndex(s => s.id === spotIdInt);
    if (spotIndex === -1) {
      return res.status(404).json({ erro: 'Spot personalizado não encontrado' });
    }

    // Remove the spot
    user.spotsPersonalizados.splice(spotIndex, 1);
    await user.save();

    res.json({
      mensagem: 'Spot personalizado removido',
      total: user.spotsPersonalizados.length
    });
  } catch (error) {
    console.error('Error removing custom spot:', error);
    res.status(500).json({ erro: 'Erro ao remover spot personalizado' });
  }
});

module.exports = router;
