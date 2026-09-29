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
      const [cList, aList, eList, fpList] = await Promise.all([
        camerasService.getAll(),
        alertsService.getAll(),
        eventsService.getAll(),
        friendlyPersonsService.getAll(),
      ]);

      setCameras(cList);
      setAlerts(aList);
      setEvents(eList);
      setFriendlyPersons(fpList);

      if (!selectedCamera && cList.length > 0) {
        setSelectedCamera(cList[0]);
      }

      const activeAlerts = aList.filter(a => a.status === 'ACTIVE').length;
      const onlineCameras = cList.filter(c => c.status === 'ONLINE').length;

      setUnreadAlertsCount(activeAlerts);
      setStats({
        activeCameras: onlineCameras,
        totalCameras: cList.length,
        peopleDetectedToday: Math.max(308, cList.reduce((acc, c) => acc + (c.detections24h || 0), 0) + 120),
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

  // Simulated AI Detections Pulse
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setCameras(prevCameras => {
        return prevCameras.map(cam => {
          if (cam.status !== 'ONLINE' || !cam.activeDetections?.length) return cam;
          
          const updatedDetections = cam.activeDetections.map(det => {
            const dx = (Math.random() - 0.5) * 3;
            const dy = (Math.random() - 0.5) * 2;
            const nextX = Math.max(5, Math.min(80, (det.bbox?.x || 40) + dx));
            const nextY = Math.max(10, Math.min(75, (det.bbox?.y || 40) + dy));
            return {
              ...det,
              bbox: {
                ...det.bbox,
                x: Number(nextX.toFixed(1)),
                y: Number(nextY.toFixed(1))
              }
            };
          });

          return { ...cam, activeDetections: updatedDetections };
        });
      });
    }, 1800);

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

    const randomCam = cameras.find(c => c.status === 'ONLINE') || cameras[0] || { id: 'CAM-BOP-01', name: 'BOP-01 Forward Post' };

    const newAlert = await alertsService.create({
      type: pick.type,
      camera: randomCam.name,
      cameraId: randomCam.id,
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
    await auditLogsService.log('AI Alarm Triggered', `${pick.type} detected at ${randomCam.name}`, 'AI Engine', 'SYSTEM');
  }, [cameras, playAlertSound]);

  const acknowledgeAlert = async (alertId, actionNote = 'Acknowledged by operator') => {
    const updated = await alertsService.updateStatus(alertId, 'IN_REVIEW', actionNote);
    if (updated) {
      setAlerts(prev => prev.map(a => a.id === alertId ? updated : a));
    }
    await auditLogsService.log('Alert Acknowledged', `Alert ID #${alertId} set to In Review`, 'Commander', 'COMMANDER');
  };

  const resolveAlert = async (alertId, resolutionNote = 'Threat verified & cleared') => {
    const updated = await alertsService.updateStatus(alertId, 'RESOLVED', resolutionNote);
    if (updated) {
      setAlerts(prev => prev.map(a => a.id === alertId ? updated : a));
      setUnreadAlertsCount(prev => Math.max(0, prev - 1));
    }
    await auditLogsService.log('Alert Resolved', `Alert ID #${alertId} marked as RESOLVED`, 'Commander', 'COMMANDER');
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
