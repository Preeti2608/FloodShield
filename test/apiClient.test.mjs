import test from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for Node.js
const memoryStore = new Map();
globalThis.localStorage = {
  getItem: (key) => memoryStore.get(key) || null,
  setItem: (key, val) => memoryStore.set(key, String(val)),
  removeItem: (key) => memoryStore.delete(key),
  clear: () => memoryStore.clear()
};

// Set env before importing apiClient
process.env.VITE_API_BASE_URL = 'https://mock-api.floodshield.local';
process.env.VITE_USE_MOCK_DATA = 'false';

import { submitReport, getReports, updateReportStatus } from '../src/api/apiClient.js';
import { clearStoredReports, getStoredReports } from '../src/utils/reportStorage.js';
import { getIncidentProvenanceLabel } from '../src/utils/provenance.js';

test('apiClient: submitReport distinguishes successful AWS sync from local fallback', async () => {
  clearStoredReports();

  // 1. Successful AWS response
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return {
      ok: true,
      json: async () => ({
        success: true,
        dataMode: 'LIVE_AWS_DYNAMODB',
        ticket: {
          id: 'INC-AWS-1',
          title: 'AWS Report',
          status: 'UNVERIFIED',
          dataMode: 'LIVE_AWS_DYNAMODB'
        }
      })
    };
  };

  const cloudRes = await submitReport({
    title: 'AWS Synced Report',
    description: 'Flooding on highway',
    severity: 'HIGH'
  });

  assert.equal(cloudRes.success, true);
  assert.equal(cloudRes.persistedToCloud, true);
  assert.equal(cloudRes.dataMode, 'LIVE_AWS_DYNAMODB');
  assert.equal(cloudRes.ticket._source, 'AWS_API');
  assert.equal(getIncidentProvenanceLabel(cloudRes.ticket), 'AWS-SYNCED INCIDENT');

  // 2. AWS Failure (HTTP 500) -> Must NOT claim false cloud success
  globalThis.fetch = async () => {
    return {
      ok: false,
      status: 500,
      json: async () => ({ error: 'DynamoDB ProvisionedThroughputExceeded' })
    };
  };

  const failRes = await submitReport({
    title: 'Fallback Local Report',
    description: 'Local underpass flooding',
    severity: 'MEDIUM'
  });

  assert.equal(failRes.success, true); // Local saved
  assert.equal(failRes.persistedToCloud, false); // Cloud NOT saved
  assert.equal(failRes.cloudFailed, true);
  assert.ok(failRes.cloudError.includes('DynamoDB'));
  assert.equal(failRes.dataMode, 'USER-REPORTED · LOCAL STORAGE');
  assert.equal(getIncidentProvenanceLabel(failRes.ticket), 'LOCAL-ONLY INCIDENT');

  // Verify local storage actually contains the fallback report
  const stored = getStoredReports();
  assert.ok(stored.some(r => r.title === 'Fallback Local Report'));

  globalThis.fetch = originalFetch;
});

test('apiClient: updateReportStatus does not display false success on AWS failure', async () => {
  clearStoredReports();
  // Create a local report first
  const saveRes = await submitReport({
    title: 'Test Incident for Status Update',
    description: 'Water depth 20cm',
    severity: 'MEDIUM'
  });
  const reportId = saveRes.ticket.id;

  const originalFetch = globalThis.fetch;

  // Simulate AWS network failure
  globalThis.fetch = async () => {
    throw new Error('Connection refused to AWS API Gateway');
  };

  const updateRes = await updateReportStatus(reportId, 'VERIFIED', 'Verified by commander');

  // Must not claim cloud success
  assert.equal(updateRes.persistedToCloud, false);
  assert.equal(updateRes.cloudFailed, true);
  assert.ok(updateRes.error.includes('Connection refused'));

  // Local storage replica was updated as fallback
  const stored = getStoredReports();
  const found = stored.find(r => r.id === reportId);
  assert.equal(found.status, 'VERIFIED');
  assert.ok(found.actionHistory.includes('Verified by commander'));

  // Now simulate successful AWS response
  globalThis.fetch = async () => {
    return {
      ok: true,
      json: async () => ({
        success: true,
        report: { id: reportId, status: 'DISPATCHED' }
      })
    };
  };

  const cloudUpdateRes = await updateReportStatus(reportId, 'DISPATCHED', 'Dispatched unit 4');
  assert.equal(cloudUpdateRes.success, true);
  assert.equal(cloudUpdateRes.persistedToCloud, true);
  assert.equal(cloudUpdateRes.dataMode, 'LIVE_AWS_DYNAMODB');

  globalThis.fetch = originalFetch;
});

test('apiClient: getReports marks provenance on all fetched reports', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return {
      ok: true,
      json: async () => ({
        reports: [
          {
            id: 'INC-AWS-RESOLVED',
            title: 'Dadar Inundation',
            status: 'RESOLVED',
            dataMode: 'LIVE_AWS_DYNAMODB'
          },
          {
            id: 'INC-AWS-ACTIVE',
            title: 'Sion Inundation',
            status: 'UNVERIFIED',
            dataMode: 'LIVE_AWS_DYNAMODB'
          }
        ],
        dataMode: 'LIVE_AWS_DYNAMODB'
      })
    };
  };

  const res = await getReports('ALL');
  assert.equal(res.reports.length, 2);
  assert.equal(res.dataMode, 'LIVE_AWS_DYNAMODB');
  assert.equal(getIncidentProvenanceLabel(res.reports[0]), 'AWS-SYNCED INCIDENT');
  assert.equal(getIncidentProvenanceLabel(res.reports[1]), 'AWS-SYNCED INCIDENT');

  globalThis.fetch = originalFetch;
});
