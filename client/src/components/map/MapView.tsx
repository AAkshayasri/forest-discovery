import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

interface Forest {
  id: number;
  name: string;
  country: string;
  state: string;
  latitude: number;
  longitude: number;
  boundary?: any;
  description: string;
  area?: string;
  climate?: string;
}

interface Zoo {
  id: number;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  notable_species: string;
}

interface MapViewProps {
  forests: Forest[];
  selectedForest: Forest | null;
  onForestSelect: (forest: Forest) => void;
  zoos: Zoo[];
  onZooSelect: (zoo: Zoo) => void;
  routePath: [number, number][] | null;
  initialCenter?: { lat: number; lng: number; zoom?: number } | null;
}

const getClimateStyle = (climate?: string) => {
  const c = (climate || '').toLowerCase();
  if (c.includes('rain') || c.includes('tropical') || c.includes('monsoon') || c.includes('humid') || c.includes('evergreen')) {
    return {
      color: '#10b981',
      weight: 2.5,
      opacity: 0.95,
      fillColor: '#064e3b',
      fillOpacity: 0.35,
      dashArray: '4, 4'
    };
  }
  if (c.includes('boreal') || c.includes('temperate') || c.includes('conifer') || c.includes('alpine') || c.includes('cold') || c.includes('taiga')) {
    return {
      color: '#38bdf8',
      weight: 2.5,
      opacity: 0.95,
      fillColor: '#075985',
      fillOpacity: 0.35,
      dashArray: '4, 4'
    };
  }
  if (c.includes('arid') || c.includes('dry') || c.includes('savanna') || c.includes('mediterranean') || c.includes('desert') || c.includes('semi-arid')) {
    return {
      color: '#f59e0b',
      weight: 2.5,
      opacity: 0.95,
      fillColor: '#78350f',
      fillOpacity: 0.35,
      dashArray: '4, 4'
    };
  }
  return {
    color: '#a5d0b9',
    weight: 2.5,
    opacity: 0.9,
    fillColor: '#1b4332',
    fillOpacity: 0.3,
    dashArray: '4, 4'
  };
};

