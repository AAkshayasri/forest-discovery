/**
 * Anonymous Research Usage-Event Logger
 * Strictly collects zero personally identifiable information (no IP, no email, no name).
 * Used for reproducible interaction analysis in the IEEE usability study.
 */

export interface UsageEvent {
  id: string;
  timestamp: string;
  eventType: 
    | 'app_init'
    | 'level1_world_view'
    | 'level2_continent_select'
    | 'level2_country_select'
    | 'level2_state_select'
    | 'level3_pin_select'
    | 'layer_filter_change'
    | 'search_query'
    | 'route_requested'
    | 'route_success'
    | 'route_error'
    | 'sus_feedback_submitted';
  payload: Record<string, any>;
  sessionDurationMs: number;
}

const STORAGE_KEY = 'wildatlas_anonymous_research_events';
const SESSION_START = Date.now();

export const analyticsLogger = {
  logEvent: (eventType: UsageEvent['eventType'], payload: Record<string, any> = {}) => {
    try {
      const now = new Date().toISOString();
      const event: UsageEvent = {
        id: `EVT_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        timestamp: now,
        eventType,
        payload,
        sessionDurationMs: Date.now() - SESSION_START
      };

      const existingRaw = localStorage.getItem(STORAGE_KEY);
      const existing: UsageEvent[] = existingRaw ? JSON.parse(existingRaw) : [];
      // Keep last 500 events locally
      if (existing.length >= 500) {
        existing.shift();
      }
      existing.push(event);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    } catch (err) {
      // Fail silently to avoid breaking UX
      console.debug("Analytics log event skipped:", err);
    }
  },

  getEvents: (): UsageEvent[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  clearEvents: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  },

  exportEventsAsJson: (): string => {
    const events = analyticsLogger.getEvents();
    return JSON.stringify(events, null, 2);
  },

  exportEventsAsCsv: (): string => {
    const events = analyticsLogger.getEvents();
    if (events.length === 0) return 'id,timestamp,eventType,sessionDurationMs,payload\n';
    
    const headers = ['id', 'timestamp', 'eventType', 'sessionDurationMs', 'payload'];
    const rows = events.map(e => [
      e.id,
      e.timestamp,
      e.eventType,
      e.sessionDurationMs,
      `"${JSON.stringify(e.payload).replace(/"/g, '""')}"`
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
};
