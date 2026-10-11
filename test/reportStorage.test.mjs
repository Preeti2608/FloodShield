import test from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for Node.js environment
const memoryStore = new Map();
globalThis.localStorage = {
  getItem: (key) => memoryStore.get(key) || null,
  setItem: (key, val) => memoryStore.set(key, String(val)),
  removeItem: (key) => memoryStore.delete(key),
  clear: () => memoryStore.clear()
};

import {
  saveUserReport,
  getStoredReports,
  updateStoredReportStatus,
  clearStoredReports
} from '../src/utils/reportStorage.js';

test('ReportStorage: saveUserReport stores report with LOCAL STORAGE dataMode', () => {
  clearStoredReports();
  const input = {
    title: 'Waterlogged Underpass',
    location: 'Dadar East',
    lat: 19.018,
    lng: 72.845,
    waterDepthCm: 35,
    severity: 'HIGH',
    description: 'Cars stalling in water'
  };

  const res = saveUserReport(input);
  assert.equal(res.success, true);
  assert.equal(res.report.dataMode, 'USER-REPORTED · LOCAL STORAGE');
  assert.equal(res.report.status, 'SUBMITTED (UNVERIFIED BY SERVER)');

  const stored = getStoredReports();
  assert.equal(stored.length, 1);
  assert.equal(stored[0].title, 'Waterlogged Underpass');
});

test('ReportStorage: updateStoredReportStatus updates status and prepends action history', () => {
  const stored = getStoredReports();
  assert.ok(stored.length > 0);
  const reportId = stored[0].id;

  const updateRes = updateStoredReportStatus(reportId, 'RESOLVED', 'Responder marked resolved');
  assert.equal(updateRes.success, true);
  assert.equal(updateRes.updated, true);

  const updatedReports = getStoredReports();
  const target = updatedReports.find(r => r.id === reportId);
  assert.equal(target.status, 'RESOLVED');
  assert.ok(target.actionHistory.includes('Responder marked resolved'));
});

test('ReportStorage: updateStoredReportStatus returns updated: false for non-existent report', () => {
  const updateRes = updateStoredReportStatus('NON-EXISTENT-ID', 'VERIFIED', 'Action note');
  assert.equal(updateRes.success, true);
  assert.equal(updateRes.updated, false);
});
