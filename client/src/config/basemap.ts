import L from 'leaflet';
import '@maplibre/maplibre-gl-leaflet';

/**
 * Basemap Configuration & Failover Management for Wildlife Explorer
 * Supports primary vector tiles (OpenFreeMap Bright / Liberty) via MapLibre GL
 * with automated failover to standard OpenStreetMap raster tiles, dynamic
 * road contrast enhancement, and English-only label enforcement.
 */

export interface BasemapConfig {
  mapStyleUrl: string;
  fallbackTileUrl: string;
  primaryAttribution: string;
  fallbackAttribution: string;
  accessDate: string;
  minZoom: number;
  maxZoom: number;
}

export const BASEMAP_CONFIG: BasemapConfig = {
  mapStyleUrl: import.meta.env.VITE_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/bright',
  fallbackTileUrl: import.meta.env.VITE_TILE_URL_FALLBACK || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  primaryAttribution: 'OpenFreeMap © <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
  fallbackAttribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
  accessDate: '2026-10-02',
  minZoom: 2,
  maxZoom: 19
};

/**
 * Standard expression to prioritize English and Latin transliterated names
 * across all map features, avoiding secondary non-Latin / other language subtitles.
 */
export const ENGLISH_TEXT_FIELD_EXPRESSION = [
  'coalesce',
  ['get', 'name_en'],
  ['get', 'name:en'],
  ['get', 'name:latin'],
  ['get', 'name_int'],
  ['get', 'name']
];

/**
 * Strips non-Latin and bilingual text fields from a MapLibre style JSON,
 * retaining purely English / Latin alphabet labels.
 */
export function transformStyleToEnglishOnly(style: any): any {
  if (!style || !Array.isArray(style.layers)) return style;
  const newLayers = style.layers.map((layer: any) => {
    if (layer && layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
      const tf = layer.layout['text-field'];
      const serialized = JSON.stringify(tf);
      if (serialized.includes('name:nonlatin') || (Array.isArray(tf) && tf[0] === 'case')) {
        return {
          ...layer,
          layout: {
            ...layer.layout,
            'text-field': ENGLISH_TEXT_FIELD_EXPRESSION
          }
        };
      }
    }
    return layer;
  });

  return {
    ...style,
    layers: newLayers
  };
}

// Global cache for transformed English styles to make map initialization instant
const transformedStyleCache = new Map<string, any>();

/**
 * Returns the human-readable style name based on the current style URL.
 */
export function getStyleDisplayName(styleUrl: string = BASEMAP_CONFIG.mapStyleUrl): string {
  if (styleUrl.includes('bright')) return 'OpenFreeMap (Bright)';
  if (styleUrl.includes('liberty')) return 'OpenFreeMap (Liberty)';
  if (styleUrl.includes('positron')) return 'OpenFreeMap (Positron)';
  return 'OpenFreeMap (Vector)';
}

/**
 * Validates WebGL hardware rendering support in the current client browser.
 */
