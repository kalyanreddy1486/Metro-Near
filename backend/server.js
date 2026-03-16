require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 4000;

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY_BACKEND || process.env.GOOGLE_MAPS_API_KEY;

if (!GOOGLE_KEY) {
  console.warn('Warning: GOOGLE_MAPS_API_KEY_BACKEND (or GOOGLE_MAPS_API_KEY) is not set. Routing API will fail until a key is configured.');
}

app.use(cors());
app.use(express.json());

app.post('/routes', async (req, res) => {
  try {
    const { origin, destinations, mode = 'driving' } = req.body || {};

    if (!GOOGLE_KEY) {
      return res.status(500).json({ error: 'Google API key not configured on server' });
    }

    if (!origin || !Array.isArray(destinations) || destinations.length === 0) {
      return res.status(400).json({ error: 'origin and destinations are required' });
    }

    const originParam = `${origin.lat},${origin.lng}`;

    const promises = destinations.map(async (dest) => {
      const destParam = `${dest.lat},${dest.lng}`;
      const url =
        `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(originParam)}` +
        `&destination=${encodeURIComponent(destParam)}&mode=${encodeURIComponent(mode)}&key=${encodeURIComponent(GOOGLE_KEY)}`;

      const response = await fetch(url);
      const data = await response.json();

      if (
        !response.ok ||
        data.status !== 'OK' ||
        !data.routes ||
        !data.routes[0] ||
        !data.routes[0].legs ||
        !data.routes[0].legs[0]
      ) {
        return {
          status: data.status || 'ERROR',
          errorMessage: data.error_message || 'No route found',
        };
      }

      const leg = data.routes[0].legs[0];
      return {
        status: 'OK',
        distanceKm: leg.distance.value / 1000,
        durationSec: leg.duration.value,
      };
    });

    const results = await Promise.all(promises);

    res.json({ results });
  } catch (error) {
    console.error('Backend /routes error', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Routing backend listening on http://localhost:${PORT}`);
});

