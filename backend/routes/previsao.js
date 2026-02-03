const express = require('express');
const router = express.Router();
const spots = require('../utils/spots');

router.get('/', async (req, res) => {
  const { spotId } = req.query;
  const spot = spots.find(s => s.id === parseInt(spotId));
  if (!spot) return res.status(404).json({ erro: 'Spot não encontrado' });

  const agora = new Date();
  const hora = agora.getHours();
  const minuto = agora.getMinutes();
  const diaSemana = agora.getDay(); // 0=dom, 6=sáb
  
  // Ondas realistas por spot (inverno PT)
  const ondasPorSpot = {
    1: { base: 1.2, dir: 265 }, // Caparica
    2: { base: 1.8, dir: 280 }, // Ericeira  
    3: { base: 2.5, dir: 290 }, // Peniche
    4: { base: 3.2, dir: 300 }, // Nazaré
    5: { base: 1.5, dir: 240 }, // Sagres
    6: { base: 1.0, dir: 260 }, // Sesimbra
    7: { base: 0.8, dir: 270 }  // Aveiro
  };
  
  const ondasData = ondasPorSpot[spotId] || { base: 1.5, dir: 270 };
  
  // Ciclo maré sinusoidal (12h25 ciclo real)
  const cicloMare = (hora + minuto/60) / 24 * 2 * Math.PI;
  const mareAltura = Math.sin(cicloMare) * 2.2 + 1.8; // 0-4.0m
  
  // Score peixe (solunar + maré + ondas + hora)
  const scorePeixe = Math.max(1, Math.min(10, 
    5 + 
    (mareAltura > 2.5 ? 2 : 0) +           // maré cheia
    (hora >= 6 && hora <= 9 ? 2 : 0) +     // manhã
    (hora >= 17 && hora <= 20 ? 1 : 0) +   // tarde
    (diaSemana === 0 || diaSemana === 6 ? 1 : 0) -  // fim semana
    (ondasData.base * 1.5)                  // ondas ruins
  ));

  res.json({
    spot: spot.nome,
    agora: agora.toLocaleTimeString('pt-PT'),
    mare: {
      altura: mareAltura.toFixed(1) + 'm',
      estado: mareAltura > 2.5 ? 'Preia-mar' : 'Baixa-mar',
      proxima: mareAltura > 2.5 ? 'Baixa-mar ~' + Math.round((12 - hora) % 12) + 'h' : 'Preia-mar ~' + Math.round(hora % 12) + 'h'
    },
    ondas: {
      altura: ondasData.base.toFixed(1) + '-' + (ondasData.base + 0.5).toFixed(1) + 'm',
      periodo: '8-12s',
      direcao: ondasData.dir + '° (NW)'
    },
    tempAgua: (15 + Math.sin(cicloMare * 0.5) * 1).toFixed(1) + '°C',
    scorePeixe: Math.round(scorePeixe),
    bomAgora: scorePeixe >= 7,
    recomendacao: scorePeixe >= 8 ? '🚀 Vai AGORA!' : 
                  scorePeixe >= 6 ? '👍 Razoável' : 
                  scorePeixe >= 4 ? '⚠️  Cuidados' : '⏳ Espera melhor'
  });
});

module.exports = router;
