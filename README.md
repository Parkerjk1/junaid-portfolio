# MD Junaid — Portfolio

Cinematic, animation-heavy software-engineering portfolio for **MD Junaid** (Computer Science undergraduate · Software Developer · AI & Automation enthusiast), Bengaluru, India.

Built by modifying the open-source **PRIOR** GSAP template by [RelaxKartikey](https://github.com/RelaxKartikey) (Entospark Studios). The original canvas frame-scrub hero, canvas clip-path transition, pinned cinematic section, preloader and sticky list were kept and extended. Original attribution is preserved here and in the site footer.

## Run it

No build step, no `npm install`. The site must be served over HTTP (so the frame images and PDF load reliably) and needs an internet connection for the CDN libraries and Google Fonts.

```bash
cd Junaid-Portfolio
npx serve .
# or: python3 -m http.server 8000   then open http://localhost:8000
```

Deploy by uploading the folder to any static host (GitHub Pages, Netlify, Vercel).

## What's inside

| Section | Implementation |
|---|---|
| Hero — MD JUNAID | Canvas frame-scrub (`frames_1_*`), per-character reveal, pointer-follow glow, preloader, scroll indicator |
| Interlude | Canvas frame-scrub (`frames_2_*`) with clip-path expansion, pinned |
| About | Staggered heading reveal, count-up stats (CGPA 8.61, 45K+, 95%) |
| Skills | Sticky grouped list + lazy-loaded Three.js orbit orb that reacts to the active group |
| Projects | Two case studies with scroll-driven, **illustrative** pipelines (not live model execution) |
| Interlude | Pinned clip-path video reveal with % counter |
| Experience | Animated timeline with scroll-filled rail |
| Education | VTU B.Tech CSE, 2023–2027, animated CGPA ring |
| Contact + Résumé | Email, GitHub, LinkedIn, phone, working PDF download (`assets/MD_Junaid_Resume.pdf`) |

Engine: GSAP 3.12.5 + ScrollTrigger, Lenis 1.1.13 (one instance synced to `gsap.ticker`), Three.js r128 (loaded only when Skills is near, desktop only). All per-frame work (Lenis, canvas painting, cursor, velocity skew, 3D orb) runs in a single GSAP ticker callback.

## Performance notes

- Frame sequences load in a sliding window and evict decoded bitmaps outside it; mobile uses the 1280px frames.
- Background videos (external Pexels clips from the original template) are skipped on mobile, low-end devices, Save-Data and reduced-motion, and only play near the viewport.
- `prefers-reduced-motion`: no Lenis, no 3D, no cursor/grain animation; content shows in its final state.
- Listeners, ScrollTriggers, Lenis and Three.js resources are disposed on `pagehide`.

## Editing

- Text: `index.html` · Styles/colours (`--accent`): `styles.css` · Motion: `main.js`
- Replace the résumé by overwriting `assets/MD_Junaid_Resume.pdf`.
- To use your own frame sequences, replace the JPGs in `frames_*_desktop` / `frames_*_mobile` (same file naming) and adjust `HERO_FRAMES` / `VT_FRAMES` in `main.js`.
- The frame images are tinted orange at runtime with a CSS `hue-rotate` filter.

## Credits & licence

Template: PRIOR by RelaxKartikey / Entospark Studios (open source). Background clips: Pexels. Libraries: GSAP, Lenis, Three.js (each under its own licence). Personal content © MD Junaid.
