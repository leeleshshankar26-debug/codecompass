/**
 * Tests: Session ownership checks and access control.
 * Without a real Supabase token, all protected routes should return 401.
 */

import request from 'supertest';
import app from '../src/index';

const FAKE_SESSION_ID = '00000000-0000-4000-a000-000000000003';
const OTHER_USER_TOKEN = 'fake.token.for.other.user';

describe('Session access control', () => {
  it('GET /api/sessions returns 401 without token', async () => {
    const res = await request(app).get('/api/sessions');
    expect(res.status).toBe(401);
  });

  it('GET /api/sessions/:id returns 401 without token', async () => {
    const res = await request(app).get(`/api/sessions/${FAKE_SESSION_ID}`);
    expect(res.status).toBe(401);
  });

  it('PATCH /api/sessions/:id returns 401 without token', async () => {
    const res = await request(app)
      .patch(`/api/sessions/${FAKE_SESSION_ID}`)
      .send({ title: 'Hacked title' });
    expect(res.status).toBe(401);
  });

  it('DELETE /api/sessions/:id returns 401 without token', async () => {
    const res = await request(app).delete(`/api/sessions/${FAKE_SESSION_ID}`);
    expect(res.status).toBe(401);
  });

  it('POST /api/sessions/:id/code returns 401 without token', async () => {
    const res = await request(app)
      .patch(`/api/sessions/${FAKE_SESSION_ID}/code`)
      .send({ code: 'print("injected")', language: 'python' });
    expect(res.status).toBe(401);
  });

  it('Invalid token returns 401', async () => {
    const res = await request(app)
      .get(`/api/sessions/${FAKE_SESSION_ID}`)
      .set('Authorization', `Bearer ${OTHER_USER_TOKEN}`);
    expect(res.status).toBe(401);
  });
});

describe('Session validation', () => {
  it('GET /api/sessions/invalid-uuid returns 401 (auth before validation)', async () => {
    const res = await request(app).get('/api/sessions/invalid-uuid');
    // Auth middleware runs first, returns 401
    expect(res.status).toBe(401);
  });
});
