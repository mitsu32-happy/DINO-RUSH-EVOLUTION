# DINO RUSH: EVOLUTION Handoff

This document preserves project context so development stays coherent even if chat context is compacted.

## Product Direction

- Title: `DINO RUSH: EVOLUTION`
- Genre: dinosaur evolution survivor-like web game.
- Platform: static web app, smartphone portrait first.
- Target viewport: `390x844`.
- Language: Japanese UI/localization.
- Deployment assumption: GitHub Pages or equivalent static hosting.

## Current MVP

- Map: `三畳紀の密林`
- Player dinosaur: `ティラノサウルス`
- Initial action: normal attack `噛みつき` only.
- Learnable skills: `尻尾薙ぎ払い`, `突進`, `火炎ブレス`.
- Evolutions:
  - `タイラントレックス`: Lv6 + `突進` Lv2 + `尻尾薙ぎ払い` Lv2. Effects: max HP x1.25, damage x1.25, speed x1.08, special changes to `タイラントクラッシュ`.
  - `ブレイズレックス`: Lv6 + `火炎ブレス` Lv2 + either `突進` Lv2 or `尻尾薙ぎ払い` Lv2. Effects: max HP x1.1, damage x1.16, special cooldown x0.75, aura damage 7/sec, special changes to `インフェルノバースト`.
- Boss: `古代スピノサウルス`.
- Save: `localStorage` under `dinoRushEvolution.save.v1`.
- Current normal-mode balance target: evolution around mid-game and first boss at 105 seconds, with a gentler early curve so a normal run can plausibly reach Lv6 before the boss.
- Current hard-mode balance target: boss around 210 seconds with high enemy HP, damage, speed, and spawn pressure.
- Clear conditions:
  - Normal: clear by defeating the boss. Records clear flag only.
  - Hard: unlocked by normal clear, clear by defeating the boss, roughly five minutes longer than normal. Records clear flag only.
  - Endless: unlocked by hard clear, continues after boss defeat. Boss 1, boss 2, boss 3 appear by schedule, then random bosses appear. Records high score.

## Architecture

- Entry: `index.html`
- Styles: `styles.css`
- Game loop and rendering: `src/game.js`
- Data:
  - `data/dinosaurs.json`
  - `data/enemies.json`
  - `data/evolutions.json`
  - `data/items.json`
  - `data/maps.json`
  - `data/modes.json`
  - `data/skills.json`
- Assets:
  - Characters: `assets/characters/`
  - Enemies: `assets/enemies/`
  - Bosses: `assets/bosses/`
  - Items: `assets/items/`
  - Skills: `assets/skills/`
  - Backgrounds: `assets/backgrounds/`
  - Effects/projectiles: `assets/effects/`

The game is intentionally data-driven. Prefer adding or adjusting JSON fields over hard-coding new entities.

## Gameplay Invariants

These have been discussed and should not be changed casually.

- Background terrain must move at the same camera/world speed as items, enemies, and the player. The current fix uses `scrollX = cameraX` and `scrollY = cameraY` in `drawTerrainBackground`. Do not reintroduce parallax for the ground layer.
- Enemies must behave the same whether the player is moving or standing still. Do not add distance-based catch-up or player-movement-based speed correction unless explicitly requested.
- If enemies feel too slow or too fast, tune base `speed` in `data/enemies.json`.
- Difficulty should be tuned mostly through `data/enemies.json`, `data/dinosaurs.json`, `data/items.json`, `data/modes.json`, spawn interval/counts in `updateSpawns`, mode multipliers, endless difficulty scaling, and the XP curve in `gainXp`. Keep enemy movement independent from player movement.
- `size` is gameplay collision/balance size. Do not use it only to tune visuals.
- Use `displayScale` for enemy/boss visual size and `displaySize` for item visual size.
- The first run state should start with normal attack only. Learned skills come from level-up choices.
- Skill max level is currently 8. Level-up screens randomly show exactly 3 choices from skill learn/upgrade, max HP up, damage up, speed up, pickup range up, and HP recovery. If any learned skill reaches max level, HP recovery enters the choice pool.
- Skill detail UI pauses the game while the explanation is open.
- Evolution checks should happen after the level-up skill choice is applied, so a newly learned skill can immediately unlock an evolution selection screen.
- Full-screen movement input should work anywhere except UI areas such as pause, special button, overlay, HUD, and skill icons.
- Skill actions should make the visible motion match the attack hitbox. `突進` moves the player through a line hitbox, `尻尾薙ぎ払い` uses a rear sweep arc, and `火炎ブレス` fires forward spread projectiles whose count scales with skill level.

## Visual Direction

The approved style is polished stylized 2D mobile game art:

- More game-like than realistic.
- Painterly, high-quality, readable at small sprite sizes.
- Prehistoric jungle action mood.
- No pixel art.
- No photorealism.
- No UI text baked into generated art.
- Use transparent PNGs for game assets.

Current generated assets already follow this style:

- `assets/characters/tyranno-game-sample-sprite.png`
- `assets/characters/evolution-tyrant-rex.png`
- `assets/characters/evolution-blaze-rex.png`
- `assets/evolutions/evolution-tyrant-rex-icon.png`
- `assets/evolutions/evolution-blaze-rex-icon.png`
- `assets/enemies/enemy-raptor-stylized.png`
- `assets/enemies/enemy-bug-stylized.png`
- `assets/bosses/boss-spino-stylized.png`
- `assets/items/item-meat-stylized.png`
- `assets/items/item-dna-stylized.png`
- `assets/skills/skill-bite.png`
- `assets/skills/skill-tail-sweep.png`
- `assets/skills/skill-rush.png`
- `assets/skills/skill-fire-breath.png`
- `assets/specials/special-primal-roar.png`
- `assets/backgrounds/triassic-jungle-ground.png`
- `assets/effects/projectile-fireball.png`

## Asset Pipeline

Preferred flow for generated bitmap assets:

1. Generate on a flat chroma-key background, usually `#ff00ff`.
2. Use the installed imagegen chroma-key remover:
   `C:\Users\oushi\.codex\skills\.system\imagegen\scripts\remove_chroma_key.py`
3. Crop transparent margins and resize for runtime use.
4. Save final assets into the relevant `assets/` subfolder.
5. Update `data/*.json` to reference the final asset path.
6. Do not rely on files under `C:\Users\oushi\.codex\generated_images\...` at runtime.

Keep generated source/intermediate files out of the runtime asset set unless they are intentionally used.

## Long-Term Asset Production Rules

For future asset work, choose the generation/management unit before creating files.

Current best unit:

- Characters/enemies/bosses: one gameplay entity asset per base form, then add future skins/seasonal variants as sibling files with shared naming.
- Skills/specials: one ability icon per ability id, referenced from JSON through `icon`, `effect`, and `sound`.
- Projectiles/effects: one reusable projectile or effect asset per effect family, referenced from JSON through fields such as `projectileSprite`.
- Backgrounds: one map-ground asset per map/theme. Ground must stay world-locked, not parallaxed.
- Audio: current MVP uses procedural WebAudio keyed by `sound`. This keeps runtime fast and avoids file/license management. Future audio files should use the same `sound` ids.

Preferred naming:

- `assets/characters/<entity-id>-<variant>.png`
- `assets/enemies/<enemy-id>-<variant>.png`
- `assets/bosses/<boss-id>-<variant>.png`
- `assets/items/<item-id>-<variant>.png`
- `assets/skills/skill-<skill-id>.png`
- `assets/specials/special-<special-id>.png`
- `assets/effects/<effect-or-projectile-id>.png`
- `assets/backgrounds/<map-id>-<theme>.png`

Scalability rules:

- Prefer shared base assets plus recolor/part/event overlays when possible.
- Keep transparent padding consistent and crop final runtime files.
- Keep JSON references stable so skins, color variants, evolution differences, and limited-event assets can be swapped without combat-code changes.
- Do not create one-off formats per asset. Reuse the same pipeline: generate, chroma-key, crop/resize, save to folder, reference in JSON.
- Prioritize work speed, mass production, extensibility, consistency, then individual asset polish.

## Current UI Behavior

- HUD uses skill icons from `data/skills.json`.
- Tapping a HUD skill icon opens a paused detail panel.
- Level-up skill acquisition cards show skill icons.
- Special button remains separate on the lower right.
- Movement joystick appears at the touch/drag start position and can be used from most of the game screen.

## Verification Checklist

## 2026-05-09 Update Notes

- Added a separate Title -> Home flow. Home contains Stage, Shop, Codex, High Score, and Settings.
- Stage opens the existing map/mode selection.
- Shop currently unlocks DNA-gated skills: `lightning_dash`, `toxic_spit`, and `meteor_stomp`. The dinosaur shop slot is present for future additions.
- Codex shows discovered/used skills, dinosaurs, and evolution forms.
- High Score shows endless records per stage; the current single stage uses the Triassic endless record.
- Settings includes audio on/off and save reset.
- Added six skill definitions and icons. Three are default pool skills; three are DNA shop unlocks.
- Added four evolution definitions and assets: `gaia_rex`, `storm_rex`, `venom_rex`, and `iron_rex`.
- The six added skill icons and six evolution-special icons were replaced with an AI-generated 4x3 icon sheet, sliced into runtime files. Source sheet: `assets/sheets/skill-special-icons-20260509-ai-sheet.png`.
- Added AI-generated effect sheet `assets/sheets/skill-effect-sprites-20260509-ai-sheet.png` and sliced dedicated effect sprites for toxic projectile, lightning dash, crystal spikes, and meteor stomp.
- Added skill-specific runtime effects: rending claw slashes, crystal spike burst, guard roar shockwave, lightning dash trail, toxic projectile/muzzle, and meteor stomp crater.
- Added AI-generated sheets for new enemies/dinosaurs and special effects:
  - `assets/sheets/dinosaur-enemy-sprites-20260509-ai-sheet.png`
  - `assets/sheets/special-effect-sprites-20260509-ai-sheet.png`
