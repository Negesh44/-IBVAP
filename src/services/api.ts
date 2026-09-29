/**
 * IBVAP FastAPI Backend Integration Client
 * Provides centralized REST API connectivity, configuration management, and TypeScript definitions.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000';
export const USE_MOCK_LIVE_DATA = import.meta.env.VITE_USE_MOCK_LIVE_DATA === 'true';

export interface LiveDetection {
  camera_id: string;
  track_id: number;
  object_type: 'person' | 'car' | 'truck' | 'bus' | 'motorcycle' | string;
  confidence: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  identity: string | null;
  friendly: boolean;
  timestamp: string;
}

export interface LiveEvent {
  event_id: string;
  camera_id: string;
  track_id?: number;
  event_type: 'INTRUSION' | 'LOITERING' | 'NIGHT_MOVEMENT' | 'STATIONARY_PERSON' | string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | string;
  confidence?: number;
  description: string;
  bbox?: [number, number, number, number];
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface CameraStatus {
  camera_id: string;
  name?: string;
  location?: string;
  status: 'ONLINE' | 'CONNECTED' | 'RECONNECTING' | 'OFFLINE' | 'WARNING' | 'STOPPED';
  is_running: boolean;
  target_fps: number;
  actual_fps: number;
  frames_processed: number;
  last_error: string | null;
  has_preview: boolean;
}

export interface StreamHealth {
  active_cameras: number;
  total_registered_cameras: number;
  processing_fps: number;
  gpu_available: boolean;
  gpu_device: string;
  cameras: CameraStatus[];
}

export interface BackendHealth {
  status: string;
  platform: string;
  version: string;
  environment: string;
  uptime_seconds: number;
  supabase_connected: boolean;
  inference_engine: string;
  active_websocket_clients: number;
  timestamp: string;
}

export interface SystemHealth {
  status: string;
  uptime_seconds: number;
  cpu_percent: number;
  memory_percent: number;
  gpu_available: boolean;
  gpu_name: string;
  gpu_memory_used_mb: number;
  gpu_memory_total_mb: number;
  gpu_utilization_percent?: number;
  gpu_temperature_c?: number | null;
  active_cameras: number;
  processing_fps: number;
  average_inference_ms: number;
}

export interface SystemMetrics {
  health: SystemHealth;
  frames_processed: number;
  frames_skipped: number;
  current_fps: number;
  latency_ms: {
    average_yolo_inference_ms: number;
    average_tracking_ms: number;
    average_face_rec_ms: number;
    average_anpr_ms: number;
    average_event_engine_ms: number;
    average_total_ms: number;
  };
  active_cameras_count: number;
  cameras: CameraStatus[];
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error [${response.status}] ${response.statusText}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`[FastAPI Request Error] ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  // Health & Diagnostics
  checkBackendHealth: async (): Promise<BackendHealth> => {
    return request<BackendHealth>('/api/health');
  },

  // Cameras
  getCameras: async (): Promise<any[]> => {
    return request<any[]>('/api/cameras');
  },

  getCameraById: async (cameraId: string): Promise<any> => {
    return request<any>(`/api/cameras/${cameraId}`);
  },

  // Alerts
  getAlerts: async (limit = 50, status?: string): Promise<any[]> => {
    const q = status ? `?limit=${limit}&status=${status}` : `?limit=${limit}`;
    return request<any[]>(`/api/alerts${q}`);
  },

  updateAlertStatus: async (alertId: string, status: 'ACKNOWLEDGED' | 'RESOLVED', note?: string, operatorName?: string): Promise<any> => {
    return request<any>(`/api/alerts/${alertId}/action`, {
      method: 'POST',
      body: JSON.stringify({ status, note, operator_name: operatorName || 'Command Operator' })
    });
  },

  // Events
  getEvents: async (limit = 50, eventType?: string): Promise<any[]> => {
    const q = eventType ? `?limit=${limit}&event_type=${encodeURIComponent(eventType)}` : `?limit=${limit}`;
    return request<any[]>(`/api/events${q}`);
  },

  analyzeEvents: async (data: {
    camera_id: string;
    frame_width?: number;
    frame_height?: number;
    brightness?: number;
    detections?: any[];
    tracks?: any[];
  }): Promise<{ camera_id: string; events_count: number; events: LiveEvent[]; timestamp: string }> => {
    return request('/api/events/analyze', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Detections
  getDetections: async (cameraId?: string): Promise<LiveDetection[]> => {
    const q = cameraId ? `?camera_id=${encodeURIComponent(cameraId)}` : '';
    return request<LiveDetection[]>(`/api/detections${q}`);
  },

  // CCTV Streams & Workers
  getStreamStatus: async (): Promise<CameraStatus[]> => {
    return request<CameraStatus[]>('/api/streams/status');
  },

  getStreamHealth: async (): Promise<StreamHealth> => {
    return request<StreamHealth>('/api/streams/health');
  },

  getSystemHealth: async (): Promise<SystemHealth> => {
    return request<SystemHealth>('/api/system/health');
  },

  getSystemMetrics: async (): Promise<SystemMetrics> => {
    return request<SystemMetrics>('/api/system/metrics');
  },

  startStream: async (cameraId: string, rtspUrl?: string): Promise<{ status: string; camera_id: string; message: string }> => {
    const q = rtspUrl ? `?rtsp_url=${encodeURIComponent(rtspUrl)}` : '';
    return request(`/api/streams/start/${cameraId}${q}`, { method: 'POST' });
  },

  stopStream: async (cameraId: string): Promise<{ status: string; camera_id: string; message: string }> => {
    return request(`/api/streams/stop/${cameraId}`, { method: 'POST' });
  },

  // MJPEG Preview URL helper
  getPreviewStreamUrl: (cameraId: string): string => {
    return `${API_BASE_URL}/api/streams/${cameraId}/preview`;
  }
};
