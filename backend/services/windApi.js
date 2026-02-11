/**
 * Open-Meteo Weather API Service
 * Free API - No API key required
 * Provides: wind speed and direction
 * Documentation: https://open-meteo.com/en/docs
 */

const fetch = require('node-fetch');

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';

/**
 * Get wind data for a location
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object>} Wind data
 */
async function getWindData(lat, lng) {
  try {
    const params = new URLSearchParams({
      latitude: lat.toFixed(4),
      longitude: lng.toFixed(4),
      current: 'wind_speed_10m,wind_direction_10m,wind_gusts_10m',
      timezone: 'Europe/Lisbon'
    });

    const url = `${BASE_URL}?${params}`;
    const response = await fetch(url, { timeout: 5000 });
    
    if (!response.ok) {
      throw new Error(`Wind API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      speed: data.current.wind_speed_10m || 0,
      direction: data.current.wind_direction_10m || 0,
      gusts: data.current.wind_gusts_10m || 0,
      timestamp: data.current.time
    };
  } catch (error) {
    console.warn('Wind API unavailable, using fallback data:', error.message);
    // Return fallback/estimated wind data
    return getFallbackWindData(lat, lng);
  }
}

/**
 * Fallback wind data when API is unavailable
 */
function getFallbackWindData(lat, lng) {
  const hour = new Date().getHours();
  const month = new Date().getMonth();
  const isWinter = month >= 10 || month <= 2;
  
  // Wind typically picks up during afternoon and is stronger in winter
  const baseSpeed = isWinter ? 15 : 10;
  const timeOfDayFactor = hour >= 12 && hour <= 18 ? 1.3 : 0.8;
  const speed = baseSpeed * timeOfDayFactor + Math.random() * 5;
  
  return {
    speed: speed,
    direction: 280, // Typical NW wind for Portuguese coast
    gusts: speed * 1.4,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  getWindData
};
