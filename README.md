# MD Junaid — Personal Portfolio

A high-performance, interactive portfolio showcasing my work in software development, Python automation, artificial intelligence and machine learning.

Designed around scroll-driven interactions, real-time visual rendering and carefully optimised animations, the portfolio combines modern frontend engineering with immersive visual storytelling.

## Tech Stack

- **HTML5 & CSS3** — Semantic structure, responsive layouts and custom styling
- **Vanilla JavaScript** — Interactive functionality and animation orchestration
- **GSAP & ScrollTrigger** — Scroll-linked animations and timeline control
- **Lenis** — Smooth scrolling synchronised with the GSAP animation ticker
- **Canvas API** — Frame-by-frame animation rendering and scroll-controlled transitions
- **Three.js** — Interactive 3D skills visualisation
- **Google Fonts** — Typography

## Features & Implementation

| Section | Implementation |
|---|---|
| Hero | Canvas-based frame scrubbing, character reveals, pointer-follow effects and preloader |
| Cinematic Transitions | Scroll-controlled canvas sequences, pinned sections and clip-path animations |
| About | Animated typography and dynamic statistics |
| Skills | Interactive grouped skills list and lazy-loaded Three.js visualisation |
| Projects | Detailed case studies with animated workflow visualisations |
| Experience | Animated professional experience timeline |
| Education | Academic background and animated CGPA indicator |
| Contact | Direct contact links and downloadable résumé |

## Performance & Accessibility

- Frame sequences loaded progressively using a sliding-window strategy.
- Decoded image resources evicted when no longer required.
- Reduced-resolution assets used on mobile devices.
- Three.js initialised lazily on supported desktop devices.
- Background videos conditionally disabled on mobile, low-end devices and reduced-motion configurations.
- `prefers-reduced-motion` support for accessible browsing.
- Animation loops, event listeners and rendering resources cleaned up on page lifecycle changes.
- Lenis synchronised with the GSAP ticker to maintain consistent scroll behaviour.

## Machine Learning Projects

**Fake News Detection**
- NLP-based text classification.
- TF-IDF feature extraction.
- PassiveAggressiveClassifier.
- Dataset containing 45K+ news articles.
- 95% reported model accuracy.

**Used Car Price Prediction**
- Data preprocessing and feature engineering.
- Regression-based price prediction.
- Random Forest implementation using Scikit-learn.

## Experience

**AI & Business Automation Intern**  
Silicon Valley Touch Global | July–August 2026

Worked on Python-based automation solutions, AI/LLM workflows, lead management and internal business process optimisation.

## Education

**B.Tech — Computer Science and Engineering**  
HKBK College of Engineering, Bengaluru  
Visvesvaraya Technological University  
2023–2027 | CGPA: 8.61/10

## Getting Started

The project uses static HTML, CSS and JavaScript and does not require a build process.

```bash
cd Junaid-Portfolio
npx serve .
```

Alternatively:

```bash
python -m http.server 8000
```

Open `http://localhost:8000` in your browser.

An internet connection is required for externally hosted libraries, fonts and video assets.

## Project Configuration

- `index.html` — Page structure and content
- `styles.css` — Styling, layouts and visual system
- `main.js` — Animation logic and interactive behaviour
- `assets/` — Images, résumé and other resources
- `frames_*` — Animation frame sequences

## Deployment

Compatible with static hosting platforms such as GitHub Pages, Netlify and Vercel.

## License

Third-party libraries, assets and inherited source components remain subject to their respective licences and applicable permissions.

Personal content and original contributions © MD Junaid.