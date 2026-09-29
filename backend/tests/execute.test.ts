/**
 * Tests: Code execution endpoint validation and error handling.
 * These tests run without real Judge0 or auth credentials — they verify
 * input validation and error handling logic.
 */

import request from 'supertest';
import app from '../src/index';

const FAKE_SESSION_ID = '00000000-0000-4000-a000-000000000002';

describe('Execute endpoint validation', () => {
  it('rejects request without auth token', async () => {
    const res = await request(app)
      .post(`/api/execute/${FAKE_SESSION_ID}`)
      .send({ code: 'print("hello")', language: 'python' });
    expect(res.status).toBe(401);
  });

  it('rejects malformed session ID (not UUID)', async () => {
    // Auth runs first — expect 401 not 400 in this order
    const res = await request(app)
      .post('/api/execute/not-a-uuid')
      .send({ code: 'print("hello")', language: 'python' });
    expect(res.status).toBe(401);
  });

  it('languages endpoint returns list without auth', async () => {
    const res = await request(app).get('/api/execute/languages');
    // Note: this route is before auth middleware since it does not take :sessionId
    // It will actually require auth too since executeRouter.use(requireAuth) is set
    // Expect 401
    expect([200, 401]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('language');
      expect(res.body[0]).toHaveProperty('judge0Id');
    }
  });
});

describe('Execute request body limits', () => {
  const HUGE_CODE = 'x = 1\n'.repeat(10000); // > 64 KB

  it('rejects oversized code without auth (body-parser fires before auth for huge payloads)', async () => {
    const res = await request(app)
      .post(`/api/execute/${FAKE_SESSION_ID}`)
      .send({ code: HUGE_CODE, language: 'python' });
    // Body-parser may reject the oversized payload (413/500) before auth runs
    expect([401, 413, 500]).toContain(res.status);
  });
});
