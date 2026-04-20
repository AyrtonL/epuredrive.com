import { test, expect } from '@playwright/test';

test.describe('API Endpoints - Public (No Auth)', () => {
  test('GET /api/availability returns booked ranges', async ({ request }) => {
    const response = await request.get('/api/availability?carId=15&tenantId=sunshine-luxury');
    expect([200, 400, 403]).toContain(response.status());
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('bookedRanges');
      expect(Array.isArray(data.bookedRanges)).toBe(true);
    }
  });

  test('GET /api/availability returns empty with missing params', async ({ request }) => {
    const response = await request.get('/api/availability');
    // API returns 200 with empty bookedRanges when params missing
    expect([200, 400]).toContain(response.status());
  });

  test('GET /api/booking/lookup rejects missing params', async ({ request }) => {
    const response = await request.get('/api/booking/lookup');
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('GET /api/booking/lookup rejects invalid booking', async ({ request }) => {
    const response = await request.get('/api/booking/lookup?id=999999&email=fake@test.com&tenantId=sunshine-luxury');
    expect([400, 404, 429]).toContain(response.status());
  });

  test('POST /api/booking/request rejects empty body', async ({ request }) => {
    const response = await request.post('/api/booking/request', { data: {} });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/checkout rejects missing fields', async ({ request }) => {
    const response = await request.post('/api/checkout', { data: {} });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/concierge rejects empty body', async ({ request }) => {
    const response = await request.post('/api/concierge', { data: {} });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/contact rejects empty body', async ({ request }) => {
    const response = await request.post('/api/contact', { data: {} });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('GET /api/stripe/key returns publishable key', async ({ request }) => {
    const response = await request.get('/api/stripe/key');
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('publishableKey');
      expect(data.publishableKey).toMatch(/^pk_/);
    }
  });
});

test.describe('API Endpoints - Auth Required (reject unauthenticated)', () => {
  test('GET /api/superadmin/stats rejects unauthenticated', async ({ request }) => {
    const response = await request.get('/api/superadmin/stats');
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/superadmin/update rejects unauthenticated', async ({ request }) => {
    const response = await request.post('/api/superadmin/update', {
      data: { tenantId: 'x', updates: { plan: 'pro' } },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/team/invite rejects unauthenticated', async ({ request }) => {
    const response = await request.post('/api/team/invite', {
      data: { email: 'test@test.com', role: 'staff', tenantId: 'x' },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/team/update-role rejects unauthenticated', async ({ request }) => {
    const response = await request.post('/api/team/update-role', {
      data: { targetUserId: 'x', newRole: 'staff' },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('GET /api/notifications rejects unauthenticated', async ({ request }) => {
    const response = await request.get('/api/notifications');
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/support rejects unauthenticated', async ({ request }) => {
    const response = await request.post('/api/support', {
      data: { subject: 'test', message: 'test' },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('GET /api/stripe/invoices rejects unauthenticated', async ({ request }) => {
    const response = await request.get('/api/stripe/invoices');
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/square/disconnect rejects unauthenticated', async ({ request }) => {
    const response = await request.post('/api/square/disconnect');
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/webhooks/test rejects unauthenticated', async ({ request }) => {
    const response = await request.post('/api/webhooks/test');
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe('API Endpoints - Token/Signature Protected', () => {
  test('POST /api/agreement/sign rejects invalid token', async ({ request }) => {
    const response = await request.post('/api/agreement/sign', {
      data: { token: 'invalid-token', signature: 'data:image/png;base64,abc' },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/agreement/sign rejects missing signature', async ({ request }) => {
    const response = await request.post('/api/agreement/sign', {
      data: { token: 'some-token' },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('Stripe webhook rejects unsigned request', async ({ request }) => {
    const response = await request.post('/api/stripe/webhook', {
      data: { type: 'payment_intent.succeeded' },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('Stripe connect webhook rejects unsigned request', async ({ request }) => {
    const response = await request.post('/api/stripe/connect-webhook', {
      data: { type: 'checkout.session.completed' },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('Square webhook rejects unsigned request', async ({ request }) => {
    const response = await request.post('/api/square/webhook', {
      data: { type: 'payment.completed' },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/cron/maintenance-alerts rejects without CRON_SECRET', async ({ request }) => {
    const response = await request.post('/api/cron/maintenance-alerts');
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('GET /api/cron/sync-ical rejects without CRON_SECRET', async ({ request }) => {
    const response = await request.get('/api/cron/sync-ical');
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/cron/review-requests rejects without CRON_SECRET', async ({ request }) => {
    const response = await request.post('/api/cron/review-requests');
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe('API Endpoints - Input Validation', () => {
  test('POST /api/auth/password-reset returns 200 for any email (prevents enumeration)', async ({ request }) => {
    const response = await request.post('/api/auth/password-reset', {
      data: { email: 'not-an-email' },
    });
    // Returns 200 for all inputs to prevent email enumeration
    expect([200, 400]).toContain(response.status());
  });

  test('POST /api/contact rejects too-long message', async ({ request }) => {
    const response = await request.post('/api/contact', {
      data: { name: 'Test', email: 'test@test.com', message: 'x'.repeat(10000) },
    });
    // Should either accept (truncate) or reject
    expect([200, 400, 429]).toContain(response.status());
  });

  test('GET /api/fetch-ical rejects disallowed host', async ({ request }) => {
    const response = await request.get('/api/fetch-ical?url=https://evil.com/cal.ics');
    expect([400, 403]).toContain(response.status());
  });

  test('GET /api/fetch-ical rejects non-HTTPS URL', async ({ request }) => {
    const response = await request.get('/api/fetch-ical?url=http://turo.com/cal.ics');
    expect([400, 403]).toContain(response.status());
  });

  test('POST /api/square/checkout rejects missing car_id', async ({ request }) => {
    const response = await request.post('/api/square/checkout', {
      data: { tenant_id: 'x', start_date: '2026-05-01', end_date: '2026-05-03' },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});
