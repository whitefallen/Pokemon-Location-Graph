# Pokémon Location Graph

Interactive React app that visualizes Pokémon world locations as a directed graph and shows encounter details for each location.

## What This Project Does

- Loads region datasets from static JSON files.
- Builds a node/edge graph from location connection data.
- Lets you switch datasets (regions/games) at runtime.
- Shows per-location encounter summaries (species counts, methods, generation/game groupings).

## Tech Stack

- React 18 + TypeScript
- Vite 5
- Mantine UI (layout/components/theme)
- React Flow (`@xyflow/react`) for graph rendering/interactions
- Dagre for automatic graph layout (left-to-right)

## How the App Works (High Level)

1. `App` fetches `/data/manifest.json`.
2. Manifest entries are used to populate the dataset selectors.
3. When a dataset is selected, the app fetches `/data/<fileName>`.
4. Location data is transformed into React Flow nodes/edges.
5. Dagre computes coordinates, then the graph is rendered.
6. Clicking a node opens detailed encounter + connection info in the right sidebar.

## Main UI Areas

- Top strip: quick dataset selector and loaded dataset count.
- Left sidebar:
  - Dataset picker
  - Graph metrics (locations, connections, generated date)
- Center panel:
  - Interactive graph (pan, zoom, minimap, controls)
  - Custom location nodes with encounter/species badges
- Right sidebar:
  - Selected location details
  - Generation/game grouped encounter methods
  - Outgoing location connections

## Project Structure

- `src/main.tsx` – app bootstrap + Mantine provider/theme
- `src/App.tsx` – data loading, transformation, layout, graph + detail logic
- `src/components/LocationNode.tsx` – custom graph node UI
- `src/types.ts` – TypeScript interfaces for manifest and datasets
- `src/styles.css` – app and graph styling
- `public/data/manifest.json` – dataset index used at startup
- `public/data/*.json` – actual location/encounter datasets

## Data Format

### Manifest (`public/data/manifest.json`)

```json
{
  "datasets": [
    {
      "fileName": "example-region-location-model-encounters.json",
      "label": "example-region",
      "locations": 72,
      "encounters": 1287
    }
  ]
}
```

### Dataset (`public/data/<dataset>.json`)

Each dataset should include:

- `source`: generator/source identifier
- `generatedAt`: timestamp string
- `locations`: array of location objects

Each location object should include:

- `id`, `name`, `region`
- `connections`: outgoing links (`to`, `dir`)
- `encounters`: rows with at least `method` and `pokemon` (optionally version/generation metadata)

## Development

### Install and run

```bash
npm install
npm run dev
```

Vite prints the local URL (typically `http://localhost:5173`).

### Build and preview

```bash
npm run build
npm run preview
```

## Progressive Web App (PWA)

This project is configured as an installable PWA using `vite-plugin-pwa`.

- Generates a `manifest.webmanifest` during build
- Generates and registers a service worker for asset caching
- Supports install prompt in compatible browsers when served over HTTPS (or localhost)

### Verify installability

1. Run `npm run build` then `npm run preview`.
2. Open the app in a Chromium-based browser or Firefox.
3. Check for the install action in the browser UI.
4. In DevTools > Application, verify Manifest + Service Worker are present.

## Add or Update Datasets

1. Add a dataset file under `public/data/`.
2. Add/update its entry in `public/data/manifest.json`.
3. Ensure the `fileName` matches exactly.
4. Restart dev server if needed.

## Notes for Contributors

- Files in `public/` are served as static assets.
- Runtime path `/data/...` maps to `public/data/...`.
- Graph layout is deterministic from dataset content and Dagre settings in `src/App.tsx`.
