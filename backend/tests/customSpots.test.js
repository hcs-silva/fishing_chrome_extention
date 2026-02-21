const test = require("node:test");
const assert = require("node:assert/strict");

/**
 * Unit tests for custom spots validation logic
 */

test("Validate latitude range", () => {
  const validateCoords = (lat, lng) => {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return { valid: false, error: 'Coordenadas inválidas' };
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return { valid: false, error: 'Coordenadas fora do intervalo válido' };
    }

    return { valid: true };
  };

  // Valid coordinates
  assert.deepEqual(validateCoords(38.655, -9.230), { valid: true });
  assert.deepEqual(validateCoords(0, 0), { valid: true });
  assert.deepEqual(validateCoords(90, 180), { valid: true });
  assert.deepEqual(validateCoords(-90, -180), { valid: true });

  // Invalid coordinates - out of range
  assert.deepEqual(validateCoords(91, 0), { 
    valid: false, 
    error: 'Coordenadas fora do intervalo válido' 
  });
  assert.deepEqual(validateCoords(0, 181), { 
    valid: false, 
    error: 'Coordenadas fora do intervalo válido' 
  });
  assert.deepEqual(validateCoords(-91, 0), { 
    valid: false, 
    error: 'Coordenadas fora do intervalo válido' 
  });

  // Invalid coordinates - not numbers
  assert.deepEqual(validateCoords("abc", "def"), { 
    valid: false, 
    error: 'Coordenadas inválidas' 
  });
});

test("Free user spot limit check", () => {
  const checkSpotLimit = (userPlan, currentSpots) => {
    if (userPlan !== 'premium') {
      if (currentSpots >= 1) {
        return { 
          canAdd: false, 
          error: 'Utilizadores FREE podem adicionar apenas 1 spot. Faz upgrade para Premium para spots ilimitados.' 
        };
      }
    }
    return { canAdd: true };
  };

  // Free user with no spots - can add
  assert.deepEqual(checkSpotLimit('free', 0), { canAdd: true });

  // Free user with 1 spot - cannot add
  assert.deepEqual(checkSpotLimit('free', 1), { 
    canAdd: false,
    error: 'Utilizadores FREE podem adicionar apenas 1 spot. Faz upgrade para Premium para spots ilimitados.' 
  });

  // Premium user with any number of spots - can add
  assert.deepEqual(checkSpotLimit('premium', 0), { canAdd: true });
  assert.deepEqual(checkSpotLimit('premium', 1), { canAdd: true });
  assert.deepEqual(checkSpotLimit('premium', 10), { canAdd: true });
});

test("Generate unique spot ID", () => {
  // This function starts at 1000 and increments until it finds an ID not in the existing list
  // Note: It doesn't necessarily fill gaps, but finds the next available ID from the start point
  const generateUniqueId = (existingIds) => {
    let newId = 1000;
    while (existingIds.includes(newId)) {
      newId++;
    }
    return newId;
  };

  // No existing spots - starts at 1000
  assert.equal(generateUniqueId([]), 1000);

  // Sequential existing spots - returns next in sequence
  assert.equal(generateUniqueId([1000, 1001, 1002]), 1003);

  // Spots with gap - returns first available from start (happens to fill gap)
  assert.equal(generateUniqueId([1000, 1002]), 1001);
  
  // Non-sequential - still starts from 1000
  assert.equal(generateUniqueId([1005, 1010]), 1000);
});
