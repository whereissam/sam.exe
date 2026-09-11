# SAM.EXE

An explorable low-poly personal world built with React 19, React Three Fiber, Drei, Three.js, and the generated Vinext / Vite scaffold.

See [the next-steps checklist](docs/todo.md) for content to supply, pending verification, and optional future features.

## Run locally

```sh
bun install
bun run dev
```

Open the local URL printed by the server. `bun run build` creates the production build. `bun run check` checks TypeScript.

## Explore

The world is a canal archipelago: six district islands surround a clocktower harbor, with twelve sloping bridges between them. Photography sits highest and travel lowest. Each district has a 4.4-unit ground radius, with buildings and garden props spaced around the perimeter and wider bridge lanes between islands. Jagged rock foundations, suspended fragments and waterfalls make the underside part of the scenery. Travellers follow the island heights and bridge slopes; canals block walking and route shortcuts. `Harbor.tsx` builds the scenery and `island-layout.ts` shares its land, obstacles and elevations with navigation.

- WASD or arrow keys move relative to the camera; the island edge and installations block movement. Click/tap walkable ground to walk there. Keyboard movement cancels the destination. The closest district gets the E prompt.
- Drag to orbit, scroll or pinch to zoom, and right-drag or two-finger drag to pan. The +/− controls zoom up to close model detail; the clean-view control hides navigation.
- Click a 3D label or a district in the bottom navigation to open its field notes.
- Press E near an installation; Escape closes the panel.
- Touch movement controls are available on small screens.
- Sun/moon toggles lighting; reset restores the camera and both travellers.
- The speaker button toggles gentle synthesized sound effects and remembers your choice. Audio begins after an interaction and goes silent in hidden tabs. The photo atlas has the same control.

## Make it yours

- `components/world/districts.ts`: district names, descriptions, technologies, and world positions.
- `components/world/World.tsx`: procedural island, installations, robot, and movement.
- `app/page.tsx`: interface and interactions.
- `app/globals.css`: art direction and responsive layout.

The district copy is starter content, not verified project case studies. Add your real project links and contact details before publishing. No accounts, analytics, paid services, or external model downloads are required. Google Fonts is optional and falls back to local sans-serif fonts. The 3D scene requires WebGL; district navigation remains available if it fails.

## Mobile and limited connections

Save-Data connections and detected 2G connections start in the lightweight chapter view. Other devices enter the full-screen island automatically. The Three.js module is dynamically imported only after entering 3D. All six chapters work without it. Mobile 3D uses DPR 1, no shadows or particles, no automatic rotation, and on-demand rendering while idle. Opening a chapter or hiding the browser tab pauses rendering; exiting 3D unmounts the canvas. The interface keeps the island full-screen with a compact chapter dock. Chapter details use a modal dialog that fills narrow screens, keeping background controls out of the way.

Travel includes Berlin, Taipei, New York, and Tokyo as requested. Eight credited demonstration photographs and four visibly labeled sample journals fill these cities until originals are supplied. Photography opens a walkable world atlas. Enter a country to explore its framed photographs with a binocular-holding traveller, scroll/swipe navigation and a prominent local landmark. Taiwan has Taipei 101, Germany Brandenburg Gate, the United States the Empire State Building and Japan Tokyo Tower. Photo notes and credits remain available; travel stories reference the same photographs. Use `bun run content:import /path/to/stories-source.json` to process supplied images. See [the content guide](content/README.md).

## Blender asset workflow

Blender is not required to run this project. The world uses six Blender-generated district models, with procedural geometry as a loading and error fallback. For a later art pass, build each district as an independent low-poly collection, apply transforms, and export one GLB per district. Use meters with the installation centered at the origin. Keep assets within a roughly 3m-wide footprint. Prefer shared materials, bake detail, keep textures small, and measure on real mobile hardware before adding effects. The photo garden uses WebGL textures; the direct chapter experience retains HTML photography for visitors outside the 3D world.

