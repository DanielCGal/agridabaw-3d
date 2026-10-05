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
index.html              The whole page — one document, fifteen sections
assets/css/styles.css   All styling, including the tablet and phone breakpoints
assets/js/main.js       Mobile nav, scroll reveal, nav highlighting, screenshot lightbox
assets/js/reviews.js    Ratings and reviews: shows the ratings, charts and comments, sends new ones
assets/img/             Game screenshots, logos, the trailer's poster, and two painted background images
assets/video/           The promotional video shown in the trailer section
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
| ≥ 1241px | The name "AgriDabaw-3D" shows beside the logo in the top menu |
| ≥ 1025px | Two-column hero and split sections, three-column card grids, five-across stats |
| 901–1024px | Two-column card grids, three-across stats, hero still side by side |
| ≤ 960px | Hamburger navigation (eight menu items no longer fit on one line) |
| 769–900px | Stacked hero, single-column split sections and showcase |
| ≤ 768px | Single column throughout, two-column gallery |
| ≤ 480px | Single-column gallery, full-width buttons |

The page also respects `prefers-reduced-motion`, has a skip link, visible focus
rings, alt text on every image, and a keyboard-navigable screenshot lightbox
(arrow keys to move, Escape to close).

Nothing is hidden unless the page is scripted: an inline script in the head adds
a `js` class, and only that class turns on the scroll-reveal animation and the
collapsed phone menu. If `main.js` is blocked or fails to load, every section is
still visible and the navigation links still work. A link that carries a
fragment, such as `#about`, is re-aimed at its section once the page has
finished loading, because the browser can otherwise leave it at the top.

## The trailer

The section under the hero plays `assets/video/agridabaw-3d-trailer.mp4` (1 minute
41 seconds). The hero's **Watch the Trailer** button jumps to it. The video is
only downloaded when a visitor presses play; until then the page shows
`assets/img/trailer-poster.jpg`, the video's closing title card.

The file in this repository is a web copy of the original 4K recording: 1080p,
H.264, about 43 MB, with its index at the front so playback can start before the
whole file has arrived. GitHub refuses files over 100 MB and warns above 50 MB,
so a replacement video should be exported at 1080p and roughly 3.5 Mbps or less.

## Ratings and reviews

Below the download section, visitors answer seven questions, all required:

1. Their name.
2. A 1 to 5 star rating of the game.
3. "What did you like about AgriDabaw-3D, and what improvements or suggestions
   would you recommend?"
4. Which features of the game they enjoy most (choose all that apply, with an
   "Other" line).
5. A 1 to 5 rating of the website's design and visual appeal (Very Poor to
   Excellent).
6. Which website section was hardest to understand or navigate (choose all that
   apply; "None" cannot be combined with a section).
7. One thing they would change about the website.

Beside the form are four charts: the game's average rating with a bar per star
level, the features chart, the website design rating, and the hardest-section
chart. In the two choice charts a bar is the share of the people who answered
that question who ticked that choice, most chosen first, and what people wrote
beside "Other" is listed under the chart. Every comment is shown with its
reviewer's name, newest first, ten at a time, followed by their answer to
question 7. Reviews sent before a question existed simply have no answer for it;
ones from before the name was asked for show as "Anonymous". The top menu's
**Reviews** link jumps to the section.

The reviews are stored by the game's own server (`agridabao-api` on Railway), whose
address is in the section's `data-api` attribute:

- `GET /api/reviews?page=0&size=10` returns the overall rating (`summary`), the
  counts behind the other three charts (`survey`) and a page of reviews.
- `POST /api/reviews` adds one and returns the same `summary` and `survey`:

```json
{
  "name": "Juan",
  "rating": 5,
  "comment": "...",
  "features": ["AI_ADVISER", "OTHER"],
  "featuresOther": "The night sky",
  "websiteRating": 4,
  "hardestSections": ["NONE"],
  "hardestOther": "",
  "websiteChange": "..."
}
```

The choice codes are the `value` attributes of the form's checkboxes. To add or
rename a choice, change it in `index.html` and in the server's list of accepted
codes (`ReviewService` in `agridabao-api`); the charts read their rows from the
form, so they follow by themselves.

Reviews need no account; the name is whatever the reviewer types. The server only accepts them from this
website's address, limits how many can be sent in an hour, and turns away bots
through a hidden form field. Comments are shown as plain text, never as HTML.

**Taking a comment down.** In Railway, open the Postgres database, find the row in
the `game_review` table and set `hidden` to `true`. The comment disappears from the
list and from the average on the next page load. Nothing is deleted.

**Previewing locally.** A local copy reads the live reviews. To try the section
against a test server instead, add `?api=` to the address, for example
`http://127.0.0.1:8777/?api=http://127.0.0.1:8099`. This only works on your own
computer, never on the live site.

## The game download

The APK is about 407 MB, which is far beyond GitHub's 100 MB per-file limit for
repository contents, so it is published as a **GitHub Release asset** instead. The
download button points at the release for that exact version:

```
https://github.com/DanielCGal/agridabaw-3d/releases/download/v9/AgriDabaw-3D-v9.apk
```

To publish a new version: create a GitHub Release with a new tag (for example
`v10`), attach the APK named to match (`AgriDabaw-3D-v10.apk`), then update the link,
the version and the download size in the download section of `index.html`.
Because each link names its own release, an older release can never break it.

## Deployment

The site is served by GitHub Pages from the `main` branch. Pushing to `main`
redeploys it; no action is needed beyond the push.

---

© 2026 GreenScape · Assumption College of Davao
