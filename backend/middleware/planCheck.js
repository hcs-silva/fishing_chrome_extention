/**
 * Middleware to check if user has premium plan
 */
const isPremium = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ erro: 'Autenticação necessária' });
  }

  // Check if user has premium plan
  if (req.user.plano !== 'premium') {
    return res.status(403).json({ 
      erro: 'Esta funcionalidade é exclusiva para usuários Premium',
      plano: req.user.plano,
      upgradeUrl: '/api/subscription/create-checkout'
    });
  }

  // Check if premium plan is active
  if (req.user.planoExpiraEm && new Date() > req.user.planoExpiraEm) {
    return res.status(403).json({ 
      erro: 'Sua assinatura Premium expirou',
      plano: req.user.plano,
      expiraEm: req.user.planoExpiraEm
    });
  }

  // Check plan status
  if (req.user.planoStatus !== 'active' && req.user.planoStatus !== 'trialing') {
    return res.status(403).json({ 
      erro: 'Sua assinatura não está ativa',
      status: req.user.planoStatus
    });
  }

  next();
};

/**
 * Middleware that allows access but adds plan info to request
 */
const checkPlan = (req, res, next) => {
  if (!req.user) {
    req.isPremium = false;
    req.plan = 'free';
  } else {
    const isPremiumActive = 
      req.user.plano === 'premium' &&
      (req.user.planoStatus === 'active' || req.user.planoStatus === 'trialing') &&
      (!req.user.planoExpiraEm || new Date() <= req.user.planoExpiraEm);
    
    req.isPremium = isPremiumActive;
    req.plan = isPremiumActive ? 'premium' : 'free';
  }
  next();
};

module.exports = { isPremium, checkPlan };
