# Checklist review — 2026-09-11

## Environment and limits

Live local development site at `http://localhost:3000`, Chrome 152 on macOS. Used real browser keyboard actions, pointer drags, accessibility snapshots, and screenshots. Reviewed the normal desktop window plus viewport overrides of 1280×800 and 390×844. The browser's existing zoom/DPR affects these sizes: the performance panel reported 853×533 CSS pixels, DPR 1.5, and a 1280×800 drawing buffer for the desktop override. The narrow screenshots exercise the phone breakpoint; they are not physical iPhone or Android tests.

No production cold-cache, throttled-network, screen-reader speech, physical touch, or listening assessment is claimed. Concurrent development and hot reloads make the load/CLS sample unsuitable as a release benchmark.

## Verified and corrected

- Viewed the larger archipelago in daylight and night mode, and used pointer drags to inspect the backs and a low side view. The pointed foundations and bridges are visible; the post-optimization scene still renders the bridge details.
- Opened Robotics Lab at the phone breakpoint. Its content fits the dialog and the page reports no horizontal overflow.
- Reproduced a keyboard focus bug: Escape from a chapter left focus on `BODY`. The dismiss handler now closes the native dialog before restoring focus. Repeating Enter → Escape returned focus to the Robotics Lab button.
- Added a keyboard-focus-only group for switching traveller, Wave, Jump, Celebrate, and the passport. It is available in the accessibility tree without permanently covering the island. Verified switching, the Wave status message, and opening the passport from these buttons.
- Activated the windmill, koi and campfire with Enter. Their labels changed respectively to “Windmill · pause”, “A little fish feast” and “Campfire · lights out”. These checks establish the keyboard path, not touch or reduced-motion playback quality.
- Found overlapping geographic labels at phone width. Hid those floating labels at that breakpoint and made the bottom country selector a two-column grid with 44px minimum button height. All four destinations are visible together.
- Selected Taiwan, allowed the traveller to arrive, and observed the country garden. Next memory changed the caption from 01/02 to 02/02 and disabled Next at the end. Opened photo notes; Escape closed only the nested dialog and returned focus to “Photo notes & credits”. Back returned to the atlas.
- Verified the corrected Taiwan landmark beside the frame in the night garden. That check also exposed a clipped spire and an overhanging base; reduced the landmark scale, widened the floor and brightened the night subtitle. These last size/contrast adjustments passed type/build checks; they were not followed by another full gallery visual pass.
- Corrected the country landmark's origin: it was positioned relative to world zero, putting Taipei 101 behind the first photograph. It now starts beside the first frame regardless of the country's photo count and retains its slower parallax motion.
- Exited 3D and opened Project Arcade. The SAM.EXE image, description, stack, and project action are available as HTML. Also observed the standalone Taiwan page with photo links and demo labels.
- Reviewed the supplied character close-up: eyes, eyebrows, smiles and hair are visible. Personal likeness and the embrace still need the owner's review.
- Reviewed the traveller pause guard: it blocks input while a modal is open or the document is hidden; the main world resumes on visibility return. It was not removed to accommodate automation.
- Changed the canvas fallback text to neutral navigation guidance, since the accessibility tree can expose canvas fallback content even when WebGL is working.

## Render-cost improvement

The existing in-page performance panel reported **2,500 draw calls and 56,353 triangles** before bridge batching. Bridge decks, rails, posts, planks and supports now use one instanced mesh per bridge with per-instance colors, rather than hundreds of independent meshes.

After batching, the panel reported **1,162 draw calls and the same 56,353 triangles** — about 54% fewer calls. A fresh eight-second orbit recorded 960 frames, average 120.1 FPS and p95 frame interval 9.1 ms. This is a warm local development run on the Mac, not proof of phone performance. The panel reported zero horizontal overflow and no observed resource failures. The remaining draw-call count still warrants real-device measurement.

## Validation

- `bun run check`: passed.
- `bun test`: 63 passed, zero failed at this review.
- `bun run build`: passed; retains the existing large-chunk advisory.
- `bun run models:validate`: all six district models passed.
- Targeted lint of the changed harbor, country architecture and atlas modules passed.

## Still requires follow-up

Physical iPhone/Android runs; touch pinch/swipe and on-screen keyboards; sound volume/timbre listening; actual reduced-motion playback; every floor sign at close zoom; gestures during walking and hidden-tab transitions; avatar fallback loading; a one-photo country visual fixture; and release cold-load measurements.

The owner still needs to supply approved app details, original photographs/journals, contact links, personal copy, and the production domain. No ownership, biography, photography provenance, or deployment decision was invented. The downloadable passport postcard was suggested as a separate Claude task, not marked completed here. Passport dialog naming and close-focus behavior were included in that handoff.
