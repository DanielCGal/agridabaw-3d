# AgriDabaw-3D — Promotional Website

The public promotional website for **AgriDabaw-3D: A Simulation Game with AI-Advisor
for Localized Farming Techniques**, a capstone project of Assumption College of Davao.

**Live site:** https://danielcgal.github.io/agridabaw-3d/

## About the game

AgriDabaw-3D is a free 3D farming simulation game for Android, set in Davao City.
Players choose one of seven real Davao districts, pick a farm area inside it, and
grow crops that district actually grows. Along the way they respond to typhoons and
droughts, manage pests and diseases, complete objectives, trade with other players,
and ask an in-game AI Advisor for guidance.

Built by **GreenScape** — Daniel C. Galam and Jessica Mae G. Suello.

## What's in this repository

```
index.html              The whole page — one document, thirteen sections
assets/css/styles.css   All styling, including the tablet and phone breakpoints
assets/js/main.js       Mobile nav, scroll reveal, nav highlighting, screenshot lightbox
assets/img/             Game screenshots, logos, and two painted background images
.nojekyll               Tells GitHub Pages to serve the files as-is
```

No build step, no dependencies, no framework. It is plain HTML, CSS and JavaScript,
so it can be opened directly or served from any static host.

## Running it locally

```bash
python -m http.server 8777
```

Then open <http://127.0.0.1:8777/>. Opening `index.html` straight from the file
system also works, though a local server matches how it behaves once deployed.

## Design and assets

The palette and typography come from the game itself rather than a generic template.
The wood, gold and leaf tones are sampled from the AgriDabaw-3D logo sign, and the
display font is **Playpen Sans**, the same font the Unity client ships with.

All product imagery is a real screenshot of the Android build — nothing is mocked up.
The two painted landscape backgrounds (`bg-hero.jpg`, `bg-storm.jpg`) were generated
with Artlist and are used only as atmosphere behind the hero and the climate section.

Screenshots were converted from PNG to progressive JPEG, which brought the page's
image payload from 13.9 MB down to 2.3 MB.

## Responsiveness

| Breakpoint | Behaviour |
|---|---|
| ≥ 1025px | Two-column hero and split sections, three-column card grids, five-across stats |
| 769–1024px | Two-column card grids, three-across stats, stacked hero |
| ≤ 768px | Single column throughout, hamburger navigation, two-column gallery |
| ≤ 480px | Single-column gallery, full-width buttons |

The page also respects `prefers-reduced-motion`, has a skip link, visible focus
rings, alt text on every image, and a keyboard-navigable screenshot lightbox
(arrow keys to move, Escape to close).

## The game download

The APK is about 391 MB, which is far beyond GitHub's 100 MB per-file limit for
repository contents, so it is published as a **GitHub Release asset** instead. The
download button points at:

```
https://github.com/DanielCGal/agridabaw-3d/releases/latest/download/AgriDabaw-3D-v8.2.apk
```

Because the URL uses `releases/latest`, publishing a newer release with the same
asset filename updates the download without touching the website.

## Deployment

The site is served by GitHub Pages from the `main` branch. Pushing to `main`
redeploys it; no action is needed beyond the push.

---

© 2026 GreenScape · Assumption College of Davao
