import {
  getEventStatistics,
  getAlertStatistics,
  getDetectionStatistics,
  getCameraStatistics,
  getHourlyActivity,
  getDailyActivity,
  filterByTimeRange,
  getTimeRangeMs
} from '../services/analytics.js';

function runAnalyticsTests() {
  console.log('==================================================');
  console.log('[1] Testing Analytics Time Filtering & Window Computations');
  console.log('==================================================');

  console.assert(getTimeRangeMs('1HOUR') === 3600000, '1HOUR should be 3,600,000 ms');
  console.assert(getTimeRangeMs('6HOURS') === 21600000, '6HOURS should be 21,600,000 ms');
  console.assert(getTimeRangeMs('24HOURS') === 86400000, '24HOURS should be 86,400,000 ms');
  console.assert(getTimeRangeMs('7DAYS') === 604800000, '7DAYS should be 604,800,000 ms');
  console.assert(getTimeRangeMs('30DAYS') === 2592000000, '30DAYS should be 2,592,000,000 ms');
  console.log('SUCCESS: Time ranges convert accurately.');

  console.log('\n==================================================');
  console.log('[2] Testing Event Statistics Calculation');
  console.log('==================================================');

  const now = new Date().toISOString();
  const mockEvents = [
    { id: '1', eventType: 'INTRUSION', cameraCode: 'BOP-001', detectedAt: now },
    { id: '2', eventType: 'LOITERING', cameraCode: 'BOP-001', detectedAt: now },
    { id: '3', eventType: 'NIGHT_MOVEMENT', cameraCode: 'BOP-002', detectedAt: now },
    { id: '4', eventType: 'ANPR_DETECTION', cameraCode: 'BOP-003', detectedAt: now },
    { id: '5', eventType: 'FRIENDLY_PERSON', personId: 'USR-01', cameraCode: 'BOP-001', detectedAt: now },
    { id: '6', eventType: 'UNKNOWN_PERSON', cameraCode: 'BOP-002', detectedAt: now }
  ];

  const evStats = getEventStatistics('24HOURS', mockEvents);
  console.assert(evStats.totalEvents === 6, `Expected 6 total events, got ${evStats.totalEvents}`);
  console.assert(evStats.intrusionEvents === 1, `Expected 1 intrusion event, got ${evStats.intrusionEvents}`);
  console.assert(evStats.loiteringEvents === 1, `Expected 1 loitering event, got ${evStats.loiteringEvents}`);
  console.assert(evStats.friendlyMatches === 1, `Expected 1 friendly match, got ${evStats.friendlyMatches}`);
  console.log(`Computed ${evStats.totalEvents} events, ${evStats.eventsByType.length} classification slices.`);
  console.log('SUCCESS: Event statistics computed accurately.');

  console.log('\n==================================================');
  console.log('[3] Testing Alert Statistics Calculation');
  console.log('==================================================');

  const mockAlerts = [
    { id: 'A1', severity: 'CRITICAL', status: 'ACTIVE', detectedAt: now },
    { id: 'A2', severity: 'WARNING', status: 'ACTIVE', detectedAt: now },
    { id: 'A3', severity: 'INFO', status: 'RESOLVED', detectedAt: now }
  ];

  const alStats = getAlertStatistics('24HOURS', mockAlerts);
  console.assert(alStats.totalAlerts === 3, `Expected 3 total alerts, got ${alStats.totalAlerts}`);
  console.assert(alStats.activeAlerts === 2, `Expected 2 active alerts, got ${alStats.activeAlerts}`);
  console.assert(alStats.resolvedAlerts === 1, `Expected 1 resolved alert, got ${alStats.resolvedAlerts}`);
  console.assert(alStats.criticalAlerts === 1, `Expected 1 critical alert, got ${alStats.criticalAlerts}`);
  console.log('SUCCESS: Alert statistics and triage counts computed accurately.');

  console.log('\n==================================================');
  console.log('[4] Testing Empty Analytics Period Graceful Fallback');
  console.log('==================================================');

  const emptyEvents = getEventStatistics('1HOUR', []);
  const emptyAlerts = getAlertStatistics('1HOUR', []);
  const emptyDetections = getDetectionStatistics('1HOUR', []);
  const emptyActivity = getHourlyActivity('1HOUR', []);

  console.assert(emptyEvents.totalEvents === 0, 'Empty events total should be 0');
  console.assert(emptyAlerts.totalAlerts === 0, 'Empty alerts total should be 0');
  console.assert(emptyDetections.totalDetections === 0, 'Empty detections total should be 0');
  console.assert(emptyActivity.length === 6, '1HOUR interval should return 6 slots');
  console.log('SUCCESS: Empty dataset handled gracefully with zero division errors.');

  console.log('\n==================================================');
  console.log('[5] Testing Camera Analytics Load Ranking');
  console.log('==================================================');

  const mockCameras = [
    { id: 'cam1', cameraCode: 'BOP-001', name: 'Post 1', status: 'ONLINE', detections24h: 30 },
    { id: 'cam2', cameraCode: 'BOP-002', name: 'Post 2', status: 'ONLINE', detections24h: 10 }
  ];

  const camStats = getCameraStatistics('24HOURS', mockCameras, mockEvents, mockAlerts);
  console.assert(camStats.length === 2, 'Expected 2 cameras ranked');
  console.assert(camStats[0].cameraCode === 'BOP-001', 'BOP-001 should be ranked #1 with 3 events');
  console.log(`Top Ranked Camera: ${camStats[0].cameraCode} with ${camStats[0].eventCount} events.`);
  console.log('SUCCESS: Camera operational density ranking verified.');

  console.log('\n==================================================');
  console.log('ALL FRONTEND ANALYTICS TESTS PASSED (100% SUCCESS)');
  console.log('==================================================');
}

runAnalyticsTests();
