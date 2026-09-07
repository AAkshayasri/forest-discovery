import { geospatialService } from './geospatialService.js';

export const routingService = {
  /**
   * Generates travel routing information between two coordinates
   * @param {number} startLat Starting latitude
   * @param {number} startLng Starting longitude
   * @param {number} destLat Destination latitude
   * @param {number} destLng Destination longitude
   */
  calculateRoute: (startLat, startLng, destLat, destLng) => {
    const distanceKm = geospatialService.calculateDistance(startLat, startLng, destLat, destLng);
    
    // Assume average transit speed:
    // Under 500km: Driving (average 80 km/h)
    // Above 500km: Flight (average 750 km/h)
    let mode = 'driving';
    let speed = 80;
    if (distanceKm > 500) {
      mode = 'flight';
      speed = 750;
    }
    
    const travelTimeHours = distanceKm / speed;
    const formattedDuration = travelTimeHours < 1 
      ? `${Math.round(travelTimeHours * 60)} minutes`
      : `${Math.floor(travelTimeHours)}h ${Math.round((travelTimeHours % 1) * 60)}m`;

    // Generate step points for visual polyline mapping (curved path helper for leaflet)
    // Simply interpolate points between start and destination with a minor offset for curve
    const steps = 10;
    const pathCoordinates = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Linear interpolation
      let lat = startLat + (destLat - startLat) * t;
      let lng = startLng + (destLng - startLng) * t;
      
      // Add slight height curvature in the middle to make it look like a flight/travel arc
      if (mode === 'flight') {
        const curvature = Math.sin(t * Math.PI) * (distanceKm * 0.001); // curve amplitude proportional to distance
        lat += curvature;
      }
      pathCoordinates.push([Number(lat.toFixed(5)), Number(lng.toFixed(5))]);
    }

    return {
      distanceKm,
      mode,
      duration: formattedDuration,
      path: pathCoordinates
    };
  }
};
