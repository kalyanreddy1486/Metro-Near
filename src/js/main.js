// MetroNear - Simplified Working Version
// Focus: Bangalore only, Google autocomplete + geocoding, OpenRouteService/heuristic routing

import { API_CONFIG, isGoogleMapsConfigured } from './config.js';
import { DistanceUtils, RoutingAPI } from './apiUtils.js';

// Global state
let metroStations = [];
let map;
let stationMarkers = [];
let destinationMarker = null;

// Load Bangalore metro stations
async function loadMetroStations() {
    try {
        const response = await fetch('src/data/bangalore3.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        metroStations = await response.json();
        console.log(`Loaded ${metroStations.length} Bangalore stations`);
        addStationMarkersToMap();
    } catch (error) {
        console.error('Failed to load stations:', error);
        alert('Failed to load metro station data');
    }
}

// Add markers to map
function addStationMarkersToMap() {
    if (!map) return;
    
    // Clear existing
    stationMarkers.forEach(m => map.removeLayer(m));
    stationMarkers = [];
    
    metroStations.forEach(station => {
        const color = station.line === 'Purple Line' ? '#8e44ad' : 
                     station.line === 'Green Line' ? '#27ae60' : 
                     station.line === 'Yellow Line' ? '#f1c40f' : '#95a5a6';
        const letter = station.line === 'Purple Line' ? 'P' : 
                      station.line === 'Green Line' ? 'G' : 
                      station.line === 'Yellow Line' ? 'Y' : '?';
        
        const icon = L.divIcon({
            className: 'station-marker',
            html: `<div style="background:${color};color:white;width:25px;height:25px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;">${letter}</div>`,
            iconSize: [25, 25],
            iconAnchor: [12, 12]
        });
        
        const marker = L.marker([station.lat, station.lng], { icon }).addTo(map);
        marker.bindPopup(`<b>${station.name}</b><br>${station.line}`);
        stationMarkers.push(marker);
    });
}

// Load Google Maps JS SDK (Places library) safely in browser
async function loadGoogleMapsSdk() {
    if (window.google && window.google.maps && window.google.maps.places) {
        return;
    }

    // Do not hard-fail on our own check; let Google SDK report any key issues.
    if (!API_CONFIG.GOOGLE_MAPS_API_KEY || API_CONFIG.GOOGLE_MAPS_API_KEY.trim() === '') {
        throw new Error('Google Maps API key is empty. Please set it in config.');
    }

    await new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-maps-sdk="true"]');
        if (existing) {
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', reject);
            return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(API_CONFIG.GOOGLE_MAPS_API_KEY)}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.dataset.mapsSdk = 'true';
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Initialize map and UI
document.addEventListener('DOMContentLoaded', async () => {
    const input = document.getElementById('destination-input');
    const btn = document.getElementById('find-station-btn');
    const resultsDiv = document.getElementById('results-container');
    
    // Init map centered on Bangalore
    map = L.map('map').setView([12.9716, 77.5946], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);
    
    // Load metro stations
    await loadMetroStations();

    // Set up Google Places Autocomplete on the input
    let selectedCoordinates = null; // Store selected autocomplete coordinates

    try {
        await loadGoogleMapsSdk();
        const autocomplete = new google.maps.places.Autocomplete(input, {
            // No type restriction: allow addresses + POIs
            componentRestrictions: { country: 'in' },
            fields: ['geometry', 'formatted_address', 'name', 'place_id']
        });

        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place && place.geometry && place.geometry.location) {
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                selectedCoordinates = [lat, lng];
                console.log('Google Places selected coordinates:', selectedCoordinates, place.formatted_address);
            } else {
                selectedCoordinates = null;
            }
        });
    } catch (e) {
        console.error('Failed to load Google Maps SDK or setup autocomplete:', e);
    }
    
    // Button click handler
    btn.addEventListener('click', handleSearch);
    
    // Enter key handler
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    
    async function handleSearch() {
        const query = input.value.trim();
        if (!query) {
            alert('Please enter a destination');
            return;
        }
        
        btn.disabled = true;
        btn.textContent = 'Searching...';
        resultsDiv.innerHTML = '<p>Calculating...</p>';
        
        try {
            let coords;
            
            // Check if coordinates entered directly
            const coordMatch = query.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
            if (coordMatch) {
                coords = [parseFloat(coordMatch[1]), parseFloat(coordMatch[2])];
                console.log('Using coordinates:', coords);
            } else if (selectedCoordinates) {
                // Use stored coordinates from autocomplete selection
                coords = selectedCoordinates;
                console.log('Using stored autocomplete coordinates:', coords);
            } else {
                // Geocode the location: use Google Maps JS SDK (no CORS), then optional fallback
                try {
                    coords = await geocodeLocationWithGoogleSdk(query);
                    console.log('Geocoded with Google JS SDK to:', coords);
                } catch (geoError) {
                    console.error('Google JS SDK geocoding failed:', geoError);
                    throw geoError;
                }
            }
            
            // Validate coordinates
            if (!DistanceUtils.validateCoordinates(coords[0], coords[1])) {
                throw new Error('Invalid coordinates');
            }
            
            // Add destination marker
            if (destinationMarker) map.removeLayer(destinationMarker);
            destinationMarker = L.marker(coords).addTo(map);
            destinationMarker.bindPopup('Your destination').openPopup();
            // Only pan to location if it's far from current view (more than 5km)
            const currentCenter = map.getCenter();
            const distanceFromCenter = DistanceUtils.calculateHaversineDistance(
                currentCenter.lat, currentCenter.lng,
                coords[0], coords[1]
            );
            if (distanceFromCenter > 5) {
                map.setView(coords, 14);
            }
            
            // Find best stations
            await findBestStations(coords, resultsDiv);
            
        } catch (error) {
            console.error('Search error:', error);
            resultsDiv.innerHTML = `<p style="color:red">Error: ${error.message}</p>`;
        } finally {
            btn.disabled = false;
            btn.textContent = 'Find Best Station';
        }
    }
});