export function isWebGLSupported(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export interface BasemapManagerCallbacks {
  onProviderChange?: (providerName: string) => void;
  onToast?: (message: string, type: 'info' | 'warning' | 'error') => void;
}

/**
 * BasemapManager encapsulates lifecycle, error-rate detection, road visibility enhancement, English-only label enforcement, and failover mechanics.
 */
export class BasemapManager {
  private map: L.Map;
  private primaryLayer: L.Layer | null = null;
  private fallbackLayer: L.TileLayer | null = null;
  private callbacks: BasemapManagerCallbacks;

  private isFallbackActive = false;
  private isCompletelyUnavailable = false;
  private errorTimestamps: number[] = [];
  private fallbackErrorCount = 0;
  private hasEnhancedRoads = false;

  constructor(map: L.Map, callbacks: BasemapManagerCallbacks = {}) {
    this.map = map;
    this.callbacks = callbacks;
  }

  /**
   * Initializes and attaches the basemap layer (Primary OpenFreeMap or Fallback OSM).
   */
  public init(): void {
    if (!isWebGLSupported()) {
      console.warn('[Basemap] WebGL is not supported in this environment. Falling back immediately to OpenStreetMap raster tiles.');
      this.switchToFallback('WebGL not supported');
      return;
    }

    try {
      this.initPrimaryLayer();
    } catch (err) {
      console.error('[Basemap] Failed to construct MapLibre GL layer:', err);
      this.switchToFallback('MapLibre GL initialization error');
    }
  }

  private initPrimaryLayer(): void {
    const styleUrl = BASEMAP_CONFIG.mapStyleUrl;
    const cachedStyle = transformedStyleCache.get(styleUrl);

    // Create MapLibre GL Leaflet layer using pre-transformed style if available, or style URL
    const glLayer = (L as any).maplibreGL({
      style: cachedStyle || styleUrl,
      pane: 'tilePane'
    });

    this.primaryLayer = glLayer;
    if (glLayer && typeof glLayer.addTo === 'function') {
      glLayer.addTo(this.map);
    }

    if (this.callbacks.onProviderChange) {
      this.callbacks.onProviderChange(getStyleDisplayName(styleUrl));
    }

    // Pre-fetch and cache transformed style for instant subsequent renders
    if (!cachedStyle && typeof fetch !== 'undefined') {
      fetch(styleUrl)
        .then((res) => res.json())
        .then((data) => {
          const englishStyle = transformStyleToEnglishOnly(data);
          transformedStyleCache.set(styleUrl, englishStyle);
        })
        .catch(() => {});
    }

    // Attach listeners, road enhancement, and English-only language enforcement
    setTimeout(() => {
      this.attachMapLibreListeners(glLayer);
    }, 100);
  }

  private attachMapLibreListeners(glLayer: any): void {
    try {
      const glMap = glLayer.getMaplibreMap ? glLayer.getMaplibreMap() : null;
      if (!glMap) return;

      glMap.on('error', (e: any) => {
        this.recordMapLibreError(e);
      });

      // Enhance road visibility & enforce English labels when style is loaded
      glMap.on('styledata', () => {
        this.enhanceRoadVisibility(glMap);
        this.enforceEnglishLabels(glMap);
      });

      glMap.on('load', () => {
        this.enhanceRoadVisibility(glMap);
        this.enforceEnglishLabels(glMap);
      });
    } catch (err) {
      console.warn('[Basemap] Could not attach MapLibre listeners:', err);
    }
  }

  /**
   * Enforces pure English / Latin alphabet labels across all symbol layers,
   * removing Arabic, Cyrillic, Chinese, and all secondary non-Latin language text.
   */
  private enforceEnglishLabels(glMap: any): void {
    if (!glMap || typeof glMap.getStyle !== 'function') return;

    try {
      const style = glMap.getStyle();
      if (!style || !style.layers || style.layers.length === 0) return;

      style.layers.forEach((layer: any) => {
        if (!layer || layer.type !== 'symbol' || !layer.layout) return;
        const currentTextField = layer.layout['text-field'];
        if (!currentTextField) return;

        const serialized = JSON.stringify(currentTextField);
        if (serialized.includes('name:nonlatin') || (Array.isArray(currentTextField) && currentTextField[0] === 'case')) {
          try {
            glMap.setLayoutProperty(layer.id, 'text-field', ENGLISH_TEXT_FIELD_EXPRESSION);
          } catch {
            // Layer may already be updated or busy
          }
        }
      });
    } catch (err) {
      console.warn('[Basemap] English label enforcement warning:', err);
    }
  }

  /**
   * Dynamically boosts road network visibility and line widths at zoom levels 5 to 14
   * without hardcoding the whole style JSON.
   */
  private enhanceRoadVisibility(glMap: any): void {
    if (this.hasEnhancedRoads || !glMap || typeof glMap.getStyle !== 'function') return;

    try {
      const style = glMap.getStyle();
      if (!style || !style.layers || style.layers.length === 0) return;

      this.hasEnhancedRoads = true;

      style.layers.forEach((layer: any) => {
        if (!layer || layer.type !== 'line') return;
        const id = layer.id || '';

        const isMotorway = id.includes('motorway');
        const isTrunkOrPrimary = id.includes('trunk') || id.includes('primary');
        const isSecondary = id.includes('secondary');
        const isRoadCasing = id.includes('casing');

        if (isMotorway || isTrunkOrPrimary || isSecondary) {
          // 1. Ensure maximum opacity for roads
          try {
            glMap.setPaintProperty(id, 'line-opacity', 1.0);
          } catch {}

          // 2. Adjust line-width curves for enhanced road hierarchy visibility
          if (!isRoadCasing) {
            try {
              if (isMotorway) {
                glMap.setPaintProperty(id, 'line-width', [
                  'interpolate', ['exponential', 1.5], ['zoom'],
                  4, 1.2,
                  6, 2.4,
                  8, 4.0,
                  10, 6.0,
                  14, 9.0,
                  18, 16.0
                ]);
              } else if (isTrunkOrPrimary) {
                glMap.setPaintProperty(id, 'line-width', [
                  'interpolate', ['exponential', 1.5], ['zoom'],
                  5, 1.0,
                  7, 2.2,
                  9, 3.6,
                  11, 5.2,
                  14, 7.5,
                  18, 14.0
                ]);
              } else if (isSecondary) {
                glMap.setPaintProperty(id, 'line-width', [
                  'interpolate', ['exponential', 1.5], ['zoom'],
                  7, 1.0,
                  9, 2.2,
                  11, 3.6,
                  13, 5.5,
                  18, 11.0
                ]);
              }
            } catch {}
          } else {
            // Outline casing layers widened to match
            try {
              if (isMotorway) {
                glMap.setPaintProperty(id, 'line-width', [
                  'interpolate', ['exponential', 1.5], ['zoom'],
                  4, 2.2,
                  6, 4.0,
                  8, 6.2,
                  10, 8.8,
                  14, 12.5,
                  18, 20.0
                ]);
              } else if (isTrunkOrPrimary) {
                glMap.setPaintProperty(id, 'line-width', [
                  'interpolate', ['exponential', 1.5], ['zoom'],
                  5, 2.0,
                  7, 3.6,
                  9, 5.5,
                  11, 7.6,
                  14, 10.5,
                  18, 18.0
                ]);
              }
            } catch {}
          }
        }
      });
    } catch (err) {
      console.warn('[Basemap] Road visibility enhancement non-fatal warning:', err);
    }
  }

  private recordMapLibreError(e: any): void {
    if (this.isFallbackActive) return;

    const now = Date.now();
    this.errorTimestamps.push(now);

    // Keep errors from the last 10 seconds
    this.errorTimestamps = this.errorTimestamps.filter((t) => now - t <= 10000);

    // Check if error message indicates style load failure or error count > 5 within 10s
    const errorMessage = e?.error?.message || e?.message || '';
    const isFatalStyleError = errorMessage.includes('Failed to fetch') || errorMessage.includes('404') || errorMessage.includes('Unauthorized');

    if (isFatalStyleError || this.errorTimestamps.length >= 5) {
      console.warn(`[Basemap] Primary tile error threshold reached (${this.errorTimestamps.length} errors in 10s). Triggering fallback.`);
      this.switchToFallback('Repeated tile/style fetch errors');
    }
  }

  /**
   * Switches to the standard OpenStreetMap raster tile fallback.
   */
  public switchToFallback(reason?: string): void {
    if (this.isFallbackActive) return;
    this.isFallbackActive = true;

    console.info(`[Basemap] Switching to fallback OpenStreetMap tiles. Reason: ${reason || 'Unknown'}`);

    // Clean up primary layer
    if (this.primaryLayer && this.map.hasLayer(this.primaryLayer)) {
      try {
        this.map.removeLayer(this.primaryLayer);
      } catch (err) {
        console.warn('[Basemap] Error removing primary layer:', err);
      }
      this.primaryLayer = null;
    }

    // Initialize fallback raster layer
    this.fallbackLayer = L.tileLayer(BASEMAP_CONFIG.fallbackTileUrl, {
      attribution: BASEMAP_CONFIG.fallbackAttribution,
      maxZoom: BASEMAP_CONFIG.maxZoom,
      subdomains: 'abc'
    });

    this.fallbackLayer.on('tileerror', () => {
      this.fallbackErrorCount++;
      if (this.fallbackErrorCount >= 6 && !this.isCompletelyUnavailable) {
        this.isCompletelyUnavailable = true;
        console.error('[Basemap] Fallback OpenStreetMap tiles are also failing.');
        if (this.callbacks.onToast) {
          this.callbacks.onToast('Map tiles unavailable, check your connection', 'error');
        }
        if (this.callbacks.onProviderChange) {
          this.callbacks.onProviderChange('Tiles Unavailable');
        }
      }
    });

    this.fallbackLayer.addTo(this.map);
    this.fallbackLayer.bringToBack();

    if (this.callbacks.onProviderChange) {
      this.callbacks.onProviderChange('OpenStreetMap (Fallback)');
    }

    if (this.callbacks.onToast) {
      this.callbacks.onToast('Switched to backup map tiles', 'info');
    }
  }

  /**
   * Cleanup method to remove layers on unmount.
   */
  public destroy(): void {
    if (this.primaryLayer && this.map.hasLayer(this.primaryLayer)) {
      this.map.removeLayer(this.primaryLayer);
      this.primaryLayer = null;
    }
    if (this.fallbackLayer && this.map.hasLayer(this.fallbackLayer)) {
      this.map.removeLayer(this.fallbackLayer);
      this.fallbackLayer = null;
    }
  }
}
