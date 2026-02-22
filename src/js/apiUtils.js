// API Utility Functions for MetroNear
import { API_CONFIG, isOpenRouteServiceConfigured } from './config.js';

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

// Coordinate normalization utilities
export const CoordinateUtils = {
    // Ensure coordinates are in [longitude, latitude] format (GeoJSON standard)
    normalizeToGeoJSON(lat, lng) {
        return [parseFloat(lng), parseFloat(lat)];
    },
    
    // Ensure coordinates are in [latitude, longitude] format (standard for most APIs)
    normalizeToStandard(lat, lng) {
        return [parseFloat(lat), parseFloat(lng)];
    },
    
    // Convert from GeoJSON [lng, lat] to standard [lat, lng]
    geoJSONToStandard(geoJSONCoords) {
        return [geoJSONCoords[1], geoJSONCoords[0]];
    },
    
    // Convert from standard [lat, lng] to GeoJSON [lng, lat]
    standardToGeoJSON(standardCoords) {
        return [standardCoords[1], standardCoords[0]];
    }
};

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
                    station.latitude, station.longitude
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

// OpenRouteService API handler
export const RoutingAPI = {
    // Calculate route using OpenRouteService
    async calculateRoute(startCoords, endCoords, profile = 'foot-walking') {
        // Validate coordinates
        if (!DistanceUtils.validateCoordinates(startCoords[0], startCoords[1]) ||
            !DistanceUtils.validateCoordinates(endCoords[0], endCoords[1])) {
            throw new Error('Invalid coordinates provided');
        }
        
        // Check if API is configured
        if (!isOpenRouteServiceConfigured()) {
            throw new Error('OpenRouteService API not configured');
        }
        
        // Create cache key
        const cacheKey = `${startCoords.join(',')}-${endCoords.join(',')}-${profile}`;
        
        // Check cache first
        if (this.isCached(cacheKey)) {
            const cachedResult = this.getFromCache(cacheKey);
            console.debug(`Using cached route for ${cacheKey}`);
            return cachedResult;
        }
        
        try {
            console.debug(`Calculating route from [${startCoords.join(',')}] to [${endCoords.join(',')}]`);
            
            const url = `${API_CONFIG.OPENROUTESERVICE_BASE_URL}/directions/${profile}`;
            
            const requestBody = {
                coordinates: [
                    CoordinateUtils.normalizeToGeoJSON(startCoords[0], startCoords[1]),
                    CoordinateUtils.normalizeToGeoJSON(endCoords[0], endCoords[1])
                ],
                format: 'json',
                units: 'km',
                instructions: false // Reduce response size
            };
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': API_CONFIG.OPENROUTESERVICE_TOKEN,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`OpenRouteService API error ${response.status}: ${errorText}`);
                
                if (response.status === 429) {
                    throw new Error('Rate limit exceeded - too many requests');
                } else if (response.status === 401) {
                    throw new Error('Invalid API key for OpenRouteService');
                } else if (response.status === 400) {
                    throw new Error(`Invalid request: ${errorText}`);
                }
                throw new Error(`OpenRouteService API error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Process response to extract distance and duration
            const route = this.processRouteResponse(data);
            
            // Cache the result
            this.cacheResult(cacheKey, route);
            
            console.debug(`Route calculated successfully: ${route.distance}km in ${Math.round(route.duration/60)} minutes`);
            return route;
            
        } catch (error) {
            console.error('Error calling OpenRouteService API:', error);
            throw error;
        }
    },
    
    // Batch calculate routes for multiple stations with improved error handling
    async calculateBatchRoutes(destinationCoords, stations, profile = 'foot-walking') {
        console.debug(`Calculating batch routes for ${stations.length} stations`);
        
        const promises = stations.map(station => 
            this.calculateRoute(
                [destinationCoords[0], destinationCoords[1]], 
                [station.latitude, station.longitude], 
                profile
            ).catch(error => {
                // Fallback to haversine distance calculation
                console.warn(`Route calculation failed for ${station.name}:`, error.message);
                const distance = DistanceUtils.calculateHaversineDistance(
                    destinationCoords[0], destinationCoords[1],
                    station.latitude, station.longitude
                );
                return {
                    distance: distance,
                    duration: distance * 12 * 60, // Estimate: 12 minutes per km for walking (converted to seconds)
                    isFallback: true,
                    error: error.message,
                    stationName: station.name
                };
            })
        );
        
        const results = await Promise.allSettled(promises);
        
        // Log summary of results
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        const fallback = results.filter(r => r.status === 'fulfilled' && r.value?.isFallback).length;
        
        console.debug(`Batch route calculation complete: ${successful} successful, ${failed} failed, ${fallback} fallback`);
        
        return results;
    },
    
    // Process OpenRouteService response with validation
    processRouteResponse(data) {
        if (!data.routes || data.routes.length === 0) {
            throw new Error('No routes found in response');
        }
        
        const route = data.routes[0];
        
        if (!route.summary) {
            throw new Error('Invalid route response format');
        }
        
        // Validate and normalize values
        const distance = parseFloat(route.summary.distance) || 0;
        const duration = parseFloat(route.summary.duration) || 0;
        
        if (distance <= 0 || duration <= 0) {
            throw new Error('Invalid route data: distance or duration is zero/negative');
        }
        
        return {
            distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
            duration: Math.round(duration), // Round to nearest second
            isFallback: false
        };
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