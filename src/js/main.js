// MetroNear Application - Main JavaScript File
// This file handles the core functionality of the application

import { API_CONFIG, isValidConfig, isLocationIQConfigured, isOpenRouteServiceConfigured } from './config.js';
import { CoordinateUtils, DistanceUtils, RoutingAPI } from './apiUtils.js';
import { TestingUtils } from './testingUtils.js';

// Global variables
let metroStations = [];
let map;
let stationMarkers = [];
let destinationMarker = null;

// Load metro station data
async function loadMetroStations() {
    try {
        const response = await fetch('../assets/metro_stations.json');
        metroStations = await response.json();
        console.log(`Loaded ${metroStations.length} metro stations`);
        
        // Add station markers to the map
        addStationMarkersToMap();
    } catch (error) {
        console.error('Error loading metro station data:', error);
    }
}

// Add station markers to the map
function addStationMarkersToMap() {
    if (!map || !metroStations.length) return;
    
    metroStations.forEach(station => {
        // Create line-specific icons
        const lineColor = station.line === 'Purple Line' ? '#8e44ad' : '#27ae60';
        const lineLetter = station.line === 'Purple Line' ? 'P' : 'G';
        
        const stationIcon = L.divIcon({
            className: 'station-marker',
            html: `<div class="station-marker-inner" style="background-color: ${lineColor}">${lineLetter}</div>`,
            iconSize: [25, 25],
            iconAnchor: [12, 25],
            popupAnchor: [0, -25]
        });
        
        const marker = L.marker([station.latitude, station.longitude], { 
            icon: stationIcon,
            title: `${station.name} - ${station.line}`
        }).addTo(map);
        marker.bindPopup(`<b>${station.name}</b><br>${station.line}`);
        stationMarkers.push(marker);
    });
}

// Initialize LocationIQ Autocomplete
function initLocationIQAutocomplete() {
    if (!isValidConfig()) {
        console.warn('LocationIQ API token not configured. Please add your token to config.js');
        return;
    }
    
    const inputElement = document.getElementById('destination-input');
    
    // Clear any previous event listeners
    inputElement.removeEventListener('input', handleInput);
    
    // Add debounced input listener
    let timeout;
    inputElement.addEventListener('input', function(e) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            handleInput(e.target.value);
        }, 300); // Debounce for 300ms
    });
    
    // Handle input changes
    async function handleInput(query) {
        if (query.length < 3) {
            return; // Only search when 3 or more characters are entered
        }
        
        try {
            const results = await getLocationSuggestions(query);
            displaySuggestions(results);
        } catch (error) {
            console.error('Error fetching location suggestions:', error);
        }
    }
}

