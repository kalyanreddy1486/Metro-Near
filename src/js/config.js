// Configuration file for MetroNear API keys
export const API_CONFIG = {
    LOCATION_IQ_TOKEN: 'pk.506da8a600c4ddd4a7b1aa8b490db77b', // Replace with your actual LocationIQ access token
    LOCATION_IQ_BASE_URL: 'https://api.locationiq.com/v1',
    OPENROUTESERVICE_TOKEN: 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImQ0Y2E4NGU3M2Q2MTRkOGI4YWFhZTFjMzZmMjliMjg0IiwiaCI6Im11cm11cjY0In0=', // Replace with your actual OpenRouteService API key
    OPENROUTESERVICE_BASE_URL: 'https://api.openrouteservice.org/v2'
};

// Export a function to validate if the API keys are set
export function isValidConfig() {
    return API_CONFIG.LOCATION_IQ_TOKEN && API_CONFIG.LOCATION_IQ_TOKEN !== 'YOUR_LOCATION_IQ_TOKEN_HERE' &&
           API_CONFIG.OPENROUTESERVICE_TOKEN && API_CONFIG.OPENROUTESERVICE_TOKEN !== 'YOUR_OPENROUTESERVICE_TOKEN_HERE';
}

// Export validation functions for individual services
export function isLocationIQConfigured() {
    return API_CONFIG.LOCATION_IQ_TOKEN && API_CONFIG.LOCATION_IQ_TOKEN !== 'YOUR_LOCATION_IQ_TOKEN_HERE';
}

export function isOpenRouteServiceConfigured() {
    return API_CONFIG.OPENROUTESERVICE_TOKEN && API_CONFIG.OPENROUTESERVICE_TOKEN !== 'YOUR_OPENROUTESERVICE_TOKEN_HERE';
}