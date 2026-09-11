# SAM.EXE — next steps

Updated: 2026-09-11. Unchecked items are pending; optional ideas are not launch requirements.

## More room on every island

- [x] Increase district ground radius from 2.9 to 4.4 units (about 2.3× the area) and the central harbor from 3.15 to 4.5 units.
- [x] Spread district centers outward, move houses, trees, benches and garden interactions toward the perimeter, and keep exhibit sizes unchanged.
- [x] Widen bridge walking lanes from 1.35 to 1.8 units, with matching decks and rails; preserve each island's elevation and sloping connections.
- [x] Reposition collectibles and the boat route, expand shadow coverage, and fit the larger layout on narrow screens without collapsing zoom levels.
- [ ] Review the new spacing and overview composition on desktop and phone screens.

## Sound effects

- [x] Add quiet synthesized footsteps, discovery chimes, gallery navigation and cues for gestures, koi feeding, the campfire, windmill, beacon and boat.
- [x] Add synchronized sound toggles in the island controls and photo atlas; remember the preference locally.
- [x] Create audio only after a visitor gesture, throttle footsteps, silence hidden tabs and release the audio context on unmount. No audio downloads or looping background music.
- [x] Pass TypeScript, the production build and all 48 tests, including audio activation, mute, throttling, hidden-tab silence and cleanup.
- [ ] Listen on desktop and mobile browsers to check perceived volume, timbre and audio activation after the first interaction.

## Latest canal archipelago and country gardens

- [x] Replace the single broad platform with a central harbor and six district islands connected by twelve bridges.
- [x] Give districts different ground elevations (−0.4 to 2.8 units); bridge slopes and traveller height share the same terrain data.
- [x] Replace the flat underside with irregular faceted rock strata, offset pointed foundations, suspended fragments and two waterfalls above a lower water plane.
- [x] Add canal houses with windows on every side, a central clocktower, palms, lamps, benches and a visitor-controlled sailing boat.
- [x] Add rear details to the robot, camera, computer and blockchain installations, and move collectibles onto separate islands.
- [x] Restrict walking to islands and bridges; test exact land coverage so routes cannot cut across the canals. Verify all six district entrances and garden interactions remain reachable.
- [x] Add larger destination landmarks to photo gardens: Taipei 101, Brandenburg Gate, Empire State Building and Tokyo Tower. Keep smaller versions on the atlas.
- [x] Move photo captions into a compact lower corner card and reserve more camera space for the traveller and landmark.
- [x] Pass TypeScript, the production build and all 42 automated tests, including bridge-height continuity and canal collision checks.
- [ ] Visually review a full orbit of the new archipelago, including bridge seams, rock silhouettes, landmark/photo spacing and floor-sign legibility.
- [ ] Verify mobile framing, touch interaction, night mode, reduced motion and frame rate on a real device. The extra architecture needs performance measurement.

## Earlier island and atlas iteration

- [x] Replace floating district pills with inlaid, clickable floor signs. Sparks and the beacon also use floor plaques; keyboard equivalents appear when focused.
- [x] Enlarge the island from a 7.3 to 10.2 unit top radius and spread the six installations out. Add planted areas and a winding promenade.
- [x] Add three visitor-controlled garden objects: a windmill that starts/stops, koi that gather for food, and a campfire that lights/extinguishes.
- [x] Include the pond, windmill and campfire in walking collision checks and route planning. Simulate a tour of the larger island and every relocated district.
- [x] Preserve the latest character switching/action ring, passport signpost, remembered lighting, daily routines and six-level camera zoom.
- [x] Replace the circular country arrangement with a recognizable 3D world map using Natural Earth coastlines and geographic country label points.
- [x] Keep the character/binocular photo-garden experience: walk into a country, then scroll or swipe along its framed photographs.
- [ ] Check floor-sign legibility and pointer/touch selection at every zoom level and camera angle. These signs are part of the ground and intentionally become small in the far overview.
- [ ] Try all three garden interactions with keyboard, touch, night mode, reduced motion and a hidden/returned tab.
- [ ] Check the world map at phone widths, especially the closely spaced Taiwan/Japan markers, and verify the north-up starting view.
- [ ] Review the archipelago's visual composition in a browser. Automated navigation tests do not verify its appearance.

