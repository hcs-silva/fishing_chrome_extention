const test = require("node:test");
const assert = require("node:assert/strict");

const { getMoonPhaseName } = require("../services/solunarApi");

/**
 * Unit tests for moon phase naming logic
 *
 * Phase ranges:
 *   < 0.0625              → Lua Nova
 *   0.0625  - < 0.1875   → Crescente Inicial
 *   0.1875  - < 0.3125   → Quarto Crescente
 *   0.3125  - < 0.4375   → Gibosa Crescente
 *   0.4375  - < 0.5625   → Lua Cheia
 *   0.5625  - < 0.6875   → Gibosa Minguante
 *   0.6875  - < 0.8125   → Quarto Minguante
 *   0.8125  - < 0.9375   → Minguante Final
 *   >= 0.9375             → Lua Nova
 */

test("returns Lua Nova for new moon at phase 0", () => {
  assert.equal(getMoonPhaseName(0), "Lua Nova");
});

test("returns Lua Nova for phase just below 0.0625", () => {
  assert.equal(getMoonPhaseName(0.06), "Lua Nova");
});

test("returns Crescente Inicial for phase 0.1", () => {
  assert.equal(getMoonPhaseName(0.1), "Crescente Inicial");
});

test("returns Quarto Crescente for phase 0.25", () => {
  assert.equal(getMoonPhaseName(0.25), "Quarto Crescente");
});

test("returns Gibosa Crescente for phase 0.38", () => {
  assert.equal(getMoonPhaseName(0.38), "Gibosa Crescente");
});

test("returns Lua Cheia for full moon at phase 0.5", () => {
  assert.equal(getMoonPhaseName(0.5), "Lua Cheia");
});

test("returns Gibosa Minguante for phase 0.62", () => {
  assert.equal(getMoonPhaseName(0.62), "Gibosa Minguante");
});

test("returns Quarto Minguante for phase 0.75", () => {
  assert.equal(getMoonPhaseName(0.75), "Quarto Minguante");
});

test("returns Minguante Final for phase 0.87", () => {
  assert.equal(getMoonPhaseName(0.87), "Minguante Final");
});

test("returns Lua Nova for phase at or above 0.9375", () => {
  assert.equal(getMoonPhaseName(0.94), "Lua Nova");
  assert.equal(getMoonPhaseName(1.0), "Lua Nova");
});
