# NRL web scaffold

A fullscreen React/TypeScript map hosted by Spring Boot Kotlin MVC. Click or tap the
map, choose **Submit point**, enter a name, and save. Saved points remain visible
after reloading; click a saved point to see its name and coordinates.

## Run the packaged frontend

Requires Java 25 (the Gradle toolchain can provision it), Node.js compatible with
Vite 8, and npm. The first build needs network access to download dependencies.

```sh
./gradlew bootRun
```

Open <http://localhost:8080/>. Gradle runs `npm ci`, builds React with Vite, and
packages its generated JavaScript/CSS with Spring. Generated files are ignored by
Git. Spring compresses HTML, JavaScript, CSS, and JSON responses when the client
supports compression. Production runs require only Java, not a Node.js server.

To build an executable jar:

```sh
./gradlew bootJar
java -jar build/libs/demo-0.0.1-SNAPSHOT.jar
```

## Develop with React Refresh

Start Vite in one terminal:

```sh
cd frontend
npm ci
npm run dev
```

Start Spring in another terminal, from the repository root:

```sh
./gradlew bootRun -PfrontendDev
```

Open **<http://localhost:8080/>**, not port 5173. Spring still builds the HTML and
initial view model; Vite on port 5173 serves the development modules and React
Refresh. Browser data requests go to Spring on the same origin. The development
property skips the production frontend build.

## Web/backend boundary

This application is the web-facing MVC layer. The separate Go API will own business
logic and durable storage. It is not integrated yet: `PointRepository` is a small,
thread-safe in-memory substitute behind `PointService`.

The server prepares `MapPageViewModel`, embeds it safely in an `application/json`
script in the HTML shell, and resolves asset filenames through Vite's manifest.
React reads this starting model without making an initial data request. It owns
rendering, pending selection, the name form, and interaction state; it does not
generate saved identifiers or call the Go API directly. There is no Thymeleaf or
React server rendering.

Browser-facing MVC handlers return JSON using `@Controller` and `@ResponseBody`:

| Method | Route | Behaviour |
| --- | --- | --- |
| GET | `/` | HTML shell with server-built initial data |
| GET | `/web/map` | Fresh map configuration and saved point view models |
| POST | `/web/points` | Validate and save a point; return its view model with HTTP 201 |

Example submission:

```json
{
  "name": "Observation point",
  "coordinate": { "latitude": 60.4055, "longitude": 5.3435 }
}
```

The response contains `id` (server-generated UUID), trimmed `name`, `coordinate`,
and `coordinateLabel`. Names must contain 1–100 characters after trimming;
coordinates must be finite, within latitude ±90 and longitude ±180. Invalid input
returns HTTP 400 with `message` and `fieldErrors` and is not stored.

Points are shared across visitors in the same server process and disappear when it
restarts. The scaffold has no authentication or saved-point editing/deletion.
The map uses Kartverket topographic tiles and requires access to its external tile
service. Initial view models are not cached; React renders saved points using a
single GeoJSON source and keeps the map mounted while the form is open.

## Verify

```sh
./gradlew test
cd frontend
npm run check
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Backend tests cover initial data, validation, safe JSON embedding, UUID creation,
concurrent storage, and retrieval. Frontend tests cover bootstrapped data, selection,
modal behaviour, submission, duplicate prevention, and retry after failures.
Playwright starts the packaged application and verifies the complete flow at phone,
portrait iPad, and desktop viewport sizes. It uses Chromium with deterministic map
tiles; this is not physical iPad/Safari verification. Its isolated server uses port
18080, leaving your application on port 8080 untouched.

To exercise Vite development integration, use `FRONTEND_DEV=1 npm run test:e2e`
(port 5173 must be free). To check the real Kartverket basemap rather than fixture
tiles, use `NRL_LIVE_TILES=1 npm run test:e2e`; this requires tile-service connectivity.
