/**
 * Sunrise-Sunset.org API Service
 * Free API - No API key required
 * Provides: sunrise, sunset, solar noon, day length, moon phase
 * Documentation: https://sunrise-sunset.org/api
 */

const fetch = require('node-fetch');

const SUNRISE_SUNSET_URL = 'https://api.sunrise-sunset.org/json';

/**
 * Get sun and moon data for a location
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object>} Solar and lunar data
 */
async function getSolunarData(lat, lng) {
  try {
    const params = new URLSearchParams({
      lat: lat.toFixed(4),
      lng: lng.toFixed(4),
      formatted: 0 // Get ISO 8601 format
    });

    const url = `${SUNRISE_SUNSET_URL}?${params}`;
    const response = await fetch(url, { timeout: 5000 });
    
    if (!response.ok) {
      throw new Error(`Solunar API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error('Solunar API returned error status');
    }

    // Get moon phase (simple calculation based on date)
    const moonPhase = calculateMoonPhase(new Date());
    
    return {
      sunrise: data.results.sunrise,
      sunset: data.results.sunset,
      solarNoon: data.results.solar_noon,
      dayLength: data.results.day_length,
      civilTwilightBegin: data.results.civil_twilight_begin,
      civilTwilightEnd: data.results.civil_twilight_end,
      nauticalTwilightBegin: data.results.nautical_twilight_begin,
      nauticalTwilightEnd: data.results.nautical_twilight_end,
      moonPhase: moonPhase
    };
  } catch (error) {
    console.warn('Solunar API unavailable, using fallback data:', error.message);
    return getFallbackSolunarData(lat, lng);
  }
}

/**
 * Fallback solunar data when API is unavailable
 */
function getFallbackSolunarData(lat, lng) {
  const now = new Date();
  const month = now.getMonth();
  
  // Estimate sunrise/sunset based on month for Portuguese latitude
  const sunriseHours = [7.5, 7.2, 6.8, 6.2, 5.8, 5.5, 5.8, 6.2, 6.8, 7.2, 7.5, 7.8];
  const sunsetHours = [17.5, 18.2, 19.0, 19.8, 20.5, 21.0, 20.8, 20.2, 19.2, 18.2, 17.2, 17.0];
  
  const sunrise = new Date(now);
  sunrise.setHours(Math.floor(sunriseHours[month]), (sunriseHours[month] % 1) * 60, 0, 0);
  
  const sunset = new Date(now);
  sunset.setHours(Math.floor(sunsetHours[month]), (sunsetHours[month] % 1) * 60, 0, 0);
  
  const moonPhase = calculateMoonPhase(now);
  
  return {
    sunrise: sunrise.toISOString(),
    sunset: sunset.toISOString(),
    solarNoon: new Date(now.setHours(13, 0, 0, 0)).toISOString(),
    dayLength: (sunsetHours[month] - sunriseHours[month]) * 3600,
    civilTwilightBegin: new Date(sunrise.getTime() - 30 * 60000).toISOString(),
    civilTwilightEnd: new Date(sunset.getTime() + 30 * 60000).toISOString(),
    nauticalTwilightBegin: new Date(sunrise.getTime() - 60 * 60000).toISOString(),
    nauticalTwilightEnd: new Date(sunset.getTime() + 60 * 60000).toISOString(),
    moonPhase: moonPhase
  };
}

/**
 * Calculate moon phase (0-1, where 0=new moon, 0.5=full moon)
 * Simple approximation based on known new moon date
 */
function calculateMoonPhase(date) {
  // Known new moon: 2000-01-06
  const knownNewMoon = new Date('2000-01-06T18:14:00Z');
  const lunarMonth = 29.530588853; // days
  
  const daysSinceKnownNewMoon = (date - knownNewMoon) / (1000 * 60 * 60 * 24);
  const phase = (daysSinceKnownNewMoon % lunarMonth) / lunarMonth;
  
  return phase;
}

/**
 * Get moon phase name
 */
function getMoonPhaseName(phase) {
  if (phase < 0.0625) return 'Lua Nova';
  if (phase < 0.1875) return 'Crescente Inicial';
  if (phase < 0.3125) return 'Quarto Crescente';
  if (phase < 0.4375) return 'Gibosa Crescente';
  if (phase < 0.5625) return 'Lua Cheia';
  if (phase < 0.6875) return 'Gibosa Minguante';
  if (phase < 0.8125) return 'Quarto Minguante';
  if (phase < 0.9375) return 'Minguante Final';
  return 'Lua Nova';
}

module.exports = {
  getSolunarData,
  getMoonPhaseName
};
