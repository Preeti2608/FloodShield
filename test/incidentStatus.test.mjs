import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INCIDENT_STATUSES,
  isActiveIncident,
  getActiveIncidentsCount,
  matchesStatusFilter
} from '../src/utils/incidentStatus.js';

test('IncidentStatus: RESOLVED incident is NOT active', () => {
  const resolved = { id: 'INC-1', status: 'RESOLVED' };
  assert.equal(isActiveIncident(resolved), false);

  const lowerResolved = { id: 'INC-2', status: 'resolved' };
  assert.equal(isActiveIncident(lowerResolved), false);
});

test('IncidentStatus: UNVERIFIED, VERIFIED, and DISPATCHED incidents are active', () => {
  assert.equal(isActiveIncident({ id: 'INC-1', status: 'UNVERIFIED' }), true);
  assert.equal(isActiveIncident({ id: 'INC-2', status: 'SUBMITTED (UNVERIFIED BY SERVER)' }), true);
  assert.equal(isActiveIncident({ id: 'INC-3', status: 'VERIFIED' }), true);
  assert.equal(isActiveIncident({ id: 'INC-4', status: 'DISPATCHED' }), true);
  assert.equal(isActiveIncident(null), false);
  assert.equal(isActiveIncident({}), false);
});

test('IncidentStatus: getActiveIncidentsCount excludes RESOLVED incidents (Fixes bug: 2 records with 1 resolved must equal 1 active)', () => {
  // Exact scenario from the live DynamoDB database / bug report:
  const liveIncidents = [
    {
      id: 'INC-1791681812430-469',
      title: 'Verification Live Incident: Dadar TT Circle Inundation',
      status: 'RESOLVED',
      dataMode: 'LIVE_AWS_DYNAMODB'
    },
    {
      id: 'INC-1791681060341-511',
      title: 'Verification Live Incident: Dadar TT Circle Inundation',
      status: 'UNVERIFIED',
      dataMode: 'LIVE_AWS_DYNAMODB'
    }
  ];

  // Active count MUST be 1, not 2
  const activeCount = getActiveIncidentsCount(liveIncidents);
  assert.equal(activeCount, 1);
});

test('IncidentStatus: getActiveIncidentsCount handles empty or all-resolved lists', () => {
  assert.equal(getActiveIncidentsCount([]), 0);
  assert.equal(getActiveIncidentsCount([{ status: 'RESOLVED' }, { status: 'RESOLVED' }]), 0);
  assert.equal(getActiveIncidentsCount([{ status: 'UNVERIFIED' }, { status: 'DISPATCHED' }]), 2);
});

test('IncidentStatus: matchesStatusFilter properly filters all 5 categories', () => {
  const resolved = { id: 'INC-1', status: 'RESOLVED' };
  const unverified = { id: 'INC-2', status: 'UNVERIFIED' };
  const submittedLocal = { id: 'INC-3', status: 'SUBMITTED (UNVERIFIED BY SERVER)' };
  const verified = { id: 'INC-4', status: 'VERIFIED' };
  const dispatched = { id: 'INC-5', status: 'DISPATCHED' };

  // Filter 'ALL'
  assert.equal(matchesStatusFilter(resolved, 'ALL'), true);
  assert.equal(matchesStatusFilter(unverified, 'ALL'), true);
  assert.equal(matchesStatusFilter(submittedLocal, 'ALL'), true);
  assert.equal(matchesStatusFilter(verified, 'ALL'), true);
  assert.equal(matchesStatusFilter(dispatched, 'ALL'), true);

  // Filter 'UNVERIFIED'
  assert.equal(matchesStatusFilter(unverified, 'UNVERIFIED'), true);
  assert.equal(matchesStatusFilter(submittedLocal, 'UNVERIFIED'), true);
  assert.equal(matchesStatusFilter(resolved, 'UNVERIFIED'), false);
  assert.equal(matchesStatusFilter(verified, 'UNVERIFIED'), false);

  // Filter 'VERIFIED'
  assert.equal(matchesStatusFilter(verified, 'VERIFIED'), true);
  assert.equal(matchesStatusFilter(unverified, 'VERIFIED'), false);
  assert.equal(matchesStatusFilter(resolved, 'VERIFIED'), false);

  // Filter 'DISPATCHED'
  assert.equal(matchesStatusFilter(dispatched, 'DISPATCHED'), true);
  assert.equal(matchesStatusFilter(resolved, 'DISPATCHED'), false);

  // Filter 'RESOLVED'
  assert.equal(matchesStatusFilter(resolved, 'RESOLVED'), true);
  assert.equal(matchesStatusFilter(unverified, 'RESOLVED'), false);
  assert.equal(matchesStatusFilter(dispatched, 'RESOLVED'), false);
});
