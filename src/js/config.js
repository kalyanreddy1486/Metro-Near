const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

const GOOGLE_MAPS_API_KEY =
    document.querySelector('meta[name="google-maps-key"]')?.content || '';

export const API_CONFIG = {
    GOOGLE_MAPS_API_KEY,
    ROUTING_BACKEND_BASE_URL: isProd
        ? 'https://metro-near-backend.onrender.com'
        : 'http://localhost:4000'
};

export function isGoogleMapsConfigured() {
    return typeof API_CONFIG.GOOGLE_MAPS_API_KEY === 'string' &&
        API_CONFIG.GOOGLE_MAPS_API_KEY.trim() !== '';
}
