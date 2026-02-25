# Cross Road Multi-Agent Design

**Goal:** Split future work into three parallel, low-conflict tracks: art replacement, mobile UX, and difficulty balance.

**Architecture:** Keep gameplay logic, rendering, and input decoupled. Art replacement should only touch rendering and asset loading. Mobile UX should only touch layout, scaling, and touch UI. Difficulty balance should only touch level generation and parameters. This separation minimizes merge conflicts and keeps each track independently reviewable.

**Tech Stack:** HTML5 Canvas, vanilla JS modules, esbuild for bundling, Jest-like tests (bun test runner) already in repo, Git worktrees for isolation.

## Track A: Art Replacement (Cars + Bats)
- Replace box sprites with side-view cartoon car images and a bat image.
- Assets live under `assets/sprites/` with consistent naming.
- Rendering uses cached images; entity size stays consistent with collision logic.
- Direction changes for vehicles use horizontal flip.

## Track B: Mobile UX
- Use `visualViewport` for accurate safe area calculations.
- Adjust portrait/landscape scale ratios and keep game centered inside safe area.
- Touch UI remains visible only on mobile, and does not occlude key HUD elements.
- Rotation should reflow immediately.

## Track C: Difficulty Balance
- Control difficulty with complexity rather than sheer vehicle count.
- Increase variability: speed ranges, length ranges, reverse chance, variable speed cars.
- Coins spread more with level; require 9/15 coins to pass.

## Out of Scope
- Multiplayer, new game modes, or large refactors.
- New physics or AI pathfinding.

## Success Criteria
- Visuals: Cars and bats render as images without breaking collisions.
- Mobile: Full scene visible on phone in both orientations, controls usable.
- Balance: Levels 1–9 feel progressively harder but remain fair.