- Added two timed enemy variants:
  - `horned_runner`, unlocked into the spawn table after 45 seconds.
  - `poison_crawler`, unlocked into the spawn table after 95 seconds.
- Added shop-unlocked playable dinosaurs:
  - `velociraptor`, cost 320 DNA, special `raptor_pounce`, evolution `storm_raptor`.
  - `triceratops`, cost 360 DNA, special `guardian_charge`, evolution `fortress_triceratops`.
- Only `tyranno` is unlocked by default. Stage select lets the player choose among unlocked dinosaurs.
- Special effects now support dedicated sprite-backed visuals for primal roar, raptor pounce, guardian charge, tyrant crash, gaia/storm/venom/iron-style evolved specials.
- Future skill/special icons should use AI illustration generation or sheet generation first, not simple procedural/vector placeholders, unless explicitly marked as temporary.
- Healing item drops were reduced after balance feedback: normal 7%, hard 4.5%, endless 5%, and this meat drop path excludes bosses.
- Hard mode remains around a 210-second boss target but uses higher enemy pressure than the previous easy version.
- 2026-05-09 UI/evolution pass:
  - Asset version: `20260509-ui-evo1`.
  - Cleaned `assets/characters/evolution-storm-raptor.png`; the right-edge stray fragment is removed.
  - Added `assets/ui/title-hero-20260509.png` and changed the title screen to use it as full-panel key art.
  - Home screen now omits title/stat tiles and uses icon-based menu buttons.
  - Stage select now chooses stage first, then unlocked/purchased dinosaur, then mode. Dinosaur cards are horizontal-scroll and locked dinosaurs are hidden.
  - Settings now includes a control layout toggle for swapping joystick and special button sides.
  - `velociraptor` and `triceratops` now each have six total evolution options, matching Tyranno's count.
- 2026-05-09 usability/asset cleanup pass:
  - Asset version: `20260509-ui-evo2`.
  - Shop purchases now open an in-game confirmation dialog before spending DNA.
  - Codex is now tabbed by Skills, Dinosaurs, and Evolutions to reduce vertical scrolling.
  - Subscreens now include a sticky top Home button in addition to the lower button.
  - Save reset now requires two confirmation dialogs.
- 2026-05-09 endless boss pass:
  - Asset version: `20260509-endless-bosses1`.
  - Endless boss schedule is fixed at 120s `ancient_spino`, 300s `obsidian_ceratops`, and 480s `storm_quetzal`. After the scheduled list, random bosses spawn from the boss pool every `randomBossInterval` seconds, reduced by boss kills with a 90s minimum.
  - `obsidian_ceratops` now has its own AI-generated sprite and a telegraphed obsidian spike eruption attack.
  - `storm_quetzal` now has its own AI-generated sprite and fires spread storm-bolt projectiles.
  - Boss attack assets are transparent PNGs under `assets/bosses/` and `assets/effects/`; source/keyed files are preserved under `assets/sheets/`.
- 2026-05-09 input/audio fix pass:
  - Asset version: `20260509-input-audiofix1`.
  - Stage select dinosaur taps no longer re-render the stage select view, preserving horizontal scroll position.
  - The title-to-home click handler is explicitly removed when leaving the title screen so the first home click is not swallowed.
  - SFX clips are tracked and cleaned up; failed HTMLAudio playback falls back to procedural WebAudio sounds.
  - Home Stage icon was replaced with `assets/ui/home-stage-icon-20260509.png`.
  - Evolution icons were regenerated from transparent sprites into a consistent circular badge format.
  - Previously corrupted Japanese strings in the newly added raptor/triceratops evolutions were restored.
