# BuildWorks — Construction Simulator

A new, mobile-friendly 3D construction simulator prototype. This repository is separate from the earlier BuildWorks/Ground Works project.

## Play the prototype

The game is a browser-based 3D prototype built with Three.js. Open `index.html` through a local static web server, or enable GitHub Pages using **Settings → Pages → Build and deployment → GitHub Actions**. The included workflow deploys the game on pushes to `main` once Pages is enabled.

Three.js is loaded from jsDelivr, so an internet connection is required.

## Current prototype

- One playable starter-house contract, from lowboy delivery through site preparation, excavation, concrete foundation, lumber/frame, driveway and fleet return.
- Tractor/lowboy and wheel loader are owned; the mini excavator is rented for the foundation.
- Player-operated work and qualified crew assignments; crew, rental and material costs affect career cash.
- Contract settlement pays once; the job panel can restart any completed task, charge a rework fee, and reset later stages.
- Career cash, fleet ownership, contract stage, materials and crew persist in local browser storage.
- Phone-first dual joysticks — left stick drives, right stick runs the loader bucket or excavator boom — plus touch buttons, marked work zones, route map and visible worksite changes. Vehicle and soil behavior remains simplified.

## Development roadmap

- Add larger contracts and equipment such as a dozer, dump truck, roller and concrete equipment.
- Expand fleet purchases, rentals, crew qualifications and career progression.
- Improve construction materials, machine attachments, site interactions and mobile performance.
- Revisit Android packaging if installable/offline play or measured performance benefits justify it.

## Important

This is an early playable prototype, not a finished simulator. Physics and work interactions are currently simplified; no claim is made that this version has full real-world physics.