// Geocode location using Google Maps JS SDK (preferred, no CORS issues)
async function geocodeLocationWithGoogleSdk(query) {
    if (!window.google || !google.maps || !google.maps.Geocoder) {
        throw new Error('Google Maps JS SDK not loaded');
    }

    // Let Google resolve the full place text across India (no Bangalore forcing)
    const searchQuery = query;

    const geocoder = new google.maps.Geocoder();

    const response = await new Promise((resolve, reject) => {
        geocoder.geocode(
            { address: searchQuery },
            (results, status) => {
                if (status === 'OK' && results && results.length > 0) {
                    resolve(results);
                } else if (status === 'ZERO_RESULTS') {
                    reject(new Error(`Location '${query}' not found. Try a different place or use coordinates (lat, lng).`));
                } else {
                    reject(new Error(`Google geocoding failed with status: ${status}`));
                }
            }
        );
    });

    console.log('Google JS SDK geocoding results:', response);

    // Prefer results within Bangalore bounds if possible
    const bangaloreBounds = {
        minLat: 12.8,
        maxLat: 13.2,
        minLng: 77.4,
        maxLng: 77.8
    };

    const bangaloreResults = response.filter(r => {
        const loc = r.geometry?.location;
        if (!loc) return false;
        const lat = loc.lat();
        const lng = loc.lng();
        return lat >= bangaloreBounds.minLat && lat <= bangaloreBounds.maxLat &&
               lng >= bangaloreBounds.minLng && lng <= bangaloreBounds.maxLng;
    });

    const bestResult = bangaloreResults.length > 0 ? bangaloreResults[0] : response[0];
    const loc = bestResult.geometry.location;
    const coords = [loc.lat(), loc.lng()];

    console.log('Google JS SDK geocoded to:', coords);
    console.log('Google JS SDK location details:', bestResult);
    return coords;
}

