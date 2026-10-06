import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import type { NormalizedPlace, ContinentAggregate, CountryAggregate } from '../../services/datasetLoader';
import { CONTINENT_METADATA } from '../../services/datasetLoader';

export interface RouteGeometry {
  type: string;
  coordinates: [number, number][]; // [lng, lat]
}

export interface RouteStep {
  stepIndex: number;
  instruction: string;
  distance: number;
  distanceFormatted: string;
  duration: number;
  durationFormatted: string;
  name: string;
  maneuver: any;
  location: [number, number] | null;
}

export interface NavigationRouteData {
  distance: number;
  distanceFormatted: string;
  duration: number;
  durationFormatted: string;
  geometry: RouteGeometry;
  steps: RouteStep[];
  destinationName: string;
  destinationType: 'forest' | 'zoo';
  destinationLocation: { lat: number; lng: number };
  startLocation: { lat: number; lng: number };
}

interface MapViewProps {
  // Navigation Hierarchy Level States
  selectedContinent: string | null;
  selectedCountry: string | null;
  selectedState: string | null;
  continentData?: ContinentAggregate | null;
  countryData?: CountryAggregate | null;
  continentList: ContinentAggregate[];

  // Drill-down callbacks
  onContinentSelect: (continentName: string) => void;
  onCountrySelect: (countryName: string) => void;
  onStateSelect: (stateName: string) => void;

  // Filtered dataset places
  places: NormalizedPlace[];
  forests: NormalizedPlace[];
  zoos: NormalizedPlace[];

  // Selection
  selectedPlace: NormalizedPlace | null;
  onPlaceSelect: (place: NormalizedPlace) => void;

  // Road Route Navigation
  onGetDirections?: (target: NormalizedPlace) => void;
  activeRoute?: NavigationRouteData | null;
  onClearRoute?: () => void;
  userLocation?: { lat: number; lng: number } | null;
  isNavigating?: boolean;

  // Start Location Picker on Map
  isPickingStartLocation?: boolean;
  onStartLocationPicked?: (lat: number, lng: number) => void;

  // Layer filter
  activeLayerFilter?: 'all' | 'forests' | 'zoos';
  setActiveLayerFilter?: (filter: 'all' | 'forests' | 'zoos') => void;

  // Center & Sidebar state for invalidateSize
  initialCenter?: { lat: number; lng: number; zoom?: number } | null;
  isSidebarOpen?: boolean;
}

import { BasemapManager, BASEMAP_CONFIG, getStyleDisplayName } from '../../config/basemap';

