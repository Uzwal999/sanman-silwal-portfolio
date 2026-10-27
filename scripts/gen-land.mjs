// Precomputes evenly spaced dots that sit on land, used by the hero globe.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { feature } from "topojson-client";
import { geoContains } from "d3-geo";

const require = createRequire(import.meta.url);
const topo = JSON.parse(readFileSync(require.resolve("world-atlas/land-110m.json"), "utf8"));
const land = feature(topo, topo.objects.land);

const STEP = 1.6; // degrees between rows
const points = [];
for (let lat = -58; lat <= 82; lat += STEP) {
  const ring = Math.max(1, Math.round((360 / STEP) * Math.cos((lat * Math.PI) / 180)));
  for (let i = 0; i < ring; i++) {
    const lng = -180 + (i * 360) / ring;
    if (geoContains(land, [lng, lat])) points.push(+lat.toFixed(1), +lng.toFixed(1));
  }
}
writeFileSync(new URL("../src/land-points.json", import.meta.url), JSON.stringify(points));
console.log(`wrote ${points.length / 2} land points`);
