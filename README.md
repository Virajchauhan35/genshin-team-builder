# Genshin Team Builder

Tell it which Genshin Impact characters you own, and it tells you the team that actually works, how to play it, and who to pull next.

**Live demo:** _add your Vercel link here_

![Screenshot](docs/screenshot.png)

## Features

- **My Characters:** mark what you own; it's saved in your browser (localStorage), so it survives refreshes.
- **Team Builder:** pick characters and get a matching team with a percentage score. If no preset comp fits, it builds a team from element and role rules and shows only the gaps that matter.
- **Team guides:** every comp has a one-line hook, a difficulty tag, 3 steps, a rotation, and stat priorities.
- **Single-character view:** see the best teams for one character, including supports like Xianyun and Albedo.
- **Who to Pull:** ranks the characters you don't own by how much they would unlock or improve your best teams.

## How the team engine works

Each character has 0-10 role scores (`dps`, `subdps`, `healer`, `shielder`, `support`) in `src/data/roleScores.json`. Preset comps live in `src/data/archetypes.json` as slots with a role and a list of ideal characters.

`src/engine/teamEngine.js` tries every way of placing your characters into a comp's slots, keeps the best weighted total, and falls back to reaction-based generation (Vaporize, Melt, Freeze and so on) when nothing fits. The pull recommender reuses the same scoring: it compares your best score for each comp with and without each candidate.

## Tech

React, Vite, plain JavaScript. No backend; all data is local JSON.

## Run locally

```bash
npm install
npm run dev
```

## Project structure

```
src/
  data/       characters.json, archetypes.json, roleScores.json, guides.json
  engine/     teamEngine.js (matching, generation, pull recommendations)
  hooks/      useOwned.js (owned list + localStorage)
  pages/      MyCharacters, TeamBuilder, PullAdvisor
  ui/         shared components and styles
```

## Adding a character or comp

1. Add the character to `characters.json` (one per line) and an icon to `public/characters/` (lowercase filename).
2. Add role scores to `roleScores.json`.
3. For a new comp, add it to `archetypes.json` and write its guide in `guides.json` under the same id.
