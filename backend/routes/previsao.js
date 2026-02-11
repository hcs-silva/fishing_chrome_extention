const express = require('express');
const router = express.Router();
const spots = require('../utils/spots');
const { getTideData } = require('../services/tidesApi');
const { getMarineWeather } = require('../services/marineWeatherApi');
const { getWindData } = require('../services/windApi');
const { getSolunarData, getMoonPhaseName } = require('../services/solunarApi');

router.get('/', async (req, res) => {
  const { spotId } = req.query;
  const spot = spots.find(s => s.id === parseInt(spotId));
  if (!spot) return res.status(404).json({ erro: 'Spot não encontrado' });

  try {
    // Fetch all data in parallel from free APIs
    const [tideData, marineData, windData, solunarData] = await Promise.all([
      getTideData(spot.lat, spot.lng),
      getMarineWeather(spot.lat, spot.lng),
      getWindData(spot.lat, spot.lng),
      getSolunarData(spot.lat, spot.lng)
    ]);

    const agora = new Date();
    const hora = agora.getHours();
    const diaSemana = agora.getDay(); // 0=dom, 6=sáb

    // Format wave direction
    const waveDir = Math.round(marineData.waves.direction);
    const waveDirName = getWindDirectionName(waveDir);
    
    // Format wind direction
    const windDir = Math.round(windData.direction);
    const windDirName = getWindDirectionName(windDir);

    // Format moon phase
    const moonPhase = solunarData.moonPhase;
    const moonPhaseName = getMoonPhaseName(moonPhase);

    // Format sunrise/sunset times to Portuguese time
    const sunrise = new Date(solunarData.sunrise);
    const sunset = new Date(solunarData.sunset);
    const sunriseTime = sunrise.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    const sunsetTime = sunset.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

    // Calculate fishing score based on real data
    const scorePeixe = calculateFishingScore(
      tideData,
      marineData.waves,
      windData,
      moonPhase,
      hora,
      diaSemana
    );

    // Water temperature estimation (can be improved with actual API)
    const tempAgua = estimateWaterTemperature(agora.getMonth());

    res.json({
      spot: spot.nome,
      agora: agora.toLocaleTimeString('pt-PT'),
      mare: {
        altura: tideData.height.toFixed(1) + 'm',
        estado: tideData.state,
        proxima: `${tideData.nextChange} ~${Math.round(tideData.timeToChange)}h`
      },
      ondas: {
        altura: marineData.waves.height.toFixed(1) + 'm',
        periodo: marineData.waves.period.toFixed(0) + 's',
        direcao: `${waveDir}° (${waveDirName})`
      },
      vento: {
        velocidade: windData.speed.toFixed(1) + ' km/h',
        rajadas: windData.gusts.toFixed(1) + ' km/h',
        direcao: `${windDir}° (${windDirName})`
      },
      solunar: {
        nascerSol: sunriseTime,
        porSol: sunsetTime,
        luaFase: moonPhaseName,
        luaFaseValor: (moonPhase * 100).toFixed(0) + '%'
      },
      tempAgua: tempAgua + '°C',
      scorePeixe: Math.round(scorePeixe),
      bomAgora: scorePeixe >= 7,
      recomendacao: scorePeixe >= 8 ? '🚀 Vai AGORA!' : 
                    scorePeixe >= 6 ? '👍 Razoável' : 
                    scorePeixe >= 4 ? '⚠️ Cuidados' : '⏳ Espera melhor'
    });
  } catch (error) {
    console.error('Error fetching forecast data:', error);
    res.status(500).json({ 
      erro: 'Erro ao obter dados das APIs',
      detalhes: error.message 
    });
  }
});

/**
 * Calculate fishing score based on multiple factors
 */
function calculateFishingScore(tide, waves, wind, moonPhase, hour, dayOfWeek) {
  let score = 5; // Base score

  // Tide factors (best at tide changes)
  if (tide.state === 'Enchente' || tide.state === 'Vazante') {
    score += 2; // Moving tides are good
  }
  if (tide.height > 2.5 && tide.height < 3.5) {
    score += 1; // Good tide height
  }

  // Wave conditions (smaller waves are better for fishing)
  if (waves.height < 1.0) {
    score += 2; // Calm seas
  } else if (waves.height < 2.0) {
    score += 1; // Moderate
  } else if (waves.height > 3.0) {
    score -= 2; // Too rough
  }

  // Wind conditions (light wind is best)
  if (wind.speed < 10) {
    score += 2; // Calm wind
  } else if (wind.speed < 20) {
    score += 1; // Light wind
  } else if (wind.speed > 30) {
    score -= 2; // Too windy
  }

  // Moon phase (new and full moon are best)
  if (moonPhase < 0.1 || moonPhase > 0.9 || (moonPhase > 0.4 && moonPhase < 0.6)) {
    score += 2; // New or full moon
  } else if (moonPhase < 0.3 || moonPhase > 0.7) {
    score += 1; // Quarter moons
  }

  // Time of day (dawn and dusk are best)
  if ((hour >= 5 && hour <= 8) || (hour >= 17 && hour <= 20)) {
    score += 2; // Best feeding times
  } else if ((hour >= 9 && hour <= 11) || (hour >= 15 && hour <= 16)) {
    score += 1; // Good times
  }

  // Weekend bonus
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    score += 0.5;
  }

  return Math.max(1, Math.min(10, score));
}

/**
 * Convert wind/wave direction to cardinal direction name
 */
function getWindDirectionName(degrees) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

/**
 * Estimate water temperature based on month (simple approximation)
 */
function estimateWaterTemperature(month) {
  // Atlantic coast Portugal average temperatures
  const temps = [14, 14, 14, 15, 16, 18, 19, 20, 19, 18, 16, 15];
  return temps[month].toFixed(1);
}

module.exports = router;
