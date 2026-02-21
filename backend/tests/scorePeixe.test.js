const test = require("node:test");
const assert = require("node:assert/strict");

const calcularScorePeixe = require("../utils/scorePeixe");

/**
 * Unit tests for fishing score calculation logic
 */

test("returns correct score for known spot at mid-day (no bonuses)", () => {
  // Spot 2 = Ericeira base 8.2
  // mare baixa (1.0 <= 2.5) +0.8, noon penalty -1.0, no waves, weekday
  // 8.2 + 0.8 - 1.0 = 8.0
  const score = calcularScorePeixe(2, 1.0, 13, 0, 1);
  assert.equal(score, 8.0);
});

test("score is clamped to maximum of 10", () => {
  // Spot 6 = Sesimbra base 8.5, mare alta +2.0, morning +2.2, weekend +0.7, no waves
  // 8.5 + 2.0 + 2.2 + 0.7 = 13.4 → clamped to 10
  const score = calcularScorePeixe(6, 3.0, 7, 0, 0);
  assert.equal(score, 10);
});

test("score is clamped to minimum of 1", () => {
  // Spot 4 = Nazaré base 5.5, mare baixa +0.8, noon -1.0, 5m waves -7.0
  // 5.5 + 0.8 - 1.0 - 7.0 = -1.7 → clamped to 1
  const score = calcularScorePeixe(4, 1.0, 13, 5, 1);
  assert.equal(score, 1);
});

test("uses default base score for unknown spot ID", () => {
  // Unknown spot ID uses base 6.5, mare baixa +0.8, no bonuses or penalties
  // 6.5 + 0.8 = 7.3
  const score = calcularScorePeixe(999, 1.0, 10, 0, 1);
  assert.equal(score, 7.3);
});

test("morning window bonus increases score", () => {
  // Spot 4 = Nazaré base 5.5, mare baixa +0.8, morning (7h) +2.2, no waves, weekday
  // 5.5 + 0.8 + 2.2 = 8.5
  const score = calcularScorePeixe(4, 1.0, 7, 0, 1);
  assert.equal(score, 8.5);
});

test("afternoon window bonus increases score", () => {
  // Spot 4 = Nazaré base 5.5, mare baixa +0.8, afternoon (18h) +1.2, no waves, weekday
  // 5.5 + 0.8 + 1.2 = 7.5
  const score = calcularScorePeixe(4, 1.0, 18, 0, 1);
  assert.equal(score, 7.5);
});

test("high tide increases score", () => {
  const scoreLowTide = calcularScorePeixe(1, 1.0, 10, 0, 1);
  const scoreHighTide = calcularScorePeixe(1, 3.0, 10, 0, 1);
  assert.ok(scoreHighTide > scoreLowTide);
});

test("wave height penalises score", () => {
  const scoreNoWaves = calcularScorePeixe(1, 1.0, 10, 0, 1);
  const scoreWithWaves = calcularScorePeixe(1, 1.0, 10, 2, 1);
  assert.ok(scoreWithWaves < scoreNoWaves);
});

test("weekend bonus increases score", () => {
  const weekdayScore = calcularScorePeixe(1, 1.0, 10, 0, 1); // Tuesday
  const weekendScore = calcularScorePeixe(1, 1.0, 10, 0, 6); // Saturday
  assert.ok(weekendScore > weekdayScore);
});

test("score is a number rounded to one decimal place", () => {
  const score = calcularScorePeixe(3, 2.0, 11, 0.5, 3);
  assert.ok(typeof score === "number");
  // Should be a multiple of 0.1
  assert.equal(score, Math.round(score * 10) / 10);
});