export const MapView: React.FC<MapViewProps> = ({
  selectedContinent,
  selectedCountry,
  selectedState,
  continentData,
  countryData,
  continentList,
  onContinentSelect,
  onCountrySelect: _onCountrySelect,
  onStateSelect: _onStateSelect,
  places = [],
  forests = [],
  zoos = [],
  selectedPlace = null,
  onPlaceSelect,
  onGetDirections,
  activeRoute = null,
  userLocation = null,
  isNavigating = false,
  isPickingStartLocation = false,
  onStartLocationPicked,
  activeLayerFilter = 'all',
  setActiveLayerFilter = () => {},
  initialCenter = null,
  isSidebarOpen = false
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const basemapManagerRef = useRef<BasemapManager | null>(null);

  // Layer Groups
  const level1ContinentGroupRef = useRef<L.LayerGroup | null>(null);
  const level2RegionGroupRef = useRef<L.LayerGroup | null>(null);
  const clusterGroupRef = useRef<any>(null);
  const routeLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const userLocationLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [zoomLevel, setZoomLevel] = useState(2);
  const [tileProviderName, setTileProviderName] = useState(getStyleDisplayName());
  const [toastNotification, setToastNotification] = useState<{ message: string; type: 'info' | 'warning' | 'error'; id: number } | null>(null);

  // 1. Initialize Map with OpenFreeMap Vector Basemap and Fallback
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const mapBounds = L.latLngBounds([-85, -180], [85, 180]);
    const initLat = initialCenter?.lat ?? 20;
    const initLng = initialCenter?.lng ?? 10;
    const initZoom = initialCenter?.zoom ?? 2;

    const map = L.map(mapContainerRef.current, {
      center: [initLat, initLng],
      zoom: initZoom,
      minZoom: BASEMAP_CONFIG.minZoom,
      maxZoom: BASEMAP_CONFIG.maxZoom,
      maxBounds: mapBounds,
      maxBoundsViscosity: 0.8,
      worldCopyJump: true,
      zoomControl: false
    });

    // Basemap Manager: MapLibre GL Liberty vector layer with automated failover
    const basemapMgr = new BasemapManager(map, {
      onProviderChange: (name) => setTileProviderName(name),
      onToast: (msg, type) => {
        const id = Date.now();
        setToastNotification({ message: msg, type, id });
        setTimeout(() => {
          setToastNotification((prev) => (prev && prev.id === id ? null : prev));
        }, 6000);
      }
    });

    basemapMgr.init();
    basemapManagerRef.current = basemapMgr;

    // Zoom control on bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    map.on('zoomend', () => {
      setZoomLevel(map.getZoom());
    });

    // Level Layer Groups
    level1ContinentGroupRef.current = L.layerGroup().addTo(map);
    level2RegionGroupRef.current = L.layerGroup().addTo(map);

    // MarkerCluster Group
    const cluster = (L as any).markerClusterGroup({
      chunkedLoading: true,
      showCoverageOnHover: false,
      maxClusterRadius: 45,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 15
    });
    cluster.addTo(map);
    clusterGroupRef.current = cluster;

    routeLayerGroupRef.current = L.layerGroup().addTo(map);
    userLocationLayerGroupRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    return () => {
      if (basemapManagerRef.current) {
        basemapManagerRef.current.destroy();
        basemapManagerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Invalidate map size when sidebar opens/closes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [isSidebarOpen]);

  // Click on Map for Start Location Picker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (isPickingStartLocation && onStartLocationPicked) {
        onStartLocationPicked(e.latlng.lat, e.latlng.lng);
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [isPickingStartLocation, onStartLocationPicked]);

  // Dynamic Initial Center flyTo
  useEffect(() => {
    if (mapRef.current && initialCenter && !isNavigating) {
      mapRef.current.flyTo([initialCenter.lat, initialCenter.lng], initialCenter.zoom || 4, {
        animate: true,
        duration: 1.2
      });
    }
  }, [initialCenter, isNavigating]);

  // -------------------------------------------------------------
  // LEVEL 1: WORLD / CONTINENTS OVERVIEW
  // -------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    const l1Group = level1ContinentGroupRef.current;
    if (!map || !l1Group) return;

    l1Group.clearLayers();

    // Only render Level 1 continent badges when at world level (no continent selected)
    if (selectedContinent || isNavigating) {
      return;
    }

    continentList.forEach((cont) => {
      const meta = CONTINENT_METADATA[cont.name] || { emoji: '🌍', center: cont.center, zoom: 3 };

      const badgeIcon = L.divIcon({
        className: 'custom-continent-badge',
        html: `
          <div class="relative group cursor-pointer flex flex-col items-center select-none">
            <div class="px-4 py-2.5 rounded-full bg-[#131b24]/95 backdrop-blur-xl border border-primary/50 hover:border-primary shadow-2xl flex items-center gap-2.5 transition-all duration-300 transform group-hover:scale-110 group-hover:shadow-primary/30 group-hover:shadow-xl group-hover:bg-[#1c2836] whitespace-nowrap">
              <span class="text-base leading-none select-none">${cont.emoji || meta.emoji}</span>
              <div class="flex flex-col text-left">
                <span class="text-xs sm:text-sm font-bold text-white tracking-wide font-headline-md leading-none">${cont.name}</span>
                <span class="text-[10px] font-mono text-[#a5d0b9] font-bold mt-0.5">${cont.forestCount} 🌳 • ${cont.zooCount} 🦁</span>
              </div>
            </div>
            <div class="mt-1 px-2.5 py-0.5 rounded-full bg-black/85 backdrop-blur-md border border-white/10 text-[9px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-1 group-hover:translate-y-0 whitespace-nowrap shadow-lg">
              👆 Explore ${cont.name} (${cont.totalCount} places)
            </div>
          </div>
        `,
        iconSize: [200, 60],
        iconAnchor: [100, 30]
      });

      const marker = L.marker(cont.center, { icon: badgeIcon, zIndexOffset: 500 });

      marker.bindTooltip(`
        <div class="p-2.5 text-left font-body-md select-none min-w-[200px]">
          <div class="flex items-center gap-1.5 text-xs font-bold text-white font-headline-md">
            <span>${cont.emoji}</span>
            <span>${cont.name} Overview</span>
          </div>
          <div class="flex items-center gap-2 mt-1 text-[11px] text-[#c1c8c2] font-mono">
            <span class="text-[#10b981] font-bold">🌳 ${cont.forestCount} Forests</span>
            <span class="text-[#f59e0b] font-bold">🦁 ${cont.zooCount} Zoos</span>
          </div>
          <div class="mt-1.5 text-[10px] text-primary font-bold">
            👉 Click to drill down into ${cont.name}
          </div>
        </div>
      `, {
        direction: 'top',
        offset: [0, -20],
        opacity: 0.95,
        className: 'leaflet-custom-tooltip'
      });

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onContinentSelect(cont.name);
        map.flyTo(cont.center, meta.zoom || 3, { animate: true, duration: 1.2 });
      });

      marker.addTo(l1Group);
    });
  }, [selectedContinent, continentList, isNavigating, onContinentSelect]);

  // -------------------------------------------------------------
  // LEVEL 2: REGION / STATE / COUNTRY AGGREGATES (Clean Vector Basemap Mode)
  // -------------------------------------------------------------
  useEffect(() => {
    const l2Group = level2RegionGroupRef.current;
    if (l2Group) {
      l2Group.clearLayers();
    }
  }, [selectedContinent, selectedCountry, selectedState, continentData, countryData]);

  // -------------------------------------------------------------
  // LEVEL 3: CLUSTERED PIN POINTS (Forests 🌳 & Zoos 🦁)
  // -------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    const cluster = clusterGroupRef.current;
    if (!map || !cluster) return;

    cluster.clearLayers();

    // Render pins if a continent, country, state, or specific place is active
    if (!selectedContinent && !selectedPlace && !isNavigating) {
      return;
    }

    // Filter by layer filter: 'all' | 'forests' | 'zoos'
    let displayPlaces = places;
    if (activeLayerFilter === 'forests') {
      displayPlaces = places.filter(p => p.type === 'forest');
    } else if (activeLayerFilter === 'zoos') {
      displayPlaces = places.filter(p => p.type === 'zoo');
    }

    // If a specific place is selected, ensure it is included
    if (selectedPlace && !displayPlaces.some(p => String(p.id) === String(selectedPlace.id))) {
      displayPlaces = [selectedPlace, ...displayPlaces];
    }

    const markers: L.Marker[] = [];

    displayPlaces.forEach((p) => {
      const isSelected = selectedPlace && String(selectedPlace.id) === String(p.id);
      const isForest = p.type === 'forest';

      const pinHtml = isForest
        ? `
          <div class="relative flex items-center justify-center w-8 h-8 cursor-pointer group" title="${p.name}">
            <div class="absolute w-6 h-6 bg-[#10b981] rounded-full opacity-40 animate-ping"></div>
            <div class="absolute w-6 h-6 bg-[#1b4332] rounded-full border-2 ${isSelected ? 'border-white ring-2 ring-[#10b981]' : 'border-[#a5d0b9]/80'} flex items-center justify-center shadow-md">
              <span class="text-[11px] select-none">🌳</span>
            </div>
          </div>
        `
        : `
          <div class="relative flex items-center justify-center w-8 h-8 cursor-pointer group" title="${p.name}">
            <div class="absolute w-6 h-6 bg-[#f59e0b] rounded-full opacity-40 animate-ping"></div>
            <div class="absolute w-6 h-6 bg-[#78350f] rounded-full border-2 ${isSelected ? 'border-white ring-2 ring-[#f59e0b]' : 'border-[#fde68a]/80'} flex items-center justify-center shadow-md">
              <span class="text-[11px] select-none">🦁</span>
            </div>
          </div>
        `;

      const pinIcon = L.divIcon({
        className: isForest ? 'custom-forest-icon' : 'custom-zoo-icon',
        html: pinHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([p.lat, p.lng], {
        icon: pinIcon,
        zIndexOffset: isSelected ? 1000 : 100
      });

      marker.bindTooltip(`
        <div class="p-2 text-left font-body-md select-none min-w-[190px]">
          <div class="font-bold text-xs ${isForest ? 'text-[#a5d0b9]' : 'text-[#fde68a]'} flex items-center gap-1 font-headline-md">
            <span>${isForest ? '🌳' : '🦁'}</span>
            <span>${p.name}</span>
          </div>
          <div class="text-[10px] text-[#c1c8c2] mt-0.5">
            ${p.continent ? p.continent + ' • ' : ''}${p.state ? p.state + ', ' : ''}${p.country}
          </div>
          <div class="text-[9px] font-mono ${isForest ? 'text-[#10b981]' : 'text-[#f59e0b]'} mt-1 font-semibold">
            📍 ${p.lat.toFixed(6)}°, ${p.lng.toFixed(6)}°
          </div>
        </div>
      `, {
        direction: 'top',
        offset: [0, -10],
        opacity: 0.95,
        className: 'leaflet-custom-tooltip'
      });

      // Interactive Popup
      const popupContent = `
        <div class="p-3 select-none text-[#e5e2e1] font-body-md text-left min-w-[260px]">
          <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span class="px-1.5 py-0.5 rounded ${isForest ? 'bg-[#10b981]/20 border-[#10b981]/30 text-[#a5d0b9]' : 'bg-[#f59e0b]/20 border-[#f59e0b]/30 text-[#fde68a]'} border text-[8px] font-bold uppercase tracking-wider font-label-sm">
              ${isForest ? '🌳 Forest Reserve' : '🦁 Zoological Park'}
            </span>
            ${p.continent ? `<span class="px-1.5 py-0.5 rounded bg-white/10 text-[8px] font-medium text-[#c1c8c2] font-label-sm">${p.continent}</span>` : ''}
          </div>
          <h4 class="font-bold ${isForest ? 'text-[#a5d0b9]' : 'text-[#fde68a]'} text-xs sm:text-sm leading-tight font-headline-md">${p.name}</h4>
          <p class="text-[10px] text-[#c1c8c2] mt-0.5">${p.state ? p.state + ', ' : ''}${p.country}</p>
          
          <div class="mt-2 px-2 py-1 rounded bg-black/50 border border-white/10 flex items-center justify-between text-[9px] font-mono ${isForest ? 'text-[#10b981]' : 'text-[#fde68a]'}">
            <span>📍 Coordinates:</span>
            <span class="font-bold">${p.lat.toFixed(6)}°, ${p.lng.toFixed(6)}°</span>
          </div>

          <div class="grid grid-cols-2 gap-1.5 mt-2.5">
            <button id="btn-popup-details-${p.id}" class="text-[10px] font-semibold text-white bg-surface-container-highest hover:bg-surface-bright px-2 py-1.5 rounded-lg transition-all cursor-pointer border border-white/10 font-label-sm text-center">
              View Profile & Species
            </button>
            <button id="btn-popup-directions-${p.id}" class="text-[10px] font-bold text-on-primary bg-primary hover:bg-primary/90 px-2 py-1.5 rounded-lg transition-all cursor-pointer shadow-md font-label-sm text-center flex items-center justify-center gap-1">
              🚗 Road Route
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { closeButton: false, offset: [0, -10] });

      marker.on('click', () => {
        onPlaceSelect(p);
      });

      marker.on('popupopen', () => {
        const btnDetails = document.getElementById(`btn-popup-details-${p.id}`);
        if (btnDetails) {
          btnDetails.onclick = (e) => {
            e.stopPropagation();
            onPlaceSelect(p);
            marker.closePopup();
          };
        }

        const btnDir = document.getElementById(`btn-popup-directions-${p.id}`);
        if (btnDir) {
          btnDir.onclick = (e) => {
            e.stopPropagation();
            if (onGetDirections) {
              onGetDirections(p);
            }
            marker.closePopup();
          };
        }
      });

      markers.push(marker);
    });

    cluster.addLayers(markers);
  }, [places, selectedContinent, selectedPlace, activeLayerFilter, isNavigating, onPlaceSelect, onGetDirections]);

  // Smooth Fly to Selected Place
  useEffect(() => {
    const map = mapRef.current;
    if (!map || isNavigating) return;

    if (selectedPlace) {
      map.flyTo([selectedPlace.lat, selectedPlace.lng], selectedPlace.type === 'forest' ? 10 : 12, {
        animate: true,
        duration: 1.2
      });
    }
  }, [selectedPlace, isNavigating]);

  // -------------------------------------------------------------
  // ROAD ROUTING GEOMETRY & START / DESTINATION PINS
  // -------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    const routeGroup = routeLayerGroupRef.current;
    if (!map || !routeGroup) return;

    routeGroup.clearLayers();

    if (!activeRoute || !activeRoute.geometry || !activeRoute.geometry.coordinates) {
      return;
    }

    const latLngs: L.LatLngExpression[] = activeRoute.geometry.coordinates.map(coord => [coord[1], coord[0]]);
    if (latLngs.length === 0) return;

    // 1. High contrast dark backing casing line
    const outerGlow = L.polyline(latLngs, {
      color: '#4c0519', // Dark Plum / Deep Wine casing for maximum edge contrast
      weight: 10,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round'
    });

    // 2. Core navigation road polyline (Vivid Electric Magenta)
    const coreLine = L.polyline(latLngs, {
      color: '#d946ef', // Bright Neon Magenta (#d946ef) perfectly contrasts with yellow/orange/gray roads & green forests
      weight: 6,
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round'
    });

    // 3. Crisp white center dash overlay
    const dashOverlay = L.polyline(latLngs, {
      color: '#ffffff',
      weight: 2.5,
      opacity: 0.95,
      dashArray: '8, 12',
      lineCap: 'round'
    });

    outerGlow.addTo(routeGroup);
    coreLine.addTo(routeGroup);
    dashOverlay.addTo(routeGroup);

    // Start Pin (Point A)
    const startPos = (activeRoute.startLocation && typeof activeRoute.startLocation.lat === 'number')
      ? [activeRoute.startLocation.lat, activeRoute.startLocation.lng] as [number, number]
      : (latLngs[0] as [number, number]);

    const destPos = (activeRoute.destinationLocation && typeof activeRoute.destinationLocation.lat === 'number')
      ? [activeRoute.destinationLocation.lat, activeRoute.destinationLocation.lng] as [number, number]
      : (latLngs[latLngs.length - 1] as [number, number]);

    const startIcon = L.divIcon({
      className: 'custom-start-icon',
      html: `
        <div class="relative flex items-center justify-center w-8 h-8 select-none">
          <div class="w-7 h-7 rounded-full bg-[#10b981] border-2 border-white shadow-xl flex items-center justify-center text-white font-bold text-xs font-headline-md">
            A
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const startMarker = L.marker(startPos, {
      icon: startIcon,
      zIndexOffset: 1200
    }).bindTooltip(`<div class="p-1.5 text-xs font-bold text-white">🟢 Start Location</div>`, {
      direction: 'top',
      offset: [0, -10]
    });
    startMarker.addTo(routeGroup);

    // Destination Pin (Point B)
    const destIcon = L.divIcon({
      className: 'custom-dest-icon',
      html: `
        <div class="relative flex items-center justify-center w-8 h-8 select-none">
          <div class="w-7 h-7 rounded-full bg-[#ef4444] border-2 border-white shadow-xl flex items-center justify-center text-white font-bold text-xs font-headline-md animate-bounce">
            🏁
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const destMarker = L.marker(destPos, {
      icon: destIcon,
      zIndexOffset: 1200
    }).bindTooltip(`
      <div class="p-2 text-left font-body-md select-none">
        <div class="font-bold text-xs text-white">🏁 ${activeRoute.destinationName || 'Destination'}</div>
        <div class="text-[10px] text-[#fca5a5] mt-0.5">Exact (${destPos[0].toFixed(4)}°, ${destPos[1].toFixed(4)}°)</div>
      </div>
    `, {
      direction: 'top',
      offset: [0, -10]
    });
    destMarker.addTo(routeGroup);

    const bounds = L.latLngBounds(latLngs);
    map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15, animate: true, duration: 1.2 });
  }, [activeRoute]);

  // Live User Location Beacon
  useEffect(() => {
    const map = mapRef.current;
    const userGroup = userLocationLayerGroupRef.current;
    if (!map || !userGroup) return;

    userGroup.clearLayers();

    if (!userLocation) return;

    const userBeaconIcon = L.divIcon({
      className: 'custom-user-location-beacon',
      html: `
        <div class="relative flex items-center justify-center w-8 h-8 select-none">
          <div class="absolute w-8 h-8 bg-[#38bdf8] rounded-full opacity-35 animate-ping"></div>
          <div class="w-4 h-4 bg-[#0284c7] rounded-full border-2 border-white shadow-xl ring-2 ring-[#38bdf8]"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const userMarker = L.marker([userLocation.lat, userLocation.lng], {
      icon: userBeaconIcon,
      zIndexOffset: 1500
    }).bindTooltip(`<div class="p-1.5 text-xs font-bold text-[#38bdf8]">📍 You are here (${userLocation.lat.toFixed(4)}°, ${userLocation.lng.toFixed(4)}°)</div>`, {
      direction: 'top',
      offset: [0, -10]
    });

    userMarker.addTo(userGroup);
  }, [userLocation]);

  return (
    <div className={`w-full h-full relative bg-[#e8e8e8] overflow-hidden ${isPickingStartLocation ? 'cursor-crosshair' : ''}`}>
      <div ref={mapContainerRef} id="map-container" className="w-full h-full bg-[#e8e8e8]" />

      {/* Dismissible Basemap Failover Toast Notification */}
      {toastNotification && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto bg-surface-container-high/95 backdrop-blur-xl border border-outline-variant/80 rounded-xl px-4 py-2 shadow-2xl flex items-center gap-2.5 animate-in fade-in duration-200">
          <span className={`w-2 h-2 rounded-full ${
            toastNotification.type === 'error' ? 'bg-red-400 animate-pulse' :
            toastNotification.type === 'warning' ? 'bg-amber-400' : 'bg-primary'
          }`} />
          <span className="text-xs font-medium text-white">{toastNotification.message}</span>
          <button
            onClick={() => setToastNotification(null)}
            className="text-on-surface-variant hover:text-white text-base leading-none px-1 font-bold ml-2 transition-colors cursor-pointer"
            title="Dismiss notification"
          >
            &times;
          </button>
        </div>
      )}

      {/* Picking Start Location Active Notification Banner */}
      {isPickingStartLocation && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto bg-[#0c1a29]/95 backdrop-blur-xl border border-primary rounded-2xl px-4 py-2.5 shadow-2xl flex items-center gap-2.5 animate-bounce">
          <span className="text-base">📍</span>
          <span className="text-xs font-bold text-white font-headline-md">
            Click anywhere on the map to set your trip start point
          </span>
        </div>
      )}

      {/* Top Right Map Layer Filter & Basemap Attribution Indicator */}
      <div className="absolute top-20 right-4 z-20 pointer-events-auto flex flex-col gap-2 select-none">
        {/* Layer Filter (All / Forests / Zoos) */}
        <div className="bg-surface-container-high/95 backdrop-blur-xl border border-outline-variant/60 rounded-xl p-1.5 shadow-2xl flex items-center gap-1 text-[11px] font-bold">
          <button
            onClick={() => setActiveLayerFilter('all')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-label-sm ${
              activeLayerFilter === 'all'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-white hover:bg-surface-container'
            }`}
          >
            All ({places.length})
          </button>
          <button
            onClick={() => setActiveLayerFilter('forests')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-label-sm ${
              activeLayerFilter === 'forests'
                ? 'bg-[#1b4332] text-[#a5d0b9] border border-[#10b981]/50 shadow-sm'
                : 'text-on-surface-variant hover:text-white hover:bg-surface-container'
            }`}
          >
            🌳 Forests ({forests.length})
          </button>
          <button
            onClick={() => setActiveLayerFilter('zoos')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-label-sm ${
              activeLayerFilter === 'zoos'
                ? 'bg-[#78350f] text-[#fde68a] border border-[#f59e0b]/50 shadow-sm'
                : 'text-on-surface-variant hover:text-white hover:bg-surface-container'
            }`}
          >
            🦁 Zoos ({zoos.length})
          </button>
        </div>

        {/* Map Engine & Tile Provider Attribution Badge */}
        <div className="bg-surface-container-high/90 backdrop-blur-xl border border-outline-variant/50 rounded-xl px-2.5 py-1 shadow-lg flex items-center justify-between text-[10px] font-mono text-outline">
          <span>Tile: <strong className="text-white">{tileProviderName}</strong></span>
          <span className="ml-2 text-primary font-bold">Leaflet v1.9</span>
        </div>
      </div>

      {/* Map Interactive Legend HUD (Bottom Left) */}
      <div className="absolute bottom-6 left-6 z-20 pointer-events-auto bg-surface-container-high/90 backdrop-blur-xl border border-outline-variant/60 rounded-2xl p-3 shadow-2xl flex flex-col gap-2 max-w-xs select-none">
        <div className="flex items-center justify-between gap-3 border-b border-outline-variant/30 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{continentData ? continentData.emoji : '🌍'}</span>
            <span className="text-[11px] font-bold text-on-surface uppercase tracking-wider font-label-sm">
              {continentData ? `${continentData.name} Dataset Atlas` : 'Global Dataset Atlas'}
            </span>
          </div>
          <span className="text-[10px] text-primary font-mono font-semibold">Zoom {zoomLevel}x</span>
        </div>

        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#1b4332]/40 border border-[#10b981]/40 text-[#a5d0b9] flex-1">
            <span className="text-sm">🌳</span>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold leading-tight">Forests</span>
              <span className="text-xs font-mono font-bold text-white">{forests.length}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#78350f]/40 border border-[#f59e0b]/40 text-[#fde68a] flex-1">
            <span className="text-sm">🦁</span>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold leading-tight">Zoos</span>
              <span className="text-xs font-mono font-bold text-white">{zoos.length}</span>
            </div>
          </div>
        </div>

        <div className="text-[8.5px] font-mono text-outline flex items-center justify-between border-t border-outline-variant/20 pt-1.5">
          <span className="flex items-center gap-1 text-[#10b981]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
            ODbL & OpenMapTiles Attributed
          </span>
          <span>OSRM Routing</span>
        </div>
      </div>
    </div>
  );
};

export default MapView;
