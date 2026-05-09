# Publish Check

## Result

Checked on 2026-05-09 for the first GitHub publication pass.

## Compatibility

- Save data uses `localStorage` key `dinoRushEvolution.save.v1`.
- `loadMeta()` fills missing fields with defaults, so adding new save fields does not clear existing progress.
- Existing unlock arrays and records are preserved when new skills, dinosaurs, evolutions, maps, or modes are added.
- Do not change `SAVE_KEY` unless an intentional migration is implemented.

## Expansion Design

- Dinosaurs, skills, specials, evolutions, enemies, maps, modes, and items are loaded from `data/*.json`.
- Runtime asset paths are referenced from JSON through `sprite`, `icon`, `projectileSprite`, and `effectSprite`.
- Boss attack behavior is driven by enemy data fields such as `attackPattern`, `attackInterval`, and attack asset fields.
- Stage progression and endless boss schedule are data-driven through `data/modes.json`.

## Gameplay Invariants

- Ground background, pickups, enemies, boss attacks, and player all use the same world coordinate movement.
- Enemy movement is independent from whether the player is moving.
- Skill acquisition starts from normal attack only; skills are learned through level-up choices and unlocks.
- `size` is collision/balance size. Use `displayScale` and `displaySize` for visual tuning.

## Publication Notes

- This is a static web app and can be hosted from the repository root with GitHub Pages.
- Runtime assets are committed from `assets/`, excluding `assets/sheets/`.
- `assets/sheets/` contains local generation sources and audit sheets. It is intentionally ignored to keep the public repository lighter.
- `tmp/` is local scratch space and is ignored.

## Verification Commands

```powershell
node --check src/game.js
node -e "const fs=require('fs'); for (const f of fs.readdirSync('data').filter(f=>f.endsWith('.json'))) JSON.parse(fs.readFileSync('data/'+f,'utf8')); console.log('json ok')"
python -m http.server 4173
```
