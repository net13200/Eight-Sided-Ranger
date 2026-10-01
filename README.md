# Eight-Sided Ranger

A mobile-first browser puzzle game: you are a d8 rolling on a grid of triangles through the Greenwood. The face on the edge you roll across acts. The follow-up to [Six Sided Knight](https://github.com/net13200/Six-Sided-Knight).

Status: early development: engine, the Edgewood (10 levels), the world map and the Daily Trail.

```sh
npm install
npm run dev          # play at http://localhost:5173 (?level=3 jumps to a level)
npm run check        # typecheck, lint, format, unit tests (every level solved at par)
npm run test:e2e     # browser tests at phone sizes (Playwright)
npm run build        # dist/ (static, relative paths)
npm run build:playtest     # one self-contained HTML file (a private playtest page)
node tools/screens.mjs "?level=2" screens   # screenshots at phone and 16:9 sizes (needs vite preview on :4173)
```

```
src/engine/   pure, deterministic rules: the d8, the triangle grid, a turn, level files
src/solver/   BFS solver (par) and the teaches-check
src/levels/   level files (data/*.txt)
src/game/     browser game: stage, loop, input, scenes, drawing
src/platform/ host adapter: storage, share, visibility (no ads, no analytics)
src/i18n/     t()/tn()/tk(); lazy-loaded languages
```
