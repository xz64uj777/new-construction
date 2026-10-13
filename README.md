# BuildWorks — Construction Simulator

A new, mobile-friendly 3D construction simulator prototype. This repository is separate from the earlier BuildWorks/Ground Works project.

## Play the prototype

The game is a browser-based 3D prototype built with Three.js. Open `index.html` through a local static web server, or enable GitHub Pages using **Settings → Pages → Build and deployment → GitHub Actions**. The included workflow deploys the game on pushes to `main` once Pages is enabled.

Three.js is loaded from jsDelivr, so an internet connection is required.

## Current prototype features

- 3D worksite, road, marked foundation pad, basic equipment models, orbit camera and touch-friendly controls.
- Contract board with five different jobs: house foundation, warehouse slab, bridge abutment, stormwater pipe run and access road.
- Each contract spawns only its assigned equipment list.
- Drive equipment around the site, switch machines, operate basic excavator/pump/crane/dump-bed interactions, deploy pump stabilizers, pump concrete, and advance construction stages through inspections.
- Responsive HUD intended for phones and foldable screens.

## Development roadmap

1. Improve vehicle-specific physics, operator controls, attachments and machine animations.
2. Implement project-specific material quantities, loading/unloading, soil movement and concrete placement that changes the actual work surface.
3. Add deeper construction sequencing, budgets, deliveries, equipment rental/ownership, failure conditions and save/load.
4. Replace prototype geometry with higher quality equipment models and improve mobile performance.
5. Package a native Android build after the core game and controls are stable.

## Important

This is an early playable prototype, not a finished simulator. Physics and work interactions are currently simplified; no claim is made that this version has full real-world physics.