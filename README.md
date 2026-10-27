# Sanman Silwal — Portfolio

Personal interactive 3D portfolio for **Sanman Silwal**, HR Manager & Talent Acquisition professional based in Kathmandu. Design direction inspired by [moncy.dev](https://www.moncy.dev/).

## Highlights

- **3D hero globe** (Three.js) — dotted land masses with animated flight arcs from Kathmandu to London, New York and Toronto, reflecting his recruitment across Nepal, the UK, US & Canada. Drag to spin; it eases back on its own.
- **Sticky stage** — the portrait and globe glide aside as the About section scrolls in.
- **Toolkit bubbles** — glossy 3D spheres with simple physics that react to the cursor; tap to scatter.
- Loader, custom cursor, letter-by-letter text reveals, rotating roles, scroll-drawn career timeline, 3D-tilt "Areas of impact" carousel, live Kathmandu clock.
- Responsive down to phones, and respects `prefers-reduced-motion`.

## Stack

Vite · Three.js · GSAP (ScrollTrigger) · Lenis — vanilla JS, no framework.

## Develop

```bash
npm install
npm run dev       # local dev server
npm run build     # production build in dist/
npm run preview   # serve the build
```

Content (career, areas of impact, toolkit labels) lives in `src/data.js`; page copy is in `index.html`.

`src/land-points.json` is generated from Natural Earth data via `npm run gen:land` — only needed if you change the dot density in `scripts/gen-land.mjs`.

## Deploy

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`. Enable it once under **Settings → Pages → Source: GitHub Actions**. The build uses a relative base path, so `dist/` also works on Netlify, Vercel or any static host.