Map sources and projection notes: [world-map-data.md](world-map-data.md). The map is a walkable tabletop: ocean tiles can also be crossed. Unrecognized country names stay available on an “uncharted” row rather than receiving invented coordinates.

## 1. Add your web apps

The Project Arcade currently contains **SAM.EXE only**. Visitors can walk into it on the island, or open it from the chapter list below the scene without entering 3D. The corner Projects shortcut was removed when the controls moved onto the island.

- [ ] Pick the first 3–6 apps to feature.
- [ ] For each app, supply the details below.
- [ ] Add confirmed entries to [content/projects.ts](../content/projects.ts).
- [ ] Put optimized cover images in [public/projects](../public/projects). Label screenshots and concept artwork accurately.
- [ ] Check every live app and source link before publishing.

Copy this checklist for each app:

```text
App name:
Live URL (or local project folder if not deployed):
Public source URL (optional):
Category:
One-sentence description:
Who it helps / problem it solves:
Your role and contribution:
What makes it interesting:
Tech stack:
Screenshot or short demo recording:
Image description / caption:
Results you can substantiate (optional):
```

### Expand the exhibition after the app list is ready

- [ ] Choose which apps deserve individual 3D display stands; the current world has one shared Project Arcade entrance.
- [ ] Link each stand to its app's case study and live site.
- [ ] Add lightweight screenshot previews to selected stands, then measure their loading cost.
- [ ] Consider a guided project tour so visitors can discover the strongest work quickly.
- [ ] Keep the direct HTML gallery usable on mobile and without WebGL.

## 2. Replace demonstration photography and travel stories

The eight credited demo photos and four sample journals are **not your original photography or personal accounts**.

- [ ] Select your own photos for Berlin.
- [ ] Select your own photos for Taipei.
- [ ] Select your own photos for New York.
- [ ] Select your own photos for Tokyo.
- [ ] Supply titles, locations, dates where known, captions, alt text, and series names.
- [ ] Write a short personal journal for each city and choose its associated photos.
- [ ] Import originals using the [content guide](../content/README.md); preserve the source files.
- [ ] Remove demo labels only from entries actually replaced by original content.
- [ ] Decide whether to show the original couple photo in the gallery. It is currently a Blender reference, not a published gallery entry.

### The walkable memory atlas

Implemented: countries are grouped from the photo catalog onto a recognizable world map with raised land and miniature destination landmarks. Country labels use geographic positions; countries without a known position remain accessible in the uncharted row. Choosing a country walks the traveller there along an obstacle-aware route; entering it opens a photo garden where walking moves along the frames and standing still raises the binoculars. Only the selected traveller appears here — the companion is not rendered in the atlas.

- [x] Prove every country is reachable from every other without crossing a landmark, and that manual walking and tap routes respect the map and photo-garden edges.
- [x] Give the map view and every photograph their own address. `/atlas`, `/atlas/[country]` and `/atlas/[country]/[photo]` are server-rendered pages, and the 3D atlas links out to whichever one matches what you are looking at.
- [x] Open the world map filling the view. It was fitted as though the map stood upright, reserving 64% more vertical room than the camera's tilt ever uses, so it opened at ~69% of the screen instead of ~95%.
- [x] Give every photograph its own address. `/atlas/[country]` and `/atlas/[country]/[photo]` are server-rendered pages with per-photo `openGraph` images, so a photo can be linked and shared, works without WebGL, and is indexable. The 3D atlas links out to them.
- [x] Pan the world map. It only orbited, so the edges were unreachable when zoomed in; drag now moves the map, right-drag turns it, and the view is clamped to the map's own bounds.
- [ ] **Not verified in a browser:** the map drag itself. `OrbitControls` captures the pointer, which synthetic events cannot drive, and this browser's real clicks do not reach the page.
- [ ] Check the country map and photo garden on touch: swipe between photos, pinch zoom, and the back control.
- [x] Push the address from inside the 3D atlas. Entering a country or opening a photo now pushes `/atlas/...` shallowly, so the URL names what is on screen and Back steps through it without reloading the scene. Verified live for opening the atlas and for Back; entering a country needs the traveller to finish walking, which an automated tab will not run.
- [x] Stop the country landmark tracking the traveller. It was pinned to the player's x, so Taipei 101 appeared welded to a walking person; it now drifts at 0.12 of their pace like something far away.
- [x] Fix the night palette inside a country. The photo garden's floor and the caption card were hard-coded light, so the pale night text printed on a cream card and the ground stayed bright.
- [x] Remove the on-screen arrow pad from the atlas, and its dead CSS.
- [ ] Decide whether the companion should appear in the atlas too, or stay an island-only character.
- [ ] Confirm the photo garden still reads well for a country with only one photo, and for the largest country in the catalog.

