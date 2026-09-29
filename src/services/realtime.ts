/**
 * Supabase Realtime Telemetry & Live Alert Synchronization Service
 * Handles live PostgreSQL CDC streaming for alerts, events, and camera status changes.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { normalizeAlert } from './alertsService';
import { normalizeEvent } from './eventsService';

export type RealtimeConnectionState = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'ERROR';

export interface RealtimeListener {
  onNewAlert?: (alert: any) => void;
  onAlertUpdated?: (alert: any) => void;
  onAlertDeleted?: (alertId: string) => void;
  onNewEvent?: (event: any) => void;
  onEventUpdated?: (event: any) => void;
  onCameraStatusChange?: (camera: any) => void;
  onConnectionStateChange?: (state: RealtimeConnectionState, details?: string) => void;
}

export class RealtimeService {
  private channel: any = null;
  private state: RealtimeConnectionState = 'DISCONNECTED';
  private listeners: Set<RealtimeListener> = new Set();
  private reconnectTimer: any = null;
  private reconnectIntervalMs = 3000;

  constructor() {
    this.init();
  }

  public getState(): RealtimeConnectionState {
    return this.state;
  }

  public subscribe(listener: RealtimeListener): () => void {
    this.listeners.add(listener);
    if (listener.onConnectionStateChange) {
      listener.onConnectionStateChange(this.state);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyState(newState: RealtimeConnectionState, details?: string) {
    this.state = newState;
    this.listeners.forEach(l => {
      try {
        l.onConnectionStateChange?.(newState, details);
      } catch (err) {
        console.error('[RealtimeService] Listener state error:', err);
      }
    });
  }

  public init() {
    if (!isSupabaseConfigured) {
      this.notifyState('CONNECTED', 'Operating with in-memory tactical pub/sub.');
      return;
    }

    if (this.channel) {
      try {
        supabase.removeChannel(this.channel);
      } catch {}
      this.channel = null;
    }

    this.notifyState('CONNECTING', 'Connecting to Supabase Realtime channel...');

    try {
      this.channel = supabase
        .channel('ibvap-realtime-master')
        // -------------------------------------------------------------
        // 1. Alerts Table Realtime Listeners
        // -------------------------------------------------------------
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'alerts' },
          (payload) => {
            const normalized = normalizeAlert(payload.new);
            this.listeners.forEach(l => l.onNewAlert?.(normalized));
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'alerts' },
          (payload) => {
            const normalized = normalizeAlert(payload.new);
            this.listeners.forEach(l => l.onAlertUpdated?.(normalized));
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'alerts' },
          (payload) => {
            const deletedId = payload.old?.id;
            if (deletedId) {
              this.listeners.forEach(l => l.onAlertDeleted?.(deletedId));
            }
          }
        )
        // -------------------------------------------------------------
        // 2. Events Table Realtime Listeners
        // -------------------------------------------------------------
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'events' },
          (payload) => {
            const normalized = normalizeEvent(payload.new);
            this.listeners.forEach(l => l.onNewEvent?.(normalized));
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'events' },
          (payload) => {
            const normalized = normalizeEvent(payload.new);
            this.listeners.forEach(l => l.onEventUpdated?.(normalized));
          }
        )
        // -------------------------------------------------------------
        // 3. Cameras Table Realtime Listeners
        // -------------------------------------------------------------
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'cameras' },
          (payload) => {
            if (payload.new) {
              this.listeners.forEach(l => l.onCameraStatusChange?.(payload.new));
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.notifyState('CONNECTED', 'Supabase Realtime feed active.');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            this.notifyState('ERROR', `Realtime status: ${status}`);
            this.scheduleReconnect();
          } else if (status === 'CLOSED') {
            this.notifyState('DISCONNECTED', 'Realtime channel closed.');
          }
        });
    } catch (err) {
      console.error('[RealtimeService] Initialization error:', err);
      this.notifyState('ERROR', 'Failed to connect to Supabase Realtime.');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.reconnectTimer = setTimeout(() => {
      this.init();
    }, this.reconnectIntervalMs);
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.notifyState('DISCONNECTED', 'Realtime manually disconnected.');
  }

  // Local fallback trigger for simulation
  public triggerLocalAlert(alert: any) {
    this.listeners.forEach(l => l.onNewAlert?.(alert));
  }

  public triggerLocalEvent(event: any) {
    this.listeners.forEach(l => l.onNewEvent?.(event));
  }
}

export const realtimeService = new RealtimeService();
