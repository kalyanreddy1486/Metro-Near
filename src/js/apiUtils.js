// API Utility Functions for MetroNear
import { API_CONFIG } from './config.js';

// Cache for route calculations to prevent repeated requests
const routeCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
const MAX_CACHE_SIZE = 50; // Limit cache size to prevent memory issues

// Clean up old cache entries periodically
function cleanupCache() {
    const now = Date.now();
    for (const [key, value] of routeCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            routeCache.delete(key);
        }
    }
}

// Haversine distance calculation for nearby station filtering
export const DistanceUtils = {
    // Calculate distance between two coordinates using Haversine formula
    // Returns distance in kilometers with high precision
    calculateHaversineDistance(lat1, lng1, lat2, lng2) {
        const R = 6371.0088; // Earth radius in km (more precise value)
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lng2 - lng1);
        
        const sinDLat = Math.sin(dLat / 2);
        const sinDLon = Math.sin(dLon / 2);
        
        const a = sinDLat * sinDLat +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            sinDLon * sinDLon;
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // Distance in km
        
        // Return with reasonable precision (2 decimal places)
        return Math.round(distance * 100) / 100;
    },
    
    // Convert degrees to radians
    deg2rad(deg) {
        return deg * (Math.PI / 180);
    },
    
    // Filter stations within radius using Haversine distance
    // Returns filtered stations with distance information
    filterStationsWithinRadius(destinationCoords, stations, radiusKm = 5) {
        const [destLat, destLng] = destinationCoords;
        
        const filteredStations = stations
            .map(station => {
                const distance = this.calculateHaversineDistance(
                    destLat, destLng, 
                    station.lat, station.lng
                );
                return {
                    ...station,
                    distance: distance
                };
            })
            .filter(stationWithDistance => stationWithDistance.distance <= radiusKm)
            .sort((a, b) => a.distance - b.distance); // Sort by distance (closest first)
        
        return filteredStations;
    },
    
    // Validate coordinate ranges
    validateCoordinates(lat, lng) {
        return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    }
};

// Routing API handler (Google Distance Matrix via backend + heuristics fallback)
export const RoutingAPI = {
    // Batch calculate routes by calling our backend (Google Distance Matrix)
    async calculateBatchRoutesViaBackend(destinationCoords, stations, mode = 'driving') {
        console.debug(`Calling backend for ${stations.length} routes`);

        const cacheKey = `backend:${destinationCoords.join(',')}:${mode}:${stations
            .map(s => `${s.lat},${s.lng}`)
            .join('|')}`;

        if (this.isCached(cacheKey)) {
            console.debug('Using cached backend routing result');
            return this.getFromCache(cacheKey);
        }

        const body = {
            origin: { lat: destinationCoords[0], lng: destinationCoords[1] },
            destinations: stations.map(s => ({ lat: s.lat, lng: s.lng })),
            mode
        };

        const response = await fetch(`${API_CONFIG.ROUTING_BACKEND_BASE_URL}/routes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const text = await response.text();
            console.error('Backend routing HTTP error', response.status, text);
            throw new Error(`Routing backend failed: ${response.status}`);
        }

        const data = await response.json();
        if (!data.results || !Array.isArray(data.results) || data.results.length !== stations.length) {
            console.error('Unexpected backend routing response shape', data);
            throw new Error('Routing backend returned invalid results');
        }

        const results = data.results.map((r, index) => {
            if (r.status === 'OK' && typeof r.distanceKm === 'number' && typeof r.durationSec === 'number') {
                return {
                    status: 'fulfilled',
                    value: {
                        distance: Math.round(r.distanceKm * 100) / 100,
                        duration: Math.round(r.durationSec),
                        isFallback: false
                    },
                    stationName: stations[index].name
                };
            }

            // Fallback for this element using heuristics
            const straightLineDistance = DistanceUtils.calculateHaversineDistance(
                destinationCoords[0], destinationCoords[1],
                stations[index].lat, stations[index].lng
            );

            let roadFactor;
            if (straightLineDistance < 1) {
                roadFactor = 1.5;
            } else if (straightLineDistance < 3) {
                roadFactor = 1.4;
            } else if (straightLineDistance < 5) {
                roadFactor = 1.35;
            } else if (straightLineDistance < 10) {
                roadFactor = 1.3;
            } else if (straightLineDistance < 20) {
                roadFactor = 1.25;
            } else {
                roadFactor = 1.2;
            }

            const estimatedRoadDistance = straightLineDistance * roadFactor;

            let avgSpeed;
            if (estimatedRoadDistance < 2) {
                avgSpeed = 18;
            } else if (estimatedRoadDistance < 5) {
                avgSpeed = 22;
            } else if (estimatedRoadDistance < 10) {
                avgSpeed = 26;
            } else if (estimatedRoadDistance < 20) {
                avgSpeed = 30;
            } else {
                avgSpeed = 35;
            }

            let travelTimeMinutes = (estimatedRoadDistance / avgSpeed) * 60;
            travelTimeMinutes += estimatedRoadDistance * 0.5;
            travelTimeMinutes = Math.max(2, travelTimeMinutes);

            return {
                status: 'fulfilled',
                value: {
                    distance: Math.round(estimatedRoadDistance * 100) / 100,
                    duration: Math.round(travelTimeMinutes * 60),
                    isFallback: true
                },
                stationName: stations[index].name
            };
        });

        this.cacheResult(cacheKey, results);
        return results;
    },
    
    // Cache management with size limiting
    isCached(key) {
        // Clean up old entries periodically
        if (routeCache.size > MAX_CACHE_SIZE) {
            cleanupCache();
        }
        
        const cached = routeCache.get(key);
        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
            return true;
        }
        if (cached && (Date.now() - cached.timestamp) >= CACHE_DURATION) {
            routeCache.delete(key); // Clean up expired cache
        }
        return false;
    },
    
    cacheResult(key, result) {
        // Remove oldest entry if cache is full
        if (routeCache.size >= MAX_CACHE_SIZE) {
            const oldestKey = routeCache.keys().next().value;
            routeCache.delete(oldestKey);
        }
        
        routeCache.set(key, {
            result: result,
            timestamp: Date.now()
        });
    },
    
    getFromCache(key) {
        const cached = routeCache.get(key);
        return cached?.result;
    },
    
    // Get cache statistics for debugging
    getCacheStats() {
        return {
            size: routeCache.size,
            maxSize: MAX_CACHE_SIZE,
            utilization: Math.round((routeCache.size / MAX_CACHE_SIZE) * 100)
        };
    }
};