Sources: [atlas scene](../components/stories/PhotoAtlas.tsx), [layout and routing](../components/world/photo-atlas.ts), [route tests](../components/world/photo-atlas.test.mjs).

## 3. Refine the characters and exploration

Implemented: separate travellers, switching control, following, walking motions, Wave, Jump, and Celebrate. These use rigid-part joints animated in React Three Fiber, not embedded skeletal animation clips.

Also implemented: a local-time daily routine (nap, stretch, work, wander, relax) that the travellers settle into after four still seconds, shared by the island and the photo atlas. Any activity clears the timer, so a routine pose never survives a step.

The controls now live on the island rather than in a corner button bar: click the other traveller to swap, click your own to open an action ring, and click the signpost for the passport. `Q`, `1`/`2`/`3`, and `P` are the keyboard equivalents.

- [ ] Review the latest [facial close-up](../assets/blender/sam-travel-couple-closeup.png): eyes, shallow smiles, hair, likeness, and the revised embrace.
- [x] Replace direct tap movement with obstacle-aware routes and remove the seven-second movement timeout.
- [x] Replace accumulated follower trails with route replanning after movement or character switching.
- [x] Simulate a tour around the island, repeated switches, keyboard cancellation, reset, invalid destinations, and idle settling; check both travellers for collisions and teleporting at each simulation step.
- [x] Simulate the daily routine: prove a four-leg walking tour never lets a nap start, and that gestures, tap routes, held keys, and binocular viewing each interrupt rest on their own.
- [ ] Verify walking and following around every installation, at island edges, and after repeatedly switching characters.
- [ ] Check each gesture while standing, walking, opening panels, and returning from a hidden tab.
- [x] Lay two sleepers side by side. They previously lay down along their walking headings, which point wherever they last travelled, so one body could lie straight through the other.
- [x] Remember the visitor's lighting choice across reloads, and carry night into the photo atlas, which previously always rendered in daylight.
- [ ] **Not yet verified in a browser:** click a traveller to swap, click your own traveller to open the action ring, and click the signpost to open the passport. Automated checks cannot reach these — the world pauses itself when the tab reports hidden, which is the state an automated tab is in.
- [ ] Confirm the `paused` guard on the traveller handlers is not too broad; districts stay clickable while paused but travellers do not.
- [x] Keep the in-world controls usable without hover. Touch devices never fire hover, so the world labels stayed hidden and the mobile hint strip replaced every span with one line — leaving tap-to-swap, the action ring, and the signpost undiscoverable on a phone once the corner buttons were gone. Labels now stay on screen for hover-less pointers, tap targets reach 44px, and the mobile hint line names the travellers.
- [x] Let the control hint strip wrap. Four added lines would have pushed the footer wider than a tablet screen.
- [ ] Check the action ring and traveller labels do not obscure the new floor signs at narrow widths and on touch.
- [x] Replace free-form zoom with a six-level ladder. The buttons, wheel, and pinch all step through the same levels, defined as multiples of the zoom that fits the island so the levels adapt to the viewport.
- [ ] Confirm on a phone that pinch stepping feels right, and tune `PINCH_PER_LEVEL` if a level triggers too eagerly.
- [ ] Check reset, tap-to-walk cancellation, and loading/error fallbacks for both avatars.
- [ ] If more natural movement is needed, add elbow/knee articulation or a skinned rig with animation clips.
- [ ] Optional: add a visitor-triggered greeting, photo pose, or high-five.
- [ ] Optional: decide whether to add a drivable vehicle. A car and vehicle physics are **not implemented**; the current experience uses walking characters.

