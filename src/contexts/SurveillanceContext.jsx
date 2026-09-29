import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { camerasService } from '../services/camerasService';
import { alertsService } from '../services/alertsService';
import { eventsService } from '../services/eventsService';
import { friendlyPersonsService } from '../services/friendlyPersonsService';
import { auditLogsService } from '../services/auditLogsService';

const SurveillanceContext = createContext(null);

export function SurveillanceProvider({ children }) {
  const [cameras, setCameras] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [events, setEvents] = useState([]);
  const [friendlyPersons, setFriendlyPersons] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [isSimulating, setIsSimulating] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('CONNECTED');
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  const [recentNotification, setRecentNotification] = useState(null);
  const [stats, setStats] = useState({
    activeCameras: 5,
    totalCameras: 6,
    peopleDetectedToday: 308,
    vehiclesDetectedToday: 89,
    activeAlerts: 4,
    friendlyPersonsRegistered: 6,
    eventsToday: 397
  });

  // Load all datasets from Supabase / Services
  const refreshAll = useCallback(async () => {
    try {
      const [cRes, aRes, eRes, fpRes] = await Promise.all([
        camerasService.getAll(),
        alertsService.getAll(),
        eventsService.getAll(),
        friendlyPersonsService.getAll(),
      ]);

      const cList = Array.isArray(cRes) ? cRes : (cRes?.data || []);
      const aList = Array.isArray(aRes) ? aRes : (aRes?.data || []);
      const eList = Array.isArray(eRes) ? eRes : (eRes?.data || []);
      const fpList = Array.isArray(fpRes) ? fpRes : (fpRes?.data || []);

      // Default mock detections seeded for realism if empty
      const enrichedCameras = cList.map((cam, idx) => {
        if (!cam.activeDetections || cam.activeDetections.length === 0) {
          const sampleDetections = [];
          if (idx === 0) {
            sampleDetections.push(
              {
                camera_id: cam.cameraCode || 'BOP-001',
                track_id: 'P-104',
                object_type: 'person',
                confidence: 0.96,
                bbox: { x: 22, y: 32, w: 18, h: 44 },
                identity: null,
                friendly: false,
                timestamp: new Date().toISOString()
              },
              {
                camera_id: cam.cameraCode || 'BOP-001',
                track_id: 'P-042',
                person_id: fpList[0]?.personCode || 'BSF-1024',
                object_type: 'person',
                confidence: 0.97,
                face_match: 0.97,
                bbox: { x: 62, y: 30, w: 18, h: 46 },
                identity: fpList[0]?.fullName || 'Arun Kumar',
                friendly: true,
                status: 'FRIENDLY',
                timestamp: new Date().toISOString()
              }
            );
          } else if (idx === 1) {
            sampleDetections.push(
              {
                camera_id: cam.cameraCode || 'BOP-002',
                track_id: 'V-021',
                object_type: 'vehicle',
                confidence: 0.91,
                bbox: { x: 35, y: 45, w: 32, h: 32 },
                identity: null,
                friendly: false,
                timestamp: new Date().toISOString()
              }
            );
          } else if (idx === 2) {
            sampleDetections.push(
              {
                camera_id: cam.cameraCode || 'BOP-003',
                track_id: 'U-312',
                object_type: 'unknown',
                confidence: 0.89,
                bbox: { x: 45, y: 28, w: 16, h: 42 },
                identity: null,
                friendly: false,
                timestamp: new Date().toISOString()
              }
            );
          } else if (idx === 3) {
            sampleDetections.push(
              {
                camera_id: cam.cameraCode || 'BOP-004',
                track_id: 'P-208',
                object_type: 'person',
                confidence: 0.94,
                bbox: { x: 18, y: 38, w: 17, h: 43 },
                identity: null,
                friendly: false,
                timestamp: new Date().toISOString()
              }
            );
          }
          return { ...cam, activeDetections: sampleDetections };
        }
        return cam;
      });

      setCameras(enrichedCameras);
      setAlerts(aList);
      setEvents(eList);
      setFriendlyPersons(fpList);

      if (!selectedCamera && enrichedCameras.length > 0) {
        setSelectedCamera(enrichedCameras[0]);
      }

      const activeAlerts = aList.filter(a => a.status === 'ACTIVE').length;
      const onlineCameras = enrichedCameras.filter(c => c.status === 'ONLINE').length;

      setUnreadAlertsCount(activeAlerts);
      setStats({
        activeCameras: onlineCameras,
        totalCameras: enrichedCameras.length,
        peopleDetectedToday: Math.max(308, enrichedCameras.reduce((acc, c) => acc + (c.detections24h || 0), 0) + 120),
        vehiclesDetectedToday: Math.max(89, Math.round(eList.filter(e => e.targetType === 'VEHICLE').length * 15 + 40)),
        activeAlerts: activeAlerts,
        friendlyPersonsRegistered: fpList.length,
        eventsToday: Math.max(397, eList.length * 12 + 150)
      });
    } catch (err) {
      console.error('Failed to load surveillance data:', err);
    }
  }, [selectedCamera]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Tactical Web Audio alert chime
  const playAlertSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.26);
    } catch {}
  }, [soundEnabled]);

  // Simulated AI Detections Pulse & Smooth Tracking
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setCameras(prevCameras => {
        return prevCameras.map(cam => {
          if (cam.status !== 'ONLINE' || !cam.activeDetections?.length) return cam;
          
          const updatedDetections = cam.activeDetections.map(det => {
            const dx = (Math.random() - 0.5) * 2.5;
            const dy = (Math.random() - 0.5) * 1.8;
            const currentX = typeof det.bbox?.x === 'number' ? det.bbox.x : (Array.isArray(det.bbox) ? det.bbox[0] : 40);
            const currentY = typeof det.bbox?.y === 'number' ? det.bbox.y : (Array.isArray(det.bbox) ? det.bbox[1] : 40);
            const currentW = typeof det.bbox?.w === 'number' ? det.bbox.w : (Array.isArray(det.bbox) ? det.bbox[2] : 18);
            const currentH = typeof det.bbox?.h === 'number' ? det.bbox.h : (Array.isArray(det.bbox) ? det.bbox[3] : 40);

            const nextX = Math.max(5, Math.min(80, currentX + dx));
            const nextY = Math.max(15, Math.min(65, currentY + dy));

            return {
              ...det,
              bbox: {
                x: Number(nextX.toFixed(1)),
                y: Number(nextY.toFixed(1)),
                w: currentW,
                h: currentH
              }
            };
          });

          return { ...cam, activeDetections: updatedDetections };
        });
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isSimulating]);

  // Trigger alert simulation
  const triggerSimulatedAlert = useCallback(async (customType) => {
    const types = [
      { type: 'Virtual Fence Breach', severity: 'CRITICAL', label: 'Perimeter Tripwire Triggered', loc: 'West Sector Riverbank' },
      { type: 'Unknown Person', severity: 'WARNING', label: 'Unrecognized Subject in Buffer Corridor', loc: 'East Sector Ridge' },
      { type: 'Night Movement', severity: 'CRITICAL', label: 'Infrared Motion at Border Wire', loc: 'North Sector Post Alpha' },
      { type: 'Vehicle Detected', severity: 'WARNING', label: 'Unregistered Vehicle on Perimeter Track', loc: 'South Checkpost Charlie' },
    ];

    const pick = customType 
      ? types.find(t => t.type.toLowerCase().includes(customType.toLowerCase())) || types[0]
      : types[Math.floor(Math.random() * types.length)];

    const randomCam = cameras.find(c => c.status === 'ONLINE') || cameras[0] || { id: 'CAM-BOP-01', cameraCode: 'BOP-001', name: 'BOP-01 Forward Post' };

    const newAlert = await alertsService.create({
      type: pick.type,
      camera: randomCam.name,
      cameraId: randomCam.id || randomCam.cameraCode,
      location: pick.loc,
      severity: pick.severity,
      confidence: `${(89 + Math.random() * 10).toFixed(1)}%`,
      detectionTarget: `AI-ID #${Math.floor(100 + Math.random() * 900)}`,
      description: `Automated YOLOv8 + ByteTrack spatial alarm: ${pick.label}.`,
      assignedUnit: 'Rapid Response Unit 1',
      actionTaken: 'Audio warning emitted, sentry notified.',
      threatLevel: pick.severity === 'CRITICAL' ? 'High Risk' : 'Moderate',
    });

    const newEvent = await eventsService.create({
      eventType: pick.type,
      camera: randomCam.name,
      targetId: `SUBJ-${Math.floor(1000 + Math.random() * 9000)}`,
      targetType: pick.type.includes('Vehicle') ? 'VEHICLE' : 'PERSON',
      severity: pick.severity,
      location: pick.loc,
      confidence: `${(90 + Math.random() * 9).toFixed(1)}%`,
      evidenceType: 'Thermal High-Res Frame Capture',
      actionTaken: 'Automatic Alarm & Sentry Notification',
      operator: 'Automated AI Pipeline'
    });

    setAlerts(prev => [newAlert, ...prev]);
    setEvents(prev => [newEvent, ...prev]);
    setUnreadAlertsCount(prev => prev + 1);

    setRecentNotification({
      id: newAlert.id,
      title: `${pick.severity === 'CRITICAL' ? 'CRITICAL ALERT' : 'WARNING'}: ${pick.type}`,
      message: `${randomCam.name} — ${pick.loc}`,
      timestamp: new Date().toISOString(),
      severity: pick.severity,
    });

    playAlertSound();
    await auditLogsService.log('AI Alarm Triggered', 'ALERT', newAlert.id, `${pick.type} detected at ${randomCam.name}`, 'AI Engine', 'SYSTEM');
  }, [cameras, playAlertSound]);

  // Supabase Realtime Subscriptions for alerts & events
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    try {
      const channel = supabase
        .channel('realtime-alerts-events')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'alerts' },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newAlert = alertsService.getById ? payload.new : payload.new;
              const formatted = {
                id: payload.new.id,
                type: payload.new.alert_type || payload.new.type || 'Security Alert',
                alertType: payload.new.alert_type || payload.new.type || 'Security Alert',
                severity: (payload.new.severity || 'WARNING').toUpperCase(),
                camera: payload.new.camera_name || payload.new.camera_id || 'BOP-001',
                cameraId: payload.new.camera_id || 'BOP-001',
                location: payload.new.location || 'Perimeter',
                description: payload.new.description || 'Intrusion signal',
                status: (payload.new.status || 'ACTIVE').toUpperCase(),
                evidenceUrl: payload.new.evidence_url || null,
                detectedAt: payload.new.detected_at || payload.new.created_at || new Date().toISOString(),
                createdAt: payload.new.created_at || new Date().toISOString(),
                confidence: payload.new.confidence || '94%'
              };
              setAlerts(prev => [formatted, ...prev.filter(a => a.id !== formatted.id)]);
              setUnreadAlertsCount(prev => prev + 1);
              setRecentNotification({
                id: formatted.id,
                title: `${formatted.severity === 'CRITICAL' ? 'CRITICAL ALERT' : 'SECURITY ALERT'}: ${formatted.type}`,
                message: `${formatted.camera} — ${formatted.location}`,
                timestamp: new Date().toISOString(),
                severity: formatted.severity,
              });
              playAlertSound();
            } else if (payload.eventType === 'UPDATE') {
              setAlerts(prev => prev.map(a => a.id === payload.new.id ? {
                ...a,
                status: (payload.new.status || a.status).toUpperCase(),
                actionTaken: payload.new.action_taken || a.actionTaken
              } : a));
            } else if (payload.eventType === 'DELETE') {
              setAlerts(prev => prev.filter(a => a.id !== payload.old.id));
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'events' },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newEvt = {
                id: payload.new.id,
                eventType: payload.new.event_type || 'Perimeter Event',
                camera: payload.new.camera_name || payload.new.camera_id || 'BOP-001',
                cameraId: payload.new.camera_id || 'BOP-001',
                personId: payload.new.person_id || null,
                objectType: payload.new.object_type || 'PERSON',
                targetType: payload.new.object_type || 'PERSON',
                objectId: payload.new.object_id || 'OBJ-01',
                targetId: payload.new.object_id || 'OBJ-01',
                confidence: payload.new.confidence || '95%',
                location: payload.new.location || 'Perimeter',
                evidenceUrl: payload.new.evidence_url || null,
                metadata: payload.new.metadata || {},
                detectedAt: payload.new.detected_at || payload.new.created_at || new Date().toISOString(),
                createdAt: payload.new.created_at || new Date().toISOString(),
                severity: (payload.new.severity || 'INFO').toUpperCase(),
                status: (payload.new.status || 'VERIFIED').toUpperCase()
              };
              setEvents(prev => [newEvt, ...prev.filter(e => e.id !== newEvt.id)]);
            } else if (payload.eventType === 'UPDATE') {
              setEvents(prev => prev.map(e => e.id === payload.new.id ? { ...e, ...payload.new } : e));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn('Realtime subscription error:', err);
    }
  }, [playAlertSound]);

  const acknowledgeAlert = async (alertId, actionNote = 'Acknowledged by operator', user = 'Commander Rawat', userRole = 'ADMIN', userId = null) => {
    const updated = await alertsService.updateStatus(alertId, 'ACKNOWLEDGED', actionNote);
    if (updated) {
      setAlerts(prev => prev.map(a => a.id === alertId ? updated : a));
    }
    await auditLogsService.log('Alert Acknowledged', 'ALERT', alertId, actionNote || 'Status set to ACKNOWLEDGED', user, userRole, userId);
  };

  const resolveAlert = async (alertId, resolutionNote = 'Threat verified & cleared', user = 'Commander Rawat', userRole = 'ADMIN', userId = null) => {
    const updated = await alertsService.updateStatus(alertId, 'RESOLVED', resolutionNote);
    if (updated) {
      setAlerts(prev => prev.map(a => a.id === alertId ? updated : a));
      setUnreadAlertsCount(prev => Math.max(0, prev - 1));
    }
    await auditLogsService.log('Alert Resolved', 'ALERT', alertId, resolutionNote || 'Status set to RESOLVED', user, userRole, userId);
  };

  const clearNotification = () => setRecentNotification(null);

  return (
    <SurveillanceContext.Provider
      value={{
        cameras,
        alerts,
        events,
        friendlyPersons,
        stats,
        selectedCamera,
        setSelectedCamera,
        isSimulating,
        setIsSimulating,
        soundEnabled,
        setSoundEnabled,
        connectionStatus,
        setConnectionStatus,
        unreadAlertsCount,
        recentNotification,
        clearNotification,
        triggerSimulatedAlert,
        acknowledgeAlert,
        resolveAlert,
        refreshAll,
        playAlertSound,
      }}
    >
      {children}
    </SurveillanceContext.Provider>
  );
}

export function useSurveillance() {
  const context = useContext(SurveillanceContext);
  if (!context) {
    throw new Error('useSurveillance must be used within a SurveillanceProvider');
  }
  return context;
}
