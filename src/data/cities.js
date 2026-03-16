// City configuration for multi-city metro support
// Each city has boundaries for coordinate detection and default map view

export const CITIES = {
    bangalore: {
        name: 'Bangalore',
        code: 'BLR',
        // Boundary box for Bangalore (roughly covers metro area)
        bounds: {
            minLat: 12.7,
            maxLat: 13.2,
            minLng: 77.3,
            maxLng: 77.8
        },
        // Default map center and zoom
        center: [12.9716, 77.5946],
        zoom: 12,
        // Path to metro stations JSON
        dataFile: 'src/data/bangalore.json',
        // Display name for UI
        displayName: 'Bangalore (Namma Metro)'
    },
    hyderabad: {
        name: 'Hyderabad',
        code: 'HYD',
        // Boundary box for Hyderabad
        bounds: {
            minLat: 17.2,
            maxLat: 17.6,
            minLng: 78.3,
            maxLng: 78.6
        },
        center: [17.3850, 78.4867],
        zoom: 12,
        dataFile: 'src/data/hyderabad.json',
        displayName: 'Hyderabad (Hyderabad Metro)'
    }
};

// Detect city from coordinates
export function detectCity(lat, lng) {
    for (const [cityCode, city] of Object.entries(CITIES)) {
        const { bounds } = city;
        if (lat >= bounds.minLat && lat <= bounds.maxLat &&
            lng >= bounds.minLng && lng <= bounds.maxLng) {
            return cityCode;
        }
    }
    return null; // No city detected
}

// Get city config by code
export function getCityConfig(cityCode) {
    return CITIES[cityCode] || null;
}

// Get all available cities
export function getAvailableCities() {
    return Object.keys(CITIES);
}
