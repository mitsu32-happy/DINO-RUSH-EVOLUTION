# Codex Handoff Rules

Read `docs/PROJECT_HANDOFF.md` before making changes. It contains the current product decisions, visual direction, gameplay invariants, and verification checklist.

Critical invariants:

- Keep the game Japanese-localized.
- Keep the main target viewport as mobile portrait `390x844`.
- Keep background terrain locked to world coordinates. Do not add parallax to the ground layer.
- Keep enemy movement independent of whether the player is moving. Do not add player-moving or distance-based catch-up correction unless the user explicitly asks.
- Keep `size` as gameplay collision/balance size. Use `displayScale` or `displaySize` for visual tuning.
- Keep initial combat as normal attack only. Skills are learned from level-up choices.
- Keep data-driven expansion through `data/*.json` where practical.

