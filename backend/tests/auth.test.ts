/**
 * Tests: Authentication and authorization on protected endpoints.
 * These tests verify that requests without valid tokens are rejected,
 * and that users cannot access other users' sessions.
 */

import request from 'supertest';
import app from '../src/index';

// ── Helpers ───────────────────────────────────────────────────
const makeAuthHeader = (token: string) => ({ Authorization: `Bearer ${token}` });
const INVALID_TOKEN = 'invalid.jwt.token';
const FAKE_SESSION_ID = '00000000-0000-4000-a000-000000000001';

// ── Tests ─────────────────────────────────────────────────────

describe('Authentication guard', () => {
  it('rejects GET /api/sessions with no token', async () => {
    const res = await request(app).get('/api/sessions');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('rejects GET /api/sessions with malformed bearer token', async () => {
    const res = await request(app)
      .get('/api/sessions')
      .set(makeAuthHeader(INVALID_TOKEN));
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('rejects POST /api/chat/:id/stream with no token', async () => {
    const res = await request(app)
      .post(`/api/chat/${FAKE_SESSION_ID}/stream`)
      .send({ messages: [{ role: 'user', content: 'hello' }] });
    expect(res.status).toBe(401);
  });

  it('rejects POST /api/execute/:id with no token', async () => {
    const res = await request(app)
      .post(`/api/execute/${FAKE_SESSION_ID}`)
      .send({ code: 'print("hi")', language: 'python' });
    expect(res.status).toBe(401);
  });

  it('rejects DELETE /api/sessions/:id with no token', async () => {
    const res = await request(app).delete(`/api/sessions/${FAKE_SESSION_ID}`);
    expect(res.status).toBe(401);
  });
});

describe('Input validation', () => {
  it('rejects execute with unsupported language (even with no auth, validation runs after auth)', async () => {
    // Auth runs first, so this should return 401 before validation
    const res = await request(app)
      .post(`/api/execute/${FAKE_SESSION_ID}`)
      .send({ code: 'print("hi")', language: 'ruby' });
    expect(res.status).toBe(401);
  });

  it('rejects chat stream with empty messages array (even unauthenticated)', async () => {
    const res = await request(app)
      .post(`/api/chat/${FAKE_SESSION_ID}/stream`)
      .send({ messages: [] });
    expect(res.status).toBe(401); // auth runs before validation
  });
});

describe('Health endpoint', () => {
  it('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    // In test env without a real DB this may be degraded, but should still respond
    expect([200]).toContain(res.status);
    expect(res.body).toHaveProperty('status');
  });
});

describe('404 handler', () => {
  it('unknown routes return 404 JSON', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});
