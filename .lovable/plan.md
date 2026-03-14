

# Plan: 3D Building Extrusions + Threat Heatmap

## Overview
Add two new map layers: (1) 3D extruded buildings for hangars, shelters, and the control tower using MapLibre's native `fill-extrusion` layer, and (2) a dynamic threat heatmap that visualizes RADAR_CONTACT and THREAT_ESCALATION events as a heat gradient.

## 1. 3D Building Extrusions — `MapBuildings3D`

Create a new component `src/components/MapBuildings3D.tsx` that renders a GeoJSON Source with `fill-extrusion` layer type.

**Buildings to model (as extruded polygons):**
- **Control Tower** — tall narrow polygon (~20m height) near the apron area (~15.260, 56.269)
- **4x Aircraft Shelters** — low wide polygons (~8m height) along the runway dispersal road, spaced evenly
- **Fuel Depot** — medium polygon (~12m height) near the fuel area (~15.254, 56.271)
- **Maintenance Hangar** — large polygon (~15m height) near apron (~15.263, 56.271)
- **Ammo Bunker** — small fortified polygon (~6m height) offset from runway (~15.272, 56.264)

**Technical approach:**
- Use MapLibre `fill-extrusion` paint properties: `fill-extrusion-height`, `fill-extrusion-base`, `fill-extrusion-color`, `fill-extrusion-opacity`
- Color buildings dark grey (`#1e293b`) with subtle cyan edge glow via opacity
- Each feature has a `height` and `type` property in GeoJSON for data-driven styling
- Works with the existing pitch (40 degrees) — extrusions are visible at angles > 0

**Data file:** `src/data/base-buildings.json` — GeoJSON FeatureCollection with Polygon geometries and height/type properties.

## 2. Threat Heatmap — `ThreatHeatmap`

Create `src/components/ThreatHeatmap.tsx` that accumulates RADAR_CONTACT and THREAT_ESCALATION event positions into a heatmap layer.

**Technical approach:**
- New component receives `events` array, filters threat events, maps them to point GeoJSON features
- Uses MapLibre `heatmap` layer type via react-map-gl `Source` + `Layer`
- Paint properties: radius 30-60px, intensity scaled by severity (CRITICAL=1, HIGH=0.7, AMBER=0.4), color ramp from transparent → yellow → orange → red
- Opacity fades at high zoom (less useful up close, more useful zoomed out)
- Points placed at threat-vector location with random jitter (reusing existing logic from TacticalMap)

## 3. Integration in TacticalMap

- Import and render `MapBuildings3D` (always visible) and `ThreatHeatmap` (fed by events)
- Add a toggle button "3D" next to existing TAKTISK/SATELLIT buttons to show/hide buildings
- Heatmap is always-on but only visible when threat events exist

## Files to create/modify

| File | Action |
|------|--------|
| `src/data/base-buildings.json` | Create — GeoJSON with building polygons + heights |
| `src/components/MapBuildings3D.tsx` | Create — fill-extrusion layer component |
| `src/components/ThreatHeatmap.tsx` | Create — heatmap layer from threat events |
| `src/components/TacticalMap.tsx` | Modify — add imports, render new layers, add 3D toggle |

