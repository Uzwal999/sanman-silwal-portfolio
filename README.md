# Sanman Silwal — Portfolio

Personal interactive 3D portfolio for **Sanman Silwal**, HR Manager & Talent Acquisition professional based in Kathmandu. Design direction inspired by [moncy.dev](https://www.moncy.dev/).

## Highlights

- **3D hero globe** (Three.js) — dotted land masses with animated flight arcs from Kathmandu to London, New York, Toronto, Dubai and Sydney, reflecting his recruitment across Nepal, the UK, USA, Canada, Dubai & Australia. Drag to spin, or tap a market chip in the About section to fly the globe there.
- **Sticky stage** — the portrait and globe glide aside as the About section scrolls in.
- **Toolkit bubbles** — glossy 3D spheres with simple physics that react to the cursor; tap to scatter.
- Loader, custom cursor, letter-by-letter text reveals, rotating roles, scroll-drawn career timeline, 3D-tilt "Areas of impact" carousel, live Kathmandu clock.
- Light and dark themes (follows the system setting until the visitor picks one; remembered per browser).
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

Live at **https://www.sanmansilwal.com.np** (the bare `sanmansilwal.com.np` redirects there).

Hosted on **Vercel**, connected to this GitHub repo: every push to `main` builds (`npm run build` → `dist/`) and goes live in about a minute. The domain's nameservers point to Vercel DNS (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`), set at register.com.np.

The contact form sends through Formspree (form ID in `src/contact.js`); if Formspree is unreachable it falls back to opening the visitor's email app.

The build uses a relative base path, so `dist/` also works on any other static host.
