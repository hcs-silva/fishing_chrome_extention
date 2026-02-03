// Lógica solunar AVANÇADA com spots específicos Portugal
module.exports = function calcularScorePeixe(spotId, mareAltura, horaAtual, ondasAltura, diaSemana) {
  // ⭐ BASE POR SPOT (pesca realista PT)
  const basePorSpot = {
    1: 7.5,  // Caparica ⭐
    2: 8.2,  // Ericeira ⭐⭐ (pesca top)
    3: 6.8,  // Peniche 
    4: 5.5,  // Nazaré ❌ (muito mar)
    5: 7.8,  // Sagres ⭐
    6: 8.5,  // Sesimbra ⭐⭐ (porto protegido)
    7: 7.0   // Aveiro ⭐
  };
  
  let score = basePorSpot[spotId] || 6.5;
  
  // ✅ MARÉ (melhor na cheia ou subindo)
  const isMareAlta = mareAltura > 2.5;
  score += isMareAlta ? 2.0 : 0.8;
  
  // ✅ JANELAS SOLUNARES (manhã/tarde)
  if (horaAtual >= 6 && horaAtual <= 9) score += 2.2;  // ⭐ Manhã top
  if (horaAtual >= 17 && horaAtual <= 20) score += 1.2; // Tarde boa
  
  // ✅ FIM DE SEMANA
  if (diaSemana === 0 || diaSemana === 6) score += 0.7;
  
  // ❌ ONDAS (penaliza ondas grandes)
  score -= ondasAltura * 1.4;
  
  // ❌ MEIO-DIA (pesca pior)
  if (horaAtual >= 12 && horaAtual <= 15) score -= 1.0;
  
  // Limites realistas
  return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
};