- 2026-05-09 title video / sprite cleanup pass:
  - Asset version: `20260509-ui-evo3`.
  - Title screen now uses `assets/ui/titlemovie.mp4` as an autoplaying muted loop with the title and START UI overlaid. The user's MOV source was converted from ProRes to H.264 MP4 for browser support and runtime size.
  - `velociraptor`, `triceratops`, and `alpha_raptor` were regenerated as one-source-image-per-character instead of slicing them from a crowded sheet. This is the preferred approach for wide silhouettes that are prone to sheet-split clipping.
  - Updated runtime sprites/icons:
    - `assets/characters/velociraptor-sprite.png`
    - `assets/characters/velociraptor-icon.png`
    - `assets/characters/triceratops-sprite.png`
    - `assets/characters/triceratops-icon.png`
    - `assets/characters/evolution-alpha-raptor.png`
    - `assets/evolutions/evolution-alpha-raptor-icon.png`
  - `assets/effects/special-iron-roar-effect.png` and `assets/characters/evolution-alpha-raptor.png` were re-saved with normalized alpha pixels after transparency validation.
  - Bottom `ホームへ` buttons were removed from sub screens; the sticky top Home button is now the return path.
  - Home icons use `object-fit: contain` so Shop/Codex icons no longer crop.
  - Settings now includes a `タイトル画面` menu item.

- 2026-05-09 evolution/audio pass:
  - Asset version: `20260509-audio-assets1`.
  - Regenerated six clipped evolution sprites as one-source-image-per-character with chroma-key removal and 24px minimum transparent margin:
    - `evolution-crystal-triceratops`
    - `evolution-shadow-raptor`
    - `evolution-storm-triceratops`
    - `evolution-titan-triceratops`
    - `evolution-venom-raptor`
    - `evolution-venom-triceratops`
  - Regenerated the matching evolution icons from the new transparent sprites using the circular badge format.
  - Audit sheet: `assets/sheets/evolution-regeneration-audit-20260509.png`.
  - Title movie audio now attempts to unmute on user interaction while keeping muted autoplay as the visual fallback required by browser policy.
  - Added CC0 audio assets:
    - `assets/audio/bgm-rumble-jungle.ogg`
    - `assets/audio/sfx-*.ogg`
    - Source/license notes: `assets/audio/ATTRIBUTION.md`.
  - Runtime audio now prefers real BGM/SFX assets and keeps existing WebAudio synthesis as an extra accent/fallback.
- 2026-05-09 audio tuning pass:
  - Asset version: `20260509-audio-settings1`.
  - Added BGM/SFX volume sliders to Settings and Pause.
  - Added a title-screen `音声をオン` button for explicit video unmute after browser autoplay restrictions.
  - Added calmer home/menu BGM: `assets/audio/bgm-home-calm.ogg`.
  - Replaced the active SFX set with local 効果音ラボ MP3 files keyed by skill flavor: bite, claw, tail, rush, fire, crystal, roar, lightning, toxic, meteor, impact, pickup, heal, level, evolve, damage, and UI.
  - Skill `sound` keys were split per skill instead of reusing only `area` / `line` / `cone`.
- 2026-05-09 title/codex/result pass:
  - Asset version: `20260509-title-codex1`.
  - Rebuilt `assets/ui/titlemovie.mp4` from the user's MOV with explicit AAC audio mapping; previous MP4 had no audio stream.
  - Title screen audio control is now an explicit ON/OFF toggle button.
  - Result display now plays `clear` / `result` sound effects.
  - Shop purchase confirmation now plays `buy` (`assets/audio/sfx-buy.mp3`).
  - Codex now has only Skills and Dinosaurs tabs. The Dinosaur tab lets the player select a dinosaur, then shows only that dinosaur's evolution forms below it.
- 2026-05-09 SFX/scroll pass:
  - Asset version: `20260509-sfx-scroll1`.
  - Added runtime SFX maximum durations so long source files are cut to action-game lengths. Special/evolution/meteor/fire/heal/pickup sounds no longer ring out for their full source duration.
  - Stage and dinosaur horizontal lists now support card-area pointer drag/swipe scrolling, not only scrollbar dragging.
- 2026-05-09 title audio isolation pass:
  - Asset version: `20260509-title-audiofix1`.
  - Title video playback is now explicitly stopped, muted, reset, and source-detached whenever leaving the title screen or starting a run.
  - The title video keydown audio-unlock handler is removed when leaving title, preventing stale title movie audio from being resumed by gameplay input such as special activation.

Run these after changes:

```powershell
node --check src/game.js
$ErrorActionPreference='Stop'; Get-ChildItem -Path data -Filter '*.json' | ForEach-Object { Get-Content -LiteralPath $_.FullName -Raw -Encoding UTF8 | ConvertFrom-Json | Out-Null }; 'JSON UTF-8 OK'
python -m http.server 4173
```

Browser checks at `http://localhost:4173/`:

- Title screen loads with no console errors.
- `出撃` starts the run.
- Background, player, enemies, items, and skill icons render.
- Dropped items stay visually locked to the ground while moving.
- Enemies move consistently whether the player is moving or standing still.
- Skill acquisition screen shows icons.
- Skill detail opens on icon tap and pauses the game.