// Fetch location suggestions from LocationIQ API
async function getLocationSuggestions(query) {
    if (!isValidConfig()) {
        throw new Error('LocationIQ API token not configured');
    }
    
    const url = `${API_CONFIG.LOCATION_IQ_BASE_URL}/autocomplete?key=${API_CONFIG.LOCATION_IQ_TOKEN}&q=${encodeURIComponent(query)}&countrycodes=IN&limit=5&format=json&viewbox=77.47,13.15,77.75,12.79`; // Bangalore bbox
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`LocationIQ API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
}

// Display location suggestions
function displaySuggestions(suggestions) {
    // Remove any existing suggestion dropdown
    const existingDropdown = document.querySelector('.suggestions-dropdown');
    if (existingDropdown) {
        existingDropdown.remove();
    }
    
    if (!suggestions || suggestions.length === 0) {
        return;
    }
    
    const inputElement = document.getElementById('destination-input');
    const rect = inputElement.getBoundingClientRect();
    
    const dropdown = document.createElement('div');
    dropdown.className = 'suggestions-dropdown';
    dropdown.style.position = 'absolute';
    dropdown.style.top = `${rect.bottom}px`;
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.width = `${rect.width}px`;
    dropdown.style.backgroundColor = 'white';
    dropdown.style.border = '1px solid #ccc';
    dropdown.style.borderTop = 'none';
    dropdown.style.zIndex = '1000';
    dropdown.style.maxHeight = '200px';
    dropdown.style.overflowY = 'auto';
    
    suggestions.forEach((suggestion, index) => {
        const suggestionElement = document.createElement('div');
        suggestionElement.className = 'suggestion-item';
        suggestionElement.style.padding = '10px';
        suggestionElement.style.cursor = 'pointer';
        suggestionElement.style.borderBottom = index < suggestions.length - 1 ? '1px solid #eee' : 'none';
        suggestionElement.style.backgroundColor = '#fff';
        
        suggestionElement.textContent = suggestion.display_name;
        
        suggestionElement.addEventListener('click', () => {
            selectLocation(suggestion);
            dropdown.remove();
        });
        
        suggestionElement.addEventListener('mouseover', () => {
            suggestionElement.style.backgroundColor = '#f5f5f5';
        });
        
        suggestionElement.addEventListener('mouseout', () => {
            suggestionElement.style.backgroundColor = '#fff';
        });
        
        dropdown.appendChild(suggestionElement);
    });
    
    document.body.appendChild(dropdown);
    
    // Close dropdown when clicking elsewhere
    const closeDropdown = (e) => {
        if (!dropdown.contains(e.target) && e.target !== inputElement) {
            dropdown.remove();
            document.removeEventListener('click', closeDropdown);
        }
    };
    
    setTimeout(() => {
        document.addEventListener('click', closeDropdown);
    }, 10);
}

// Handle location selection
function selectLocation(location) {
    const inputElement = document.getElementById('destination-input');
    inputElement.value = location.display_name;
    
    // Clear any existing destination marker
    if (destinationMarker) {
        map.removeLayer(destinationMarker);
    }
    
    // Add destination marker to the map with custom styling
    const destinationIcon = L.divIcon({
        className: 'destination-marker',
        html: '<div class="destination-marker-inner">📍</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 30]
    });
    
    destinationMarker = L.marker([location.lat, location.lon], { icon: destinationIcon }).addTo(map);
    destinationMarker.bindPopup(`<b>Destination:</b><br>${location.display_name}`).openPopup();
    
    // Center and zoom the map to the selected location
    map.setView([parseFloat(location.lat), parseFloat(location.lon)], 14);
    
    console.log('Selected location:', location);
}

document.addEventListener('DOMContentLoaded', async function() {
    console.log('MetroNear application initialized');
    
    // DOM Elements
    const destinationInput = document.getElementById('destination-input');
    const findStationBtn = document.getElementById('find-station-btn');
    const mapContainer = document.getElementById('map');
    const resultsContainer = document.getElementById('results-container');
    
    // Initialize the application
    async function initApp() {
        setupEventListeners();
        await initializeMap();
        await loadMetroStations();
        
        // Initialize LocationIQ if configured
        if (isLocationIQConfigured()) {
            initLocationIQAutocomplete();
        } else {
            console.warn('LocationIQ API not configured - autocomplete disabled');
        }
        
        // Check OpenRouteService configuration
        if (!isOpenRouteServiceConfigured()) {
            console.warn('OpenRouteService API not configured - will use fallback distance calculations');
        }
    }
    
    // Set up event listeners
    function setupEventListeners() {
        findStationBtn.addEventListener('click', handleFindStation);
        
        // Keyboard navigation support
        destinationInput.addEventListener('keydown', function(e) {
            // Allow Enter key to trigger search
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent form submission
                handleFindStation();
            }
            
            // Allow Escape key to clear results
            if (e.key === 'Escape') {
                clearResults();
                destinationInput.value = '';
                destinationInput.focus();
            }
        });
        
        // Focus management for accessibility
        destinationInput.addEventListener('focus', function() {
            this.setAttribute('aria-expanded', 'true');
        });
        
        destinationInput.addEventListener('blur', function() {
            // Delay to allow click events on suggestions to fire first
            setTimeout(() => {
                this.setAttribute('aria-expanded', 'false');
            }, 200);
        });
    }
    
    // Initialize Leaflet map
    async function initializeMap() {
        // Bangalore coordinates as default view
        const bangaloreCoords = [12.9716, 77.5946];
        
        map = L.map(mapContainer).setView(bangaloreCoords, 12);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18,
        }).addTo(map);
        
        console.log('Map initialized');
    }
    
    // Handle the find station button click
    function handleFindStation() {
        const destination = destinationInput.value.trim();
        
        if (!destination) {
            alert('Please enter a destination');
            return;
        }
        
        console.log(`Finding best station for: ${destination}`);
        
        // Disable button during processing
        findStationBtn.disabled = true;
        findStationBtn.textContent = 'Searching...';
        
        // Get destination coordinates (this would come from the selected location)
        // For now, we'll use a default location in Bangalore
        const destinationCoords = [12.9716, 77.5946]; // Bangalore center
        
        // Find best stations using the routing API
        findBestStations(destination, destinationCoords);
    }
    
    // Find best stations using routing API with fallback
    async function findBestStations(destination, destinationCoords) {
        // Record search analytics
        TestingUtils.analytics.recordSearch();
        
        // Start performance measurement
        TestingUtils.startTimer('Total-Search');
        
        // Clear previous results
        clearResults();
        
        // Show loading state
        showLoadingState();
        
        try {
            console.debug(`Searching for best stations to: ${destination}`);
            console.debug(`Destination coordinates: [${destinationCoords.join(', ')}]`);
            
            TestingUtils.startTimer('Coordinate-Validation');
            
            // Validate destination coordinates
            if (!DistanceUtils.validateCoordinates(destinationCoords[0], destinationCoords[1])) {
                throw new Error('Invalid destination coordinates');
            }
            TestingUtils.endTimer('Coordinate-Validation');
            
            TestingUtils.startTimer('Station-Filtering');
            // Filter stations within 5km radius using enhanced Haversine distance
            const nearbyStations = DistanceUtils.filterStationsWithinRadius(
                destinationCoords, 
                metroStations, 
                5
            );
            TestingUtils.endTimer('Station-Filtering');
            
            console.debug(`Found ${nearbyStations.length} stations within 5km radius`);
            
            if (nearbyStations.length === 0) {
                console.debug('No stations found within radius');
                showNoStationsFound();
                return;
            }
            
            // Log closest stations for debugging
            console.debug('Closest stations:', nearbyStations.slice(0, 3).map(s => ({
                name: s.name,
                distance: s.distance,
                line: s.line
            })));
            
            TestingUtils.startTimer('Route-Calculations');
            // Calculate routes to nearby stations
            const routeResults = await RoutingAPI.calculateBatchRoutes(
                destinationCoords, 
                nearbyStations
            );
            TestingUtils.endTimer('Route-Calculations');
            
            // Process results and create station data with routing info
            const stationsWithRoutes = nearbyStations.map((station, index) => {
                const routeResult = routeResults[index];
                
                if (routeResult.status === 'fulfilled') {
                    console.debug(`Route to ${station.name}: ${routeResult.value.distance}km in ${Math.round(routeResult.value.duration/60)} mins`);
                    return {
                        ...station,
                        distance: routeResult.value.distance,
                        duration: routeResult.value.duration,
                        isFallback: routeResult.value.isFallback || false,
                        error: routeResult.value.error
                    };
                } else {
                    console.debug(`Fallback for ${station.name}: ${routeResult.reason?.message}`);
                    // Fallback to haversine distance if routing failed
                    const haversineDistance = DistanceUtils.calculateHaversineDistance(
                        destinationCoords[0], destinationCoords[1],
                        station.latitude, station.longitude
                    );
                    
                    return {
                        ...station,
                        distance: haversineDistance,
                        duration: haversineDistance * 12 * 60, // Estimate 12 min/km (converted to seconds)
                        isFallback: true,
                        error: routeResult.reason?.message || 'Routing calculation failed'
                    };
                }
            });
            
            // Sort by duration (fastest first) with distance as tie-breaker
            const sortedStations = stationsWithRoutes.sort((a, b) => {
                // Primary sort by duration
                const timeDifference = a.duration - b.duration;
                
                // Secondary sort by distance only if times are very close (within 2 minutes threshold)
                const timeThreshold = 120; // 2 minutes in seconds
                if (Math.abs(timeDifference) <= timeThreshold) {
                    return a.distance - b.distance; // Closer station wins tie
                }
                
                return timeDifference;
            });
            
            console.debug('Final ranking:', sortedStations.slice(0, 3).map((s, i) => ({
                rank: i + 1,
                name: s.name,
                time: Math.round(s.duration/60) + ' mins',
                distance: s.distance + ' km',
                isFallback: s.isFallback
            })));
            
            // Display only top 3 recommendations (limit to MVP requirements)
            const top3Stations = sortedStations.slice(0, 3);
            showStationResults(destination, top3Stations);
            
            // End total performance measurement
            TestingUtils.endTimer('Total-Search');
            
        } catch (error) {
            console.error('Error finding best stations:', error);
            TestingUtils.analytics.recordError();
            showErrorState('Failed to calculate routes. Please try again.');
            TestingUtils.endTimer('Total-Search');
        } finally {
            // Re-enable button
            findStationBtn.disabled = false;
            findStationBtn.textContent = 'Find Best Station';
        }
    }
    
    // Show station results with proper formatting
    function showStationResults(destination, stations) {
        let resultsHTML = `
            <div class="results-intro">
                <h3>Results for: <span class="destination-highlight">${destination}</span></h3>
                <p>Based on road travel time from nearby metro stations</p>
                ${stations.some(s => s.isFallback) ? 
                    '<p class="fallback-notice">⚠️ Some results use estimated distances due to service limitations</p>' : ''}
            </div>
            <div class="stations-list">
        `;
        
        stations.forEach((station, index) => {
            const timeMinutes = Math.round(station.duration / 60);
            const distanceKm = station.distance.toFixed(1);
            
            // Add fallback indicator if using estimated distance
            const fallbackIndicator = station.isFallback ? 
                '<span class="fallback-indicator" title="Estimated distance - routing API unavailable">⚠️</span>' : '';
            
            resultsHTML += `
                <div class="station-card ${index === 0 ? 'recommended' : ''}">
                    <div class="station-info">
                        <h3>${station.name} (${station.line}) ${fallbackIndicator}</h3>
                        <div class="badges">
                            <span class="time-badge">⏱️ ${timeMinutes} mins</span>
                            <span class="distance-badge">📍 ${distanceKm} km</span>
                        </div>
                        ${station.error ? `<div class="error-message">${station.error}</div>` : ''}
                    </div>
                    ${index === 0 ? '<div class="recommendation-tag">Recommended</div>' : ''}
                </div>
            `;
        });
        
        resultsHTML += '</div>';
        resultsContainer.innerHTML = resultsHTML;
    }
    
    // Show no stations found message
    function showNoStationsFound() {
        resultsContainer.innerHTML = `
            <div class="no-results">
                <h3>No nearby metro stations found</h3>
                <p>No metro stations were found within 5km of your destination.</p>
            </div>
        `;
    }
    
    // Show error state
    function showErrorState(message) {
        resultsContainer.innerHTML = `
            <div class="error-state">
                <h3>Something went wrong</h3>
                <p>${message}</p>
            </div>
        `;
    }
    
    // Show loading state
    function showLoadingState() {
        resultsContainer.innerHTML = `
            <div class="loading-state">
                <p>Calculating best metro station for your destination...</p>
                <div class="spinner">⏳</div>
            </div>
        `;
    }
    
    // Clear previous results
    function clearResults() {
        resultsContainer.innerHTML = '';
    }
    
    // Initialize the app when DOM is loaded
    await initApp();
});

// Make testing utilities available globally for console access
if (typeof window !== 'undefined') {
    window.TestingUtils = TestingUtils;
    window.runTests = () => {
        console.log('🧪 Starting MetroNear Tests...');
        TestingUtils.printTestingChecklist();
        TestingUtils.printComparisonGuidelines();
        
        // Run quick tests with sample destinations
        TestingUtils.testDestinations.slice(0, 3).forEach(dest => {
            TestingUtils.runQuickTest(dest);
        });
    };
    
    window.getPerformanceReport = () => TestingUtils.getPerformanceReport();
    window.clearPerformanceMetrics = () => TestingUtils.clearMetrics();
    window.getAnalyticsReport = () => TestingUtils.analytics.getReport();
    window.resetAnalytics = () => TestingUtils.analytics.reset();
    
    console.log('🧪 Testing utilities available. Run tests with: runTests()');
    console.log('📊 Get performance report with: getPerformanceReport()');
    console.log('📈 Get usage analytics with: getAnalyticsReport()');
}

// Utility functions
const Utils = {
    // Calculate distance between two coordinates using Haversine formula
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth radius in km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // Distance in km
        return distance;
    },
    
    deg2rad(deg) {
        return deg * (Math.PI / 180);
    }
};