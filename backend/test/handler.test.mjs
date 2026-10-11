import test from 'node:test';
import assert from 'node:assert/strict';
import { handler } from '../lambda/handler.mjs';

test('Handler: OPTIONS preflight returns 200 with CORS headers', async () => {
  const event = {
    requestContext: { http: { method: 'OPTIONS' } },
    rawPath: '/health'
  };
  const res = await handler(event);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Access-Control-Allow-Origin'], '*');
});

test('Handler: GET /health returns service status and region', async () => {
  const event = {
    requestContext: { http: { method: 'GET' } },
    rawPath: '/health'
  };
  const res = await handler(event);
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.equal(data.status, 'HEALTHY');
  assert.equal(data.service, 'FloodShield-Backend');
});

test('Handler: GET /risk calculates deterministic risk score and breakdown', async () => {
  const event = {
    requestContext: { http: { method: 'GET' } },
    rawPath: '/risk',
    queryStringParameters: { rainfall: '70', elevation: '4', drain: '30' }
  };
  const res = await handler(event);
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.ok(typeof data.riskScore === 'number');
  assert.ok(data.contributingFactors.length === 4);
  assert.ok(data.riskScore >= 50); // Heavy rain, low elevation, bad drainage = HIGH/CRITICAL
});

test('Handler: POST /reports rejects payload missing title or description', async () => {
  const event = {
    requestContext: { http: { method: 'POST' } },
    rawPath: '/reports',
    body: JSON.stringify({ location: 'Marine Drive' })
  };
  const res = await handler(event);
  assert.equal(res.statusCode, 400);
  const data = JSON.parse(res.body);
  assert.ok(data.error.includes('title'));
});

test('Handler: POST /assess returns tactical guidance with evidence summary', async () => {
  const event = {
    requestContext: { http: { method: 'POST' } },
    rawPath: '/assess',
    body: JSON.stringify({ prompt: 'Provide flood advice for Mumbai Central', locationId: 'LOC-1' })
  };
  const res = await handler(event);
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.ok(data.success === true);
  assert.ok(typeof data.advice === 'string');
  assert.ok(Array.isArray(data.evidence.facilities));
  assert.ok(Array.isArray(data.evidence.roadCorridors));
  assert.ok(data.disclaimer.includes('decision support'));
});

test('Handler: POST /scenarios/simulate calculates runoff and inundation depth', async () => {
  const event = {
    requestContext: { http: { method: 'POST' } },
    rawPath: '/scenarios/simulate',
    body: JSON.stringify({ rainfallRate: 100, surgeHeight: 2.0, drainEfficiency: 25, durationHours: 4 })
  };
  const res = await handler(event);
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.equal(data.simulated, true);
  assert.ok(data.outputs.peakDepthCm > 80);
  assert.equal(data.outputs.scenarioRiskLevel, 'CRITICAL');
});

test('Handler: Unknown route returns 404 with available routes listed', async () => {
  const event = {
    requestContext: { http: { method: 'GET' } },
    rawPath: '/nonexistent-endpoint'
  };
  const res = await handler(event);
  assert.equal(res.statusCode, 404);
  const data = JSON.parse(res.body);
  assert.ok(data.availableRoutes.length > 0);
});
