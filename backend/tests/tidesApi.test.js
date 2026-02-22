const test = require("node:test");
const assert = require("node:assert/strict");

const { getTideData } = require("../services/tidesApi");

/**
 * Unit tests for tide calculation service
 * getTideData uses a local harmonic calculation and makes no external API calls.
 */

const VALID_TIDE_STATES = ["Preia-mar", "Baixa-mar", "Vazante", "Enchente"];

test("getTideData returns an object with the expected properties", async () => {
  const tideData = await getTideData(38.655, -9.23);

  assert.ok(Object.prototype.hasOwnProperty.call(tideData, "height"));
  assert.ok(Object.prototype.hasOwnProperty.call(tideData, "state"));
  assert.ok(Object.prototype.hasOwnProperty.call(tideData, "nextChange"));
  assert.ok(Object.prototype.hasOwnProperty.call(tideData, "timeToChange"));
  assert.ok(Object.prototype.hasOwnProperty.call(tideData, "timestamp"));
});

test("getTideData height is a number within realistic bounds", async () => {
  // Minimum: meanSeaLevel(2.0) - m2Amp(1.8) - s2Amp(0.6) - n2Amp(0.4) = -0.8
  // Maximum: meanSeaLevel(2.0) + m2Amp(1.8) + s2Amp(0.6) + n2Amp(0.4) =  4.8
  const tideData = await getTideData(38.655, -9.23);

  assert.ok(typeof tideData.height === "number");
  assert.ok(tideData.height >= -1, `height ${tideData.height} below -1`);
  assert.ok(tideData.height <= 5, `height ${tideData.height} above 5`);
});

test("getTideData state is a valid Portuguese tide state", async () => {
  const tideData = await getTideData(38.655, -9.23);

  assert.ok(
    VALID_TIDE_STATES.includes(tideData.state),
    `unexpected state: ${tideData.state}`,
  );
});

test("getTideData nextChange is a valid tide state string", async () => {
  const tideData = await getTideData(38.655, -9.23);

  assert.ok(
    VALID_TIDE_STATES.includes(tideData.nextChange),
    `unexpected nextChange: ${tideData.nextChange}`,
  );
});

test("getTideData timestamp is a valid ISO 8601 string", async () => {
  const tideData = await getTideData(38.655, -9.23);

  assert.ok(
    typeof tideData.timestamp === "string",
    "timestamp is not a string",
  );
  assert.ok(
    !isNaN(Date.parse(tideData.timestamp)),
    `timestamp is not a valid date: ${tideData.timestamp}`,
  );
});

test("getTideData works for different Portuguese coastal locations", async () => {
  const locations = [
    { lat: 38.963, lng: -9.417 }, // Ericeira
    { lat: 39.356, lng: -9.381 }, // Peniche
    { lat: 37.0, lng: -8.941 },   // Sagres
  ];

  for (const loc of locations) {
    const tideData = await getTideData(loc.lat, loc.lng);
    assert.ok(
      VALID_TIDE_STATES.includes(tideData.state),
      `invalid state for ${JSON.stringify(loc)}: ${tideData.state}`,
    );
  }
});
