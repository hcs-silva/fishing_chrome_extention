/**
 * Open-Meteo Marine Weather API Service
 * Free API - No API key required
 * Provides: waves (swell height, direction, period) and wind data
 * Documentation: https://open-meteo.com/en/docs/marine-weather-api
 */

const fetch = require('node-fetch');

const BASE_URL = 'https://marine-api.open-meteo.com/v1/marine';

/**
 * Get marine weather data for a location
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object>} Marine weather data
 */
async function getMarineWeather(lat, lng) {
  try {
    const params = new URLSearchParams({
      latitude: lat.toFixed(4),
      longitude: lng.toFixed(4),
      current: 'wave_height,wave_direction,wave_period,wind_wave_height,wind_wave_direction,wind_wave_period',
      timezone: 'Europe/Lisbon'
    });

    const url = `${BASE_URL}?${params}`;
    const response = await fetch(url, { timeout: 5000 });
    
    if (!response.ok) {
      throw new Error(`Marine API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      waves: {
        height: data.current.wave_height || 0,
        direction: data.current.wave_direction || 0,
        period: data.current.wave_period || 0,
        windWaveHeight: data.current.wind_wave_height || 0,
        windWaveDirection: data.current.wind_wave_direction || 0,
        windWavePeriod: data.current.wind_wave_period || 0
      },
      timestamp: data.current.time
    };
  } catch (error) {
    console.warn('Marine API unavailable, using fallback data:', error.message);
    // Return fallback/estimated data based on location
    return getFallbackMarineData(lat, lng);
  }
}

/**
 * Fallback marine data when API is unavailable
 */
function getFallbackMarineData(lat, lng) {
  // Estimate wave conditions based on location and season
  const month = new Date().getMonth();
  const isWinter = month >= 10 || month <= 2;
  
  // Base wave conditions (higher in winter)
  const baseHeight = isWinter ? 1.5 : 0.8;
  const variation = Math.random() * 0.5;
  
  return {
    waves: {
      height: baseHeight + variation,
      direction: 280, // Typical NW direction for Portuguese coast
      period: 10,
      windWaveHeight: 0.5,
      windWaveDirection: 280,
      windWavePeriod: 7
    },
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  getMarineWeather
};
