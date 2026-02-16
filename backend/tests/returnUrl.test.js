const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeReturnBaseUrl,
  buildStripeReturnUrls,
} = require("../utils/returnUrl");

test("normalizeReturnBaseUrl fixes missing colon in scheme", () => {
  const normalized = normalizeReturnBaseUrl(
    "https//example.com/checkout-return",
  );

  assert.equal(normalized, "https://example.com/checkout-return");
});

test("normalizeReturnBaseUrl appends extension popup path", () => {
  const normalized = normalizeReturnBaseUrl(
    "chrome-extension//bjpobghdnhpllmbggfeliabplgpggjid",
  );

  assert.equal(
    normalized,
    "chrome-extension://bjpobghdnhpllmbggfeliabplgpggjid/popup/popup.html",
  );
});

test("buildStripeReturnUrls prefers extension origin and builds status params", () => {
  const urls = buildStripeReturnUrls({
    originHeader: "chrome-extension://bjpobghdnhpllmbggfeliabplgpggjid",
    frontendUrl: "https://app.example.com/return",
  });

  assert.equal(
    urls.returnUrl,
    "chrome-extension://bjpobghdnhpllmbggfeliabplgpggjid/popup/popup.html",
  );
  assert.match(urls.successUrl, /billingStatus=success/);
  assert.match(urls.successUrl, /session_id=\{CHECKOUT_SESSION_ID\}/);
  assert.match(urls.cancelUrl, /billingStatus=cancel/);
});

test("buildStripeReturnUrls falls back to frontendUrl and normalizes scheme", () => {
  const urls = buildStripeReturnUrls({
    originHeader: null,
    frontendUrl: "https//app.example.com/return",
  });

  assert.equal(urls.returnUrl, "https://app.example.com/return");
});

test("buildStripeReturnUrls returns null without usable base URL", () => {
  const urls = buildStripeReturnUrls({
    originHeader: null,
    frontendUrl: "",
  });

  assert.equal(urls, null);
});
