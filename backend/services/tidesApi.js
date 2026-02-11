/**
 * Tides API Service
 * Uses NOAA Tides and Currents API for Portugal coastal locations
 * Free API - No API key required
 * 
 * Note: For Portuguese locations, we'll use a simplified tide prediction
 * based on harmonic analysis. Real-time data requires station-specific APIs.
 * 
 * For production, consider:
 * - WorldTides API (free tier available)
 * - Stormglass.io (limited free tier)
 * - Local Portuguese hydrographic institute data
 */

/**
 * Simplified tide calculation using harmonic analysis
 * This is an approximation - for production use a proper tide API
 * 
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {Date} date - Date/time to calculate tide for
 * @returns {Object} Tide data
 */
function calculateTide(lat, lng, date = new Date()) {
  // Simplified harmonic tide calculation
  // Based on principal lunar semidiurnal (M2) and solar semidiurnal (S2) constituents
  
  const hour = date.getHours() + date.getMinutes() / 60;
  
  // M2 tide (12.42 hour period - principal lunar)
  const m2Period = 12.42;
  const m2Phase = (hour / m2Period) * 2 * Math.PI;
  const m2Amplitude = 1.8; // meters (varies by location)
  const m2Component = m2Amplitude * Math.cos(m2Phase);
  
  // S2 tide (12 hour period - principal solar)
  const s2Period = 12.0;
  const s2Phase = (hour / s2Period) * 2 * Math.PI;
  const s2Amplitude = 0.6; // meters
  const s2Component = s2Amplitude * Math.cos(s2Phase);
  
  // N2 tide (12.66 hour period - larger lunar elliptic)
  const n2Period = 12.66;
  const n2Phase = (hour / n2Period) * 2 * Math.PI;
  const n2Amplitude = 0.4; // meters
  const n2Component = n2Amplitude * Math.cos(n2Phase);
  
  // Mean sea level
  const meanSeaLevel = 2.0; // meters (varies by location)
  
  // Calculate total tide height
  const tideHeight = meanSeaLevel + m2Component + s2Component + n2Component;
  
  // Determine tide state
  let state, nextChange, timeToChange;
  const m2Rate = -(m2Amplitude / m2Period) * Math.sin(m2Phase);
  
  if (Math.abs(m2Rate) < 0.05) {
    // At high or low tide
    state = tideHeight > meanSeaLevel ? 'Preia-mar' : 'Baixa-mar';
    timeToChange = m2Period / 2; // Approximately half period
    nextChange = tideHeight > meanSeaLevel ? 'Baixa-mar' : 'Preia-mar';
  } else if (m2Rate < 0) {
    // Tide falling
    state = 'Vazante';
    timeToChange = calculateTimeToExtreme(hour, m2Period, m2Phase, false);
    nextChange = 'Baixa-mar';
  } else {
    // Tide rising
    state = 'Enchente';
    timeToChange = calculateTimeToExtreme(hour, m2Period, m2Phase, true);
    nextChange = 'Preia-mar';
  }
  
  return {
    height: tideHeight,
    state: state,
    nextChange: nextChange,
    timeToChange: timeToChange,
    timestamp: date.toISOString()
  };
}

/**
 * Calculate time to next tide extreme (high or low)
 */
function calculateTimeToExtreme(currentHour, period, phase, rising) {
  // Find next extreme (0 or π in the cosine wave)
  const target = rising ? Math.PI / 2 : 3 * Math.PI / 2;
  let phaseToTarget = target - (phase % (2 * Math.PI));
  
  if (phaseToTarget < 0) {
    phaseToTarget += 2 * Math.PI;
  }
  
  const hoursToTarget = (phaseToTarget / (2 * Math.PI)) * period;
  return hoursToTarget;
}

/**
 * Get tide data for a location
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object>} Tide data
 */
async function getTideData(lat, lng) {
  try {
    const now = new Date();
    const tide = calculateTide(lat, lng, now);
    
    return {
      height: tide.height,
      state: tide.state,
      nextChange: tide.nextChange,
      timeToChange: tide.timeToChange,
      timestamp: tide.timestamp
    };
  } catch (error) {
    console.error('Error calculating tide:', error.message);
    throw error;
  }
}

module.exports = {
  getTideData
};
