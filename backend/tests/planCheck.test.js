const test = require("node:test");
const assert = require("node:assert/strict");

const { isPremium, checkPlan } = require("../middleware/planCheck");

/**
 * Unit tests for plan check middleware
 */

/** Creates a minimal mock response object */
const mockRes = () => {
  const res = { statusCode: 200 };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
};

// ─── isPremium ────────────────────────────────────────────────────────────────

test("isPremium: returns 401 when no user is attached to request", () => {
  const req = {};
  const res = mockRes();
  let nextCalled = false;

  isPremium(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 401);
  assert.ok(!nextCalled);
});

test("isPremium: returns 403 for a free-plan user", () => {
  const req = { user: { plano: "free", planoStatus: "active", planoExpiraEm: null } };
  const res = mockRes();
  let nextCalled = false;

  isPremium(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 403);
  assert.ok(!nextCalled);
});

test("isPremium: calls next() for an active premium user", () => {
  const req = { user: { plano: "premium", planoStatus: "active", planoExpiraEm: null } };
  const res = mockRes();
  let nextCalled = false;

  isPremium(req, res, () => {
    nextCalled = true;
  });

  assert.ok(nextCalled, "next() was not called for active premium user");
  assert.equal(res.statusCode, 200);
});

test("isPremium: calls next() for a trialing premium user", () => {
  const req = { user: { plano: "premium", planoStatus: "trialing", planoExpiraEm: null } };
  const res = mockRes();
  let nextCalled = false;

  isPremium(req, res, () => {
    nextCalled = true;
  });

  assert.ok(nextCalled, "next() was not called for trialing premium user");
});

test("isPremium: returns 403 when premium subscription has expired", () => {
  const req = {
    user: {
      plano: "premium",
      planoStatus: "active",
      planoExpiraEm: new Date("2020-01-01"),
    },
  };
  const res = mockRes();
  let nextCalled = false;

  isPremium(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 403);
  assert.ok(!nextCalled);
});

test("isPremium: returns 403 when plan status is not active or trialing", () => {
  const req = {
    user: {
      plano: "premium",
      planoStatus: "canceled",
      planoExpiraEm: null,
    },
  };
  const res = mockRes();
  let nextCalled = false;

  isPremium(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 403);
  assert.ok(!nextCalled);
});

// ─── checkPlan ────────────────────────────────────────────────────────────────

test("checkPlan: sets isPremium=false and plan=free when no user", () => {
  const req = {};
  const res = mockRes();
  let nextCalled = false;

  checkPlan(req, res, () => {
    nextCalled = true;
  });

  assert.equal(req.isPremium, false);
  assert.equal(req.plan, "free");
  assert.ok(nextCalled);
});

test("checkPlan: sets isPremium=true and plan=premium for active premium user", () => {
  const req = {
    user: { plano: "premium", planoStatus: "active", planoExpiraEm: null },
  };
  const res = mockRes();
  let nextCalled = false;

  checkPlan(req, res, () => {
    nextCalled = true;
  });

  assert.equal(req.isPremium, true);
  assert.equal(req.plan, "premium");
  assert.ok(nextCalled);
});

test("checkPlan: sets isPremium=false for free-plan user", () => {
  const req = {
    user: { plano: "free", planoStatus: "active", planoExpiraEm: null },
  };
  const res = mockRes();
  let nextCalled = false;

  checkPlan(req, res, () => {
    nextCalled = true;
  });

  assert.equal(req.isPremium, false);
  assert.equal(req.plan, "free");
  assert.ok(nextCalled);
});

test("checkPlan: sets isPremium=false when premium has expired", () => {
  const req = {
    user: {
      plano: "premium",
      planoStatus: "active",
      planoExpiraEm: new Date("2020-01-01"),
    },
  };
  const res = mockRes();
  let nextCalled = false;

  checkPlan(req, res, () => {
    nextCalled = true;
  });

  assert.equal(req.isPremium, false);
  assert.equal(req.plan, "free");
  assert.ok(nextCalled);
});

test("checkPlan: sets isPremium=true for trialing premium user", () => {
  const req = {
    user: { plano: "premium", planoStatus: "trialing", planoExpiraEm: null },
  };
  const res = mockRes();
  let nextCalled = false;

  checkPlan(req, res, () => {
    nextCalled = true;
  });

  assert.equal(req.isPremium, true);
  assert.equal(req.plan, "premium");
  assert.ok(nextCalled);
});