export const MapView: React.FC<MapViewProps> = ({
  forests,
  selectedForest,
  onForestSelect,
  zoos,
  onZooSelect,
  routePath,
  initialCenter
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerGroupRef = useRef<L.LayerGroup | null>(null);
  const zooMarkerGroupRef = useRef<L.LayerGroup | null>(null);
  const boundaryLayerRef = useRef<L.GeoJSON | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const [zoomLevel, setZoomLevel] = useState(4);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create Leaflet map centered to show the complete world map by default
    const mapBounds = L.latLngBounds([-85, -180], [85, 180]);
    const initialLat = initialCenter?.lat ?? 15;
    const initialLng = initialCenter?.lng ?? 0;
    const initialZoom = initialCenter?.zoom ?? 2;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      minZoom: 2,
      maxZoom: 18,
      maxBounds: mapBounds,
      maxBoundsViscosity: 1.0,
      worldCopyJump: false,
      zoomControl: false
    });

    // High-quality Satellite Tiles from Esri
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 18,
      bounds: mapBounds,
      noWrap: true
    }).addTo(map);

    // Add zoom control at bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Track zoom events to re-trigger clustering calculations
    map.on('zoomend', () => {
      setZoomLevel(map.getZoom());
    });

    mapRef.current = map;
    markerGroupRef.current = L.layerGroup().addTo(map);
    zooMarkerGroupRef.current = L.layerGroup().addTo(map);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Center when initialCenter changes dynamically
  useEffect(() => {
    if (mapRef.current && initialCenter) {
      mapRef.current.flyTo(
        [initialCenter.lat, initialCenter.lng],
        initialCenter.zoom || 8,
        { animate: true, duration: 1.2 }
      );
    }
  }, [initialCenter]);

  // Calculate & Draw Clusters for Forests
  useEffect(() => {
    const map = mapRef.current;
    const markerGroup = markerGroupRef.current;
    if (!map || !markerGroup) return;

    markerGroup.clearLayers();

    // Determine cluster grid spacing based on zoom level (tolerance in degrees)
    let tolerance = 0;
    if (zoomLevel < 4) tolerance = 15;
    else if (zoomLevel < 6) tolerance = 8;
    else if (zoomLevel < 8) tolerance = 3;
    else if (zoomLevel < 10) tolerance = 0.8;

    const clusters: {
      latitude: number;
      longitude: number;
      forests: Forest[];
    }[] = [];

    // Group forests into clusters mathematically
    forests.forEach(forest => {
      if (tolerance === 0) {
        clusters.push({
          latitude: forest.latitude,
          longitude: forest.longitude,
          forests: [forest]
        });
      } else {
        const matchingCluster = clusters.find(c => 
          Math.abs(c.latitude - forest.latitude) < tolerance &&
          Math.abs(c.longitude - forest.longitude) < tolerance
        );

        if (matchingCluster) {
          matchingCluster.forests.push(forest);
          matchingCluster.latitude = matchingCluster.forests.reduce((sum, f) => sum + f.latitude, 0) / matchingCluster.forests.length;
          matchingCluster.longitude = matchingCluster.forests.reduce((sum, f) => sum + f.longitude, 0) / matchingCluster.forests.length;
        } else {
          clusters.push({
            latitude: forest.latitude,
            longitude: forest.longitude,
            forests: [forest]
          });
        }
      }
    });

    // Draw clustered markers
    clusters.forEach(cluster => {
      if (cluster.forests.length > 1) {
        // Draw Cluster Marker
        const clusterIcon = L.divIcon({
          className: 'custom-cluster-icon',
          html: `
            <div class="relative flex items-center justify-center w-10 h-10 cursor-pointer">
              <div class="absolute w-8 h-8 bg-[#1b4332]/85 rounded-full border border-[#a5d0b9]/65 flex items-center justify-center shadow-lg font-bold text-xs text-[#a5d0b9] font-mono">
                ${cluster.forests.length}
              </div>
              <div class="absolute w-10 h-10 bg-[#a5d0b9]/25 rounded-full animate-ping -z-10"></div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        const marker = L.marker([cluster.latitude, cluster.longitude], { icon: clusterIcon });
        
        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          map.flyTo([cluster.latitude, cluster.longitude], zoomLevel + 2, {
            animate: true,
            duration: 1.0
          });
        });

        marker.addTo(markerGroup);
      } else {
        // Draw Single Forest Marker
        const forest = cluster.forests[0];
        const pulseIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `
            <div class="relative flex items-center justify-center w-8 h-8 cursor-pointer">
              <div class="absolute w-6 h-6 bg-[#a5d0b9] rounded-full opacity-40 animate-ping"></div>
              <div class="absolute w-4 h-4 bg-[#1b4332] rounded-full border border-[#a5d0b9]/40 flex items-center justify-center shadow-md">
                <div class="w-1.5 h-1.5 bg-[#a5d0b9] rounded-full"></div>
              </div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const marker = L.marker([forest.latitude, forest.longitude], { icon: pulseIcon });

        const popupContent = `
          <div class="p-2 select-none text-[#e5e2e1] font-body-md text-left">
            <h4 class="font-bold text-[#a5d0b9] text-xs sm:text-sm leading-tight font-headline-md">${forest.name}</h4>
            <p class="text-[10px] sm:text-[11px] text-[#c1c8c2] mt-0.5">${forest.state}, ${forest.country}</p>
            <button id="btn-forest-${forest.id}" class="mt-2.5 text-[10px] sm:text-[11px] font-semibold text-[#a5d0b9] bg-[#1b4332] hover:bg-[#1b4332]/95 px-3 py-1.5 rounded transition-all w-full cursor-pointer border border-[#a5d0b9]/20 font-label-sm">
              Explore Details
            </button>
          </div>
        `;

        marker.bindPopup(popupContent, {
          closeButton: false,
          offset: [0, -10]
        });

        marker.on('popupopen', () => {
          const button = document.getElementById(`btn-forest-${forest.id}`);
          if (button) {
            button.onclick = (e) => {
              e.stopPropagation();
              onForestSelect(forest);
              marker.closePopup();
            };
          }
        });

        marker.addTo(markerGroup);
      }
    });
  }, [forests, onForestSelect, zoomLevel]);

  // Draw Zoo Markers
  useEffect(() => {
    const map = mapRef.current;
    const zooMarkerGroup = zooMarkerGroupRef.current;
    if (!map || !zooMarkerGroup) return;

    zooMarkerGroup.clearLayers();

    zoos.forEach(zoo => {
      const zooIcon = L.divIcon({
        className: 'custom-zoo-icon',
        html: `
          <div class="relative flex items-center justify-center w-8 h-8 cursor-pointer">
            <div class="absolute w-6 h-6 bg-[#f7b28c] rounded-full opacity-40 animate-pulse"></div>
            <div class="absolute w-4 h-4 bg-[#e65f2b] rounded-full border border-[#f7b28c]/45 flex items-center justify-center shadow-md">
              <div class="w-1.5 h-1.5 bg-[#f7b28c] rounded-full"></div>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([zoo.latitude, zoo.longitude], { icon: zooIcon });

      const popupContent = `
        <div class="p-2 select-none text-[#e5e2e1] font-body-md text-left">
          <span class="px-1.5 py-0.5 rounded bg-[#e65f2b]/20 border border-[#e65f2b]/30 text-[8px] font-bold text-[#f7b28c] uppercase tracking-wider block w-fit mb-1 font-label-sm">Zoo / Conservation</span>
          <h4 class="font-bold text-[#f7b28c] text-xs sm:text-sm leading-tight font-headline-md">${zoo.name}</h4>
          <p class="text-[10px] sm:text-[11px] text-[#c1c8c2] mt-0.5">${zoo.country}</p>
          <p class="text-[9px] text-[#a5d0b9] mt-1 italic">Notable: ${zoo.notable_species}</p>
          <button id="btn-zoo-${zoo.id}" class="mt-2.5 text-[10px] sm:text-[11px] font-semibold text-[#f7b28c] bg-[#e65f2b]/30 hover:bg-[#e65f2b]/40 px-3 py-1.5 rounded transition-all w-full cursor-pointer border border-[#e65f2b]/40 font-label-sm">
            Select Destination
          </button>
        </div>
      `;

      marker.bindPopup(popupContent, {
        closeButton: false,
        offset: [0, -10]
      });

      marker.on('popupopen', () => {
        const button = document.getElementById(`btn-zoo-${zoo.id}`);
        if (button) {
          button.onclick = (e) => {
            e.stopPropagation();
            onZooSelect(zoo);
            marker.closePopup();
          };
        }
      });

      marker.addTo(zooMarkerGroup);
    });
  }, [zoos, onZooSelect]);

  // Handle Forest Selection (Draw Boundary Polygon + Fly To)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous boundaries
    if (boundaryLayerRef.current) {
      map.removeLayer(boundaryLayerRef.current);
      boundaryLayerRef.current = null;
    }

    if (selectedForest) {
      if (selectedForest.boundary) {
        const style = getClimateStyle(selectedForest.climate);
        const geoJsonLayer = L.geoJSON(selectedForest.boundary, {
          style: style
        }).addTo(map);

        boundaryLayerRef.current = geoJsonLayer;
        map.fitBounds(geoJsonLayer.getBounds(), { padding: [60, 60], maxZoom: 9 });
      } else {
        map.flyTo([selectedForest.latitude, selectedForest.longitude], 8, {
          animate: true,
          duration: 1.2
        });
      }
    }
  }, [selectedForest]);

  // Draw routing polyline
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    if (routePath && routePath.length > 0) {
      const polyline = L.polyline(routePath, {
        color: '#f7b28c',
        weight: 3.5,
        opacity: 0.9,
        dashArray: '6, 10',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Fit map boundary to show full route
      map.fitBounds(polyline.getBounds(), { padding: [60, 60] });
      routePolylineRef.current = polyline;
    }
  }, [routePath]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