// Find best stations
async function findBestStations(destinationCoords, resultsDiv) {
    console.log('Finding best stations for coords:', destinationCoords);
    console.log('Total stations loaded:', metroStations.length);
    
    if (metroStations.length === 0) {
        resultsDiv.innerHTML = '<p style="color:red">Error: No metro stations loaded</p>';
        return;
    }
    
    // Calculate straight-line distance to all stations
    const stationsWithDistance = metroStations.map(station => ({
        ...station,
        straightDistance: DistanceUtils.calculateHaversineDistance(
            destinationCoords[0], destinationCoords[1],
            station.lat, station.lng
        )
    }));
    
    // Deduplicate interchange stations (same coordinates, different lines)
    // Keep only the first occurrence of each unique coordinate pair
    const seenCoords = new Set();
    const uniqueStations = stationsWithDistance.filter(station => {
        const coordKey = `${station.lat.toFixed(6)},${station.lng.toFixed(6)}`;
        if (seenCoords.has(coordKey)) {
            return false; // Skip duplicate
        }
        seenCoords.add(coordKey);
        return true;
    });
    
    console.log(`Deduplicated ${stationsWithDistance.length} stations to ${uniqueStations.length} unique locations`);
    
    // Sort by straight-line distance
    // Use spread operator to avoid mutating original array
    const sortedByDistance = [...uniqueStations].sort((a, b) => a.straightDistance - b.straightDistance);
    
    // Use radius-based filtering - include stations within 50km
    const MAX_RADIUS_KM = 50;
    const candidateStations = sortedByDistance.filter(s => s.straightDistance <= MAX_RADIUS_KM);
    
    console.log(`Found ${candidateStations.length} stations within ${MAX_RADIUS_KM}km`);
    console.log('Top 10 closest by straight-line:', candidateStations.slice(0, 10).map(s => ({
        name: s.name,
        distance: s.straightDistance.toFixed(2) + ' km'
    })));
    
    // Calculate road routes
    let stationsWithRoutes;
    
    try {
        const routeResults = await RoutingAPI.calculateBatchRoutesViaBackend(
            destinationCoords,
            candidateStations,
            'driving'
        );

        stationsWithRoutes = candidateStations.map((station, i) => {
            const result = routeResults[i];
            if (result.status === 'fulfilled' && result.value && !result.value.isFallback) {
                return {
                    ...station,
                    roadDistance: result.value.distance,
                    duration: result.value.duration,
                    isApiResult: true
                };
            } else {
                const roadDist = station.straightDistance * 1.3;
                const timeMinutes = (roadDist / 25) * 60 + (roadDist * 0.5);
                return {
                    ...station,
                    roadDistance: roadDist,
                    duration: Math.max(timeMinutes * 60, 120),
                    isApiResult: false
                };
            }
        });

        const apiCount = stationsWithRoutes.filter(s => s.isApiResult).length;
        const fallbackCount = stationsWithRoutes.length - apiCount;
        console.log(`Backend/Google routes: ${apiCount} API, ${fallbackCount} fallback`);
    } catch (error) {
        console.warn('Routing backend failed, using heuristics for all:', error);
        stationsWithRoutes = calculateFallbackRoutes(candidateStations);
    }
    
    // Sort by travel time (fastest first) - use spread to avoid mutation
    const sortedByTime = [...stationsWithRoutes].sort((a, b) => a.duration - b.duration);
    
    console.log('Sorted by time (top 10):', sortedByTime.slice(0, 10).map(s => ({
        name: s.name,
        time: Math.round(s.duration/60) + ' mins',
        distance: s.roadDistance.toFixed(1) + ' km'
    })));
    
    // Display top 10
    const topStations = sortedByTime.slice(0, 10);
    console.log('Displaying', topStations.length, 'stations');
    displayResults(topStations, resultsDiv);
}

// Fallback route calculation
function calculateFallbackRoutes(stations) {
    return stations.map(station => {
        const roadDist = station.straightDistance * 1.3;
        const timeMinutes = (roadDist / 25) * 60 + (roadDist * 0.5);
        return {
            ...station,
            roadDistance: roadDist,
            duration: Math.max(timeMinutes * 60, 120),
            isApiResult: false
        };
    });
}

// Display results
function displayResults(stations, resultsDiv) {
    if (stations.length === 0) {
        resultsDiv.innerHTML = '<p>No stations found</p>';
        return;
    }
    
    // Check if any results are fallback
    const hasFallback = stations.some(s => !s.isApiResult);
    
    let html = '<h3>Recommended Stations</h3>';
    
    // Add fallback notice if needed
    if (hasFallback) {
        html += `
            <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 10px; margin-bottom: 15px; font-size: 0.9rem; color: #856404;">
                ⚠️ Some results use estimated travel times (marked with ⚠️). Real-time routing data unavailable.
            </div>
        `;
    }
    
    stations.forEach((station, index) => {
        const timeMin = Math.round(station.duration / 60);
        const distKm = station.roadDistance.toFixed(1);
        const isRecommended = index === 0;
        const fallbackIndicator = station.isApiResult ? '' : ' ⚠️ <span style="font-size: 0.7rem; color: #f39c12;">(estimated)</span>';
        const fallbackBorder = station.isApiResult ? (isRecommended ? '#f39c12' : '#ddd') : '#ffc107';
        const fallbackBg = station.isApiResult ? (isRecommended ? '#fff9e6' : 'white') : '#fffbf0';
        
        html += `
            <div style="border: 2px solid ${fallbackBorder}; 
                        border-radius: 8px; 
                        padding: 15px; 
                        margin: 10px 0;
                        background: ${fallbackBg};">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h4 style="margin: 0;">${station.name} (${station.line})${fallbackIndicator}</h4>
                    ${isRecommended ? '<span style="background: #f39c12; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">RECOMMENDED</span>' : ''}
                </div>
                <div style="margin-top: 10px;">
                    <span style="background: #3498db; color: white; padding: 5px 10px; border-radius: 15px; margin-right: 10px;">⏱️ ${timeMin} mins</span>
                    <span style="background: #e74c3c; color: white; padding: 5px 10px; border-radius: 15px;">📍 ${distKm} km</span>
                </div>
            </div>
        `;
    });
    
    resultsDiv.innerHTML = html;
}
