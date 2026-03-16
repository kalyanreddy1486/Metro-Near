// Configuration file for MetroNear API keys
import { GOOGLE_MAPS_API_KEY } from './googleConfig.js';

export const API_CONFIG = {
    // Google Maps Platform (used via JS SDK for autocomplete + geocoding)
    GOOGLE_MAPS_API_KEY,

    // Backend routing service (our Node server calling Google Distance Matrix)
    ROUTING_BACKEND_BASE_URL: 'http://localhost:4000'
};

export function isGoogleMapsConfigured() {
    return typeof API_CONFIG.GOOGLE_MAPS_API_KEY === 'string' &&
        API_CONFIG.GOOGLE_MAPS_API_KEY.trim() !== '' &&
        API_CONFIG.GOOGLE_MAPS_API_KEY !== 'AIzaSyBXwXFVbrke6W8qeIk9N-BlOMOnVAM6Mes';
}