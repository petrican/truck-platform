# Weather-Aware Truck Routing

Deployed application: <https://truck.nanca.ro/>

The project is a React and TypeScript single-page application backed by a Django REST API. A dispatcher enters a truck shipment, compares road-route alternatives, and inspects weather conditions and risk along the corridor.

## How it works

### Frontend

The frontend is in `truck_routing_frontend/`.

1. `App.tsx` holds the shipment form state, calculated routes, selected route, and loading/error state.
2. `SidebarForm.tsx` collects origin, destination, departure time, cargo weight and unit, and checkpoint sampling interval. Quick corridor presets populate the same form and calculate a route.
3. `routeService.ts` resolves city names using a built-in coordinate dictionary, accepts `longitude,latitude` input, and uses OpenStreetMap Nominatim as a geocoding fallback for other place names.
4. The frontend converts the requested cargo weight to pounds and sends a JSON `POST` request to `/api/`.
5. Once the route response arrives, the frontend requests hourly Open-Meteo weather for the returned checkpoints. It stores the forecast at each point for offsets from 0 through 48 hours after departure and calculates checkpoint risk using weather conditions and cargo weight.
6. `RouteDisplay.tsx` displays route alternatives, route metrics, risk summaries, a checkpoint timeline, and the forecast-hour slider. `RouteMap.tsx` renders the selected route and weather-colored segments, checkpoint markers, and hover details (including wind and precipitation). Moving the slider updates the map and timeline to the selected forecast hour.
7. If the live routing request fails, the error view offers a static demo route. Demo weather is sample data and does not change with the forecast slider.


### Backend

The backend is in `truck_routing_backend/` and the routing API is implemented in `osrm_routing/views.py`. Django mounts the routing app at `POST /api/`.

For each request, the API:

1. Validates the start/end coordinates, departure time, cargo weight, and sampling interval (10, 25, or 50 miles).
2. Calls the public OSRM driving-route service for route geometry and up to three alternatives. Note that the API we are calling from OSRM is going to give the alternatives it considers even if the alternative parameter is set to 3. 
3. Samples each route at the requested distance interval, calculates checkpoint distances with `geopy` geodesic calculations, and estimates checkpoint ETAs from route distance and duration.
4. Requests Open-Meteo weather at each checkpoint's estimated arrival time.
5. Calculates checkpoint and route risk from wind, rain, snowfall, and cargo weight, then marks a recommended route by comparing severe miles, high-risk miles, average risk, and duration.
6. Returns route geometry, route metrics, checkpoint weather/risk, and the route risk summary as JSON.

The frontend makes a second Open-Meteo request after receiving these routes to populate the 49 hourly forecast positions used by the slider. The backend's ETA weather and route recommendation are still included in the response.

### API request

`POST /api/` accepts payloads in JSON like:

```json
{
  "start": "26.1025,44.4268",
  "end": "11.5820,48.1351",
  "departure_time": "2026-10-22T12:00:00Z",
  "load_weight": 24000,
  "sampling_miles": 25
}
```

## Libraries and external services

### Frontend

- **React 19** and **React DOM** — UI and component rendering.
- **TypeScript** — application types and compile-time checking.
- **Vite** — development server and production build; `/api` is proxied to `http://127.0.0.1:8000` during development.
- **Leaflet** — interactive map, route lines, markers, popups, and hover tooltips.
- **OpenStreetMap** — map tiles displayed by Leaflet.
- **Lucide React** — interface icons.
- **ESLint** with TypeScript and React Hooks plugins — linting.

### Backend

- **Django** — web application and URL routing.
- **Django REST Framework** — API views and JSON responses.
- **Requests** — calls to OSRM and Open-Meteo.
- **geopy** — geodesic distance calculations for checkpoints; **GeographicLib** provides geodesic calculations.
- **SQLite** — configured Django database. Route calculations are handled per request and are not saved as shipment records.

### External APIs

- **OSRM public routing service** — driving route geometry, distances, durations, and alternatives.
- **Open-Meteo Forecast API** — checkpoint weather observations/forecasts.
- **OpenStreetMap Nominatim** — frontend fallback geocoder when a place is not in the built-in city-coordinate dictionary.
- **OpenStreetMap tile service** — map imagery.

These providers are external services; routing, geocoding, map tiles, and weather availability depend on their network availability and service limits. Routes are based on the OSRM driving profile and do not include live traffic data.

## Run locally

Start the backend and frontend in separate terminals from the repository root.

### Backend

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

### Frontend

```powershell
cd truck_routing_frontend
npm install
npm run dev
```

Open the URL printed by Vite (by default, <http://localhost:5173>). The Vite development server forwards `/api/` requests to Django on port 8000.

### Production frontend build

From `truck_routing_frontend/`:

```powershell
npm run build
npm run preview
```

`npm run build` runs the TypeScript project build and creates the production frontend bundle in `truck_routing_frontend/dist/`.