Six models were generated with Blender 5.2.1 LTS and visually checked by re-importing the exported GLBs. Regenerate them with: `bun run models:build`. See [the Blender kit guide](assets/blender/README.md) for commands, art direction, budgets, and verification status.

Validation: TypeScript and production builds are checked. Real-device frame rate and loading time still need measurement; a successful build is not a mobile performance benchmark.

## Performance measurement

The opt-in `?perf=1` panel reports browser paint timings, asset transfers, horizontal overflow, and scene render samples locally. Enter 3D and use its 8-second render-sample button. This does not simulate a phone CPU or network. See [the test report](reports/mobile-performance.md) for measured environment, results, and limitations.

## Small world interactions

Collect the three golden sparks by walking close to them or clicking/tapping their star controls. The count and brief discovery notices remain available in the interface. The center beacon responds with an expanding ring, and lights mint after all three sparks are found. Focus or hover over a district to light up its platform. Reduced motion keeps the responses without the pulse animation; mobile avoids continuous collectible animation.

## Personal Blender artwork

`assets/blender/sam-exe-personal-world.png` is the custom SAM.EXE diorama. Its editable source is `assets/blender/sam-exe-personal-world.blend`; regenerate it with `scripts/blender/render_personal_world.py` in a fresh background Blender process.

### Travellers and visitor passports

The two personalized Blender travellers are now playable: use WASD, the touch direction buttons, or tap walkable ground. Tap navigation plans a route around installations; keyboard input cancels that route. Switch the selected traveller with the Sam / Companion button; the other replans a route to follow at a short distance. Switching cancels the previous destination without moving either traveller instantly. Wave and Jump affect the selected traveller; Celebrate affects both. Reduced-motion mode keeps gestures restrained, and mobile rendering requests frames only while there is movement or an action.

`components/world/exploration.ts` owns the movement state independently of rendering. Its simulation tests cover routes around obstacles, an island tour, repeated switching, manual cancellation, reset, invalid targets, and settling to idle. These checks do not replace hands-on browser or real-phone validation.

The English **My passport** panel persists district stamps, collected sparks, selected traveller, nickname and a private note in `localStorage` (`sam-exe-passport-v1`). Progress restores on another visit in the same browser. Visitors can download a JSON copy. There is no account, server upload, public guestbook, cross-device sync or import flow. Unavailable browser storage shows a download reminder. Tests cover stored-data validation and the existing movement/collision rules; real-device interaction and performance remain unmeasured.

## Memory atlas and daily routines

The Darkroom now opens a second, walkable 3D scene with country destinations. Tap a destination to walk there, or use WASD/arrows and press E nearby. Inside a country, scroll, swipe, or use Previous/Next to walk along its framed photographs; the traveller looks through binoculars when standing still. Back to the atlas returns to the destinations, and the top-right close button returns to the original island without resetting it. Countries come from photo metadata or linked travel journals, and demo credits remain visible.

The main island follows the visitor’s local clock: morning stretches (07–11), a little laptop work (11–17), looking around (17–21), and a book while winding down. Night lighting starts automatically at 22:00 and ends at 07:00 unless the visitor manually changes it. In night mode, idle travellers lie down with pillows and sleepy Zs. Routines start after four seconds of inactivity; walking and gestures interrupt them. These are local visual routines, not background jobs.

## Expanded curiosity garden

The main island now has more than twice its previous walkable area, relocated districts, inlaid floor signs, a koi pond, a windmill and a campfire. Click the objects or their floor signs to interact; Tab exposes equivalent focusable controls. Garden objects are included in route planning and collisions.

The Memory Atlas now uses geographic country positions and recognizable raised continents on a walkable tabletop. See [map data notes](docs/world-map-data.md) and the current [verification checklist](docs/todo.md). Existing character controls, daily routines, passport features and stepped zoom are preserved.
