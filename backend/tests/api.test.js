// Run with:  npm install && npm test
// These tests need no database or ML service (they only exercise routing,
// validation and authentication checks that happen before any I/O).
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../src/app");

test("unknown route returns a JSON 404", async () => {
  const response = await request(app).get("/api/does-not-exist");
  assert.equal(response.status, 404);
  assert.match(response.body.error, /Route not found/);
});

test("register validation returns per-field details", async () => {
  const response = await request(app)
    .post("/api/auth/register")
    .send({ name: "A", email: "not-an-email", password: "short" });
  assert.equal(response.status, 400);
  const paths = response.body.details.map((item) => item.path);
  assert.ok(paths.includes("name") && paths.includes("email") && paths.includes("password"));
});

test("password longer than 72 bytes is rejected", async () => {
  const response = await request(app)
    .post("/api/auth/register")
    .send({ name: "Ada", email: "ada@example.com", password: "x".repeat(73) });
  assert.equal(response.status, 400);
  assert.ok(response.body.details.some((item) => item.path === "password"));
});

test("recommend requires a token", async () => {
  const response = await request(app).post("/api/recommend").send({});
  assert.equal(response.status, 401);
});

test("an invalid token is rejected", async () => {
  const response = await request(app)
    .post("/api/recommend")
    .set("Authorization", "Bearer not-a-jwt")
    .send({});
  assert.equal(response.status, 401);
});

test("malformed JSON returns 400, not 500", async () => {
  const response = await request(app)
    .post("/api/auth/login")
    .set("Content-Type", "application/json")
    .send("{bad json");
  assert.equal(response.status, 400);
});
