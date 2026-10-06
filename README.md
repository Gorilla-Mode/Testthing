# Map registration scaffold

A fullscreen React/TypeScript map served by Spring Boot Kotlin. Select a location,
choose **Submit point**, enter a name, and save through Spring REST. Blue marks the
selected location; green marks saved points, with their names as marker titles.
Saved points remain visible after reload and disappear when the server restarts.

## Run

### Docker Compose

Requires only Docker with Compose 2.22 or newer and a running Docker daemon (for
example, Docker Desktop). No host Java, Node.js, npm, or prebuilt artifacts are
needed. The first build needs network access to download images and dependencies.

```sh
docker compose up
```

Open <http://localhost:8080/>. The image builds with Java 25 and Node 24 using the
checked-in Gradle wrapper and npm lockfile. It generates TypeScript models,
type-checks and builds Vite, runs backend and frontend unit tests, and packages the
complete Spring JAR. The runtime contains Java 25 and the JAR, running as a
non-root user. Gradle and npm downloads are cached between builds.

Plain `docker compose up` builds even when an image already exists, reusing
unchanged Docker layers. To rebuild and replace the running container after source
or build configuration changes during development:

```sh
docker compose up --watch
```

Watch excludes dependencies, generated models, build output, and test reports.
Refresh the browser after each rebuild; this workflow rebuilds the packaged app.
For React Refresh, use the local Vite workflow below.

To manually update a detached instance, or stop and remove the container:

```sh
docker compose up -d --build
docker compose down
```

Set `APP_PORT` to change the host port, for example
`APP_PORT=9090 docker compose up` serves <http://localhost:9090/>. The published
port is bound to localhost. Saved points are held in memory: every server restart
or container replacement, including Watch rebuilds, clears them.

See Docker's [build pull policy](https://docs.docker.com/reference/compose-file/services/#pull_policy)
and [Compose Watch documentation](https://docs.docker.com/compose/how-tos/file-watch/)
for details.

### Local Java and Node.js

Requires Java 25, Node.js compatible with Vite 8, and npm. Gradle pins both its
daemon and compilation toolchain to Java 25. The first build needs network access
to download dependencies.

```sh
./gradlew bootRun
```

Open <http://localhost:8080/>. Gradle generates TypeScript models from Kotlin,
builds the frontend, and packages the complete Vite output with Spring. To build
an executable jar that needs only Java to run:

```sh
./gradlew bootJar
java -jar build/libs/demo-0.0.1-SNAPSHOT.jar
```

## Develop with Vite

Start Vite in one terminal:

```sh
cd frontend
npm ci
npm run dev
```

Start Spring in another terminal from the repository root:

```sh
./gradlew bootRun -PfrontendDev
```

Open <http://localhost:5173/>. Vite serves the page and provides React Refresh.
It proxies `/web` requests to Spring at `http://localhost:8080`. Set
`API_PROXY_TARGET` when starting Vite to use another backend address.
`-PfrontendDev` only skips frontend packaging in Gradle.

## Architecture

Vite builds `frontend/index.html` and its referenced scripts and stylesheets.
Spring serves the complete build from its static resources, including the page at
`/`. React fetches the initial `MapPageViewModel` from `GET /web/map`, showing
“Loading map…” until it arrives and “The map could not be loaded. Please reload.”
if loading fails. React keeps the map mounted while saving and adds the returned
point to the markers. A native dialog handles naming, cancellation, the saving
state, and one error message. Failed
submissions retain the draft for retry.

`PointController` exposes the JSON routes. `PointService` validates requests and
builds view models. `PointRepository` stores points in memory and is the boundary
for a future Go API integration. No Go integration, authentication, or durable
storage is included. Points are shared across visitors to one server process.

| Method | Route | Behavior |
| --- | --- | --- |
| GET | `/` | Static frontend page |
| GET | `/web/map` | Map configuration and saved points |
| POST | `/web/points` | Save a point and return it with HTTP 201 |

Creation requests contain required fields:

```json
{
  "name": "Observation point",
  "coordinate": { "latitude": 60.4055, "longitude": 5.3435 }
}
```

Responses contain a server-generated UUID `id`, trimmed `name`, and `coordinate`.
Names must contain 1–100 characters after trimming. Coordinates must be finite and
within latitude ±90 and longitude ±180. Invalid input returns HTTP 400 with
`{"message":"..."}`. REST responses use `Cache-Control: no-store`.
MapLibre bundles its worker and displays attribution for Kartverket's tiles.

Kotlin is the source for all browser-facing models. The TypeScript generator reads
compiled classes with Jackson 3/Kotlin support and writes
`frontend/src/generated/models.ts`. React imports these generated types directly;
they provide compile-time checking, while Spring validates incoming requests.
There are no handwritten JSON shape validators or duplicate model definitions.

Frontend application code and styles live in `frontend/src/app`; map rendering
and API calls live in `frontend/src/features/points`. Tests sit beside the code
they cover, with shared fixtures and setup under `frontend/src/test`.

Generation runs before npm `dev`, `check`, `test`, `test:e2e`, and `build`, and before
Gradle's frontend build. Generated models and Vite output are ignored by Git and
removed by `./gradlew clean`. After changing Kotlin models with Vite running, run
`npm run generate:models` in `frontend` and restart Spring.

## Verify

```sh
./gradlew clean test bootJar
cd frontend
npm run check
npm test
npx playwright install chromium
npm run test:e2e
```

Backend tests cover saving, generated IDs, name trimming and limits, required
fields, invalid coordinates, and JSON round trips including names containing HTML.
Frontend tests cover loading the initial model, submission, the saving state,
cancellation, and retry after errors. Browser tests verify page assets, startup
failure messaging, selection, saving, and markers after reload, using deterministic
tiles and an isolated packaged Spring JAR on port 18080.

Use `FRONTEND_DEV=1 npm run test:e2e` to run the same browser tests against Vite on
port 5173, proxying API requests to the isolated Spring server on port 18080.

To run browser tests against an already running Compose instance, install the
browser test tooling on the host and supply its URL:

```sh
# From the repository root, with Compose already running:
cd frontend
npm ci
npx playwright install chromium
E2E_BASE_URL=http://localhost:8080 npm --ignore-scripts run test:e2e
```

`E2E_BASE_URL` bypasses Playwright's managed Spring and Vite servers. The
`--ignore-scripts` option also skips local model generation, so this browser check
requires only Node.js/npm and Chromium on the host, with no host Java build.
Browser tests save a point in the running instance. Use the selected `APP_PORT` in
the URL if you changed it.
