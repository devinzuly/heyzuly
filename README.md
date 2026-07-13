# Hey Zuly

Landing site and future app for [heyzuly.com](https://heyzuly.com) — a warm AI wellness guide (Comadre Guide persona).

## Status

- **Production:** Live on Cloudflare Pages (static build from `dist/`)
- **Source:** Astro 5 project in `src/` — editable components, entity-led copy

## Local development

```bash
cd C:\Users\1devi\Projects\heyzuly
npm install
npm run dev
```

Open [http://localhost:4321](http://localhost:4321). The dev server hot-reloads Astro components and CSS.

## Build & deploy

```bash
npm run build   # outputs to dist/
npm run preview # serve dist/ locally
```

Cloudflare Pages auto-deploys on push to `main` when the build command is `npm run build` and output directory is `dist/`.

## Project structure

```
src/
  components/   # Hero, Pillars, Waitlist, etc.
  layouts/      # BaseLayout.astro
  pages/        # index.astro, 404.astro
  styles/       # global.css (ported from production)
public/         # favicon.svg, robots.txt
dist/           # build output (deployed to Pages)
docs/           # roadmap, persona spec, brand docs
```

## Docs

- [`HANDOFF.md`](./HANDOFF.md) — infrastructure continuity
- [`docs/Dev-Roadmap.md`](./docs/Dev-Roadmap.md) — phased development plan
- [`docs/Zuly-Entity-Demographic-Proposal.md`](./docs/Zuly-Entity-Demographic-Proposal.md) — entity voice & copy
- [`docs/Zuly-Persona-Spec.md`](./docs/Zuly-Persona-Spec.md) — voice anchors & starter exemplars
- [`docs/Onda-Zuly-Brand-Architecture.md`](./docs/Onda-Zuly-Brand-Architecture.md) — brand system
- [`docs/CLOUDFLARE-SETUP.md`](./docs/CLOUDFLARE-SETUP.md) — Pages deploy guide

## Notes

- Waitlist form is **client-side only** (Phase 2 adds persistence)
- Log in link is a placeholder until Phase 3 auth ships
- Brand is **entity-led** — no founder biography on site
