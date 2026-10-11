import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PROVENANCE_LABELS,
  getIncidentProvenanceLabel,
  getProvenanceBadgeClass
} from '../src/utils/provenance.js';

test('Provenance: AWS DynamoDB dataMode is labelled AWS-SYNCED INCIDENT', () => {
  const incident = {
    id: 'INC-1791681812430-469',
    title: 'Verification Live Incident: Dadar TT Circle Inundation',
    dataMode: 'LIVE_AWS_DYNAMODB',
    status: 'RESOLVED'
  };

  const label = getIncidentProvenanceLabel(incident);
  assert.equal(label, PROVENANCE_LABELS.AWS_SYNCED);
  assert.equal(label, 'AWS-SYNCED INCIDENT');
  assert.equal(getProvenanceBadgeClass(label), 'badge-lime');
});

test('Provenance: Explicit AWS API _source is labelled AWS-SYNCED INCIDENT', () => {
  const incident = {
    id: 'INC-100',
    title: 'Cloud Report',
    _source: 'AWS_API'
  };

  const label = getIncidentProvenanceLabel(incident);
  assert.equal(label, 'AWS-SYNCED INCIDENT');
});

test('Provenance: Local storage dataMode is labelled LOCAL-ONLY INCIDENT', () => {
  const incident = {
    id: 'INC-LOCAL-1',
    title: 'Waterlogging near station',
    dataMode: 'USER-REPORTED · LOCAL STORAGE',
    status: 'SUBMITTED (UNVERIFIED BY SERVER)'
  };

  const label = getIncidentProvenanceLabel(incident);
  assert.equal(label, PROVENANCE_LABELS.LOCAL_ONLY);
  assert.equal(label, 'LOCAL-ONLY INCIDENT');
  assert.equal(getProvenanceBadgeClass(label), 'badge-orange');
});

test('Provenance: Explicit LOCAL_STORAGE _source is labelled LOCAL-ONLY INCIDENT', () => {
  const incident = {
    id: 'INC-LOCAL-2',
    title: 'Local Report',
    _source: 'LOCAL_STORAGE'
  };

  const label = getIncidentProvenanceLabel(incident);
  assert.equal(label, 'LOCAL-ONLY INCIDENT');
});

test('Provenance: Unverified / missing dataMode is labelled SOURCE UNVERIFIED', () => {
  assert.equal(getIncidentProvenanceLabel(null), 'SOURCE UNVERIFIED');
  assert.equal(getIncidentProvenanceLabel({}), 'SOURCE UNVERIFIED');
  assert.equal(getIncidentProvenanceLabel({ dataMode: 'UNKNOWN_SOURCE' }), 'SOURCE UNVERIFIED');
  assert.equal(getIncidentProvenanceLabel({ dataMode: null }), 'SOURCE UNVERIFIED');
  assert.equal(getProvenanceBadgeClass('SOURCE UNVERIFIED'), 'badge-grey');
});

test('Provenance: Local reports are never marked as AWS-synced merely because API is reachable', () => {
  const localReportWithApiNote = {
    id: 'INC-LOCAL-3',
    title: 'Local report saved during API uptime',
    dataMode: 'USER-REPORTED · LOCAL STORAGE'
  };

  const label = getIncidentProvenanceLabel(localReportWithApiNote);
  assert.notEqual(label, 'AWS-SYNCED INCIDENT');
  assert.equal(label, 'LOCAL-ONLY INCIDENT');
});
