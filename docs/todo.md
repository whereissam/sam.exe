# SAM.EXE — next steps

Updated: 2026-09-07. Unchecked items are pending; optional ideas are not launch requirements.

## 1. Add your web apps

The Project Arcade currently contains **SAM.EXE only**. Visitors can open it from the world or the Projects button without entering 3D.

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

## 3. Refine the characters and exploration

Implemented: separate travellers, switching control, following, walking motions, Wave, Jump, and Celebrate. These use rigid-part joints animated in React Three Fiber, not embedded skeletal animation clips.

- [ ] Review the latest [facial close-up](../assets/blender/sam-travel-couple-closeup.png): eyes, shallow smiles, hair, likeness, and the revised embrace.
- [x] Replace direct tap movement with obstacle-aware routes and remove the seven-second movement timeout.
- [x] Replace accumulated follower trails with route replanning after movement or character switching.
- [x] Simulate a tour around the island, repeated switches, keyboard cancellation, reset, invalid destinations, and idle settling; check both travellers for collisions and teleporting at each simulation step.
- [ ] Verify walking and following around every installation, at island edges, and after repeatedly switching characters.
- [ ] Check each gesture while standing, walking, opening panels, and returning from a hidden tab.
- [ ] Check reset, tap-to-walk cancellation, and loading/error fallbacks for both avatars.
- [ ] If more natural movement is needed, add elbow/knee articulation or a skinned rig with animation clips.
- [ ] Optional: add a visitor-triggered greeting, photo pose, or high-five.
- [ ] Optional: decide whether to add a drivable vehicle. A car and vehicle physics are **not implemented**; the current experience uses walking characters.

Sources: [Blender guide](../assets/blender/README.md), [character generator](../scripts/blender/couple.py), [runtime controls](../components/world/Companions.tsx).

The completed navigation checks above are automated simulations in [exploration.test.mjs](../components/world/exploration.test.mjs). The unchecked interaction items still require hands-on browser/device validation.

## 4. Verify mobile and accessibility

Responsive layouts and touch controls exist. **Real iPhone and Android performance and interaction testing remain pending.** Desktop measurements do not establish phone performance.

- [ ] Test Safari on a real iPhone; record device and OS version.
- [ ] Test Chrome on a real Android phone; record device and OS version.
- [ ] Measure cold loading, entering 3D, movement, and idle rendering on Wi-Fi and a slower connection.
- [ ] Record frame timing, asset transfer sizes, and any heat or sustained slowdown using the [performance workflow](../reports/mobile-performance.md).
- [ ] Check portrait/landscape layouts, safe areas, and whether controls obscure the island.
- [ ] Check touch movement, camera gestures, character switching, and action buttons together.
- [ ] Check photo viewers, project stories, and the passport with the on-screen keyboard open.
- [ ] Verify reduced motion, keyboard navigation, visible focus, dialog focus return, and WebGL fallback.
- [ ] Test passport persistence after reload and graceful behavior when browser storage is unavailable.

## 5. Grow the visitor passport — optional

Implemented: browser-local district stamps, sparks, selected traveller, nickname, private note, and JSON download. There is no account, server upload, public guestbook, cross-device sync, or restore/import flow.

- [ ] Add JSON import if visitors should restore a downloaded passport; validate schema and show a preview before replacing progress.
- [ ] Add an explicit clear-passport action with confirmation.
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
- [ ] Add page title, description, favicon, and a social sharing image using final approved artwork.
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