Sources: [Blender guide](../assets/blender/README.md), [character generator](../scripts/blender/couple.py), [runtime controls](../components/world/Companions.tsx), [daily routine and rest timer](../components/world/daily-routine.ts), [zoom ladder](../components/world/camera-zoom.ts).

The completed navigation and routine checks above are automated simulations in [exploration.test.mjs](../components/world/exploration.test.mjs), [daily-routine.test.mjs](../components/world/daily-routine.test.mjs), and [camera-zoom.test.mjs](../components/world/camera-zoom.test.mjs). The unchecked interaction items still require hands-on browser/device validation.

## 4. Verify mobile and accessibility

Responsive layouts and touch controls exist. **Real iPhone and Android performance and interaction testing remain pending.** Desktop measurements do not establish phone performance.

- [ ] Test Safari on a real iPhone; record device and OS version.
- [ ] Test Chrome on a real Android phone; record device and OS version.
- [ ] Measure cold loading, entering 3D, movement, and idle rendering on Wi-Fi and a slower connection.
- [ ] Record frame timing, asset transfer sizes, and any heat or sustained slowdown using the [performance workflow](../reports/mobile-performance.md).
- [ ] Check portrait/landscape layouts, safe areas, and whether controls obscure the island.
- [ ] Check touch movement, camera gestures, and the in-world controls together: tapping a traveller to swap, the action ring, and the passport signpost. Confirm tap targets are large enough on a phone.
- [ ] Check photo viewers, project stories, and the passport with the on-screen keyboard open.
- [ ] Verify reduced motion, keyboard navigation, visible focus, dialog focus return, and WebGL fallback.
- [ ] Verify the keyboard path to the in-world actions (`Q` swap, `1`/`2`/`3` actions, `P` passport), since these are no longer HTML buttons a screen reader can reach by tabbing.
- [x] Cover passport persistence in tests: a download survives a round trip through restore, and a hostile or unknown file cannot smuggle in stamps. Every storage call is wrapped, so a blocked-storage visitor keeps their choice for the visit.
- [ ] Still to check by hand: passport persistence across a real reload on a device with storage disabled.

## 5. Grow the visitor passport — optional

Implemented: browser-local district stamps, sparks, selected traveller, nickname, private note, JSON download, restore from a downloaded file with a preview, and an explicit clear. There is still no account, server upload, public guestbook, or cross-device sync.

- [x] Add JSON import to restore a downloaded passport. `readPassport` validates and filters the file, and a preview shows what it holds against current progress before anything is replaced.
- [x] Add an explicit clear-passport action with confirmation. Two-step: "Clear my passport" then "Yes, erase it", which empties every field and removes the stored record.
- [ ] Consider achievements for viewing project exhibits or completing a guided tour.
- [ ] Consider a downloadable postcard with the visitor's discoveries.
- [ ] If cross-device sync is wanted, choose authentication, storage, and deletion behavior before implementing a backend.
- [ ] If a public guestbook is wanted, design moderation and abuse controls separately from private notes.

Sources: [passport UI](../components/stories/Passport.tsx), [stored-data schema](../components/stories/passport-data.ts).

## 6. Personal details and launch

- [ ] Review every district description and technology list against your actual experience.
- [ ] Add real contact and professional profile links you want public.
- [ ] Finalize the short introduction and your frontend / AI / robotics / photography story.
- [ ] Keep new UI copy in English for now. Add i18n only when a second language is ready to maintain.
- [x] Link the favicon. `public/favicon.svg` existed but was never referenced — only `app/icon.*` and `app/favicon.ico` are auto-detected, so `layout.tsx` now declares it.
- [ ] Add a social sharing image for the home page using final approved artwork, and set `metadataBase` once the production domain is chosen — without it the per-photo `og:image` URLs are host-relative. Title and description are already set.
- [ ] Choose the production domain and hosting target; deployment is still pending.
- [ ] Run `bun run test`, `bun run check`, `bun run build`, and relevant model validators after implementation changes.
- [ ] Complete browser interaction checks and the real-device checklist before calling the site launch-ready.

## Suggested order

1. Supply the app list and screenshots.
2. Finalize character appearance and verify exploration controls.
3. Replace demo photos and journals.
4. Test real phones and fix the issues found.
5. Finish contact details and publish.
6. Add optional vehicle, achievements, or visitor-sync features based on feedback.
