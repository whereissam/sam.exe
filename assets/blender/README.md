# Blender district kit

## Personalized travel companions

`sam-travel-couple.png` is a Blender-rendered seaside vignette inspired by the supplied couple photo: dark swept hair and charcoal shirt, tied-up hair and lilac shirt, a shoulder embrace, and a travel camera. These are stylized characters; unseen clothing and the miniature setting are artistic additions. The source photograph is not bundled or used as a texture.

- `sam-travel-couple.blend`: editable individual character parts and seaside scene.
- `sam-travel-couple.glb`: static, texture-free portrait pair with refined cheek, jaw, chin, eyelid and smile geometry.
- `sam-animated-companions.blend`: two editable, skinned humanoids with 22 bones each (hips, spine, chest, neck, shoulders, arms, hands, legs, feet and toes). The face and hair retain the original stylized proportions; fitted torso geometry blends weights across hips/spine/chest. Limb pieces use rigid weights to preserve the low-poly style.
- `sam-avatar.glb` and `companion-avatar.glb` are independently exported; `components/world/character-manifest.json` selects the hashed web copies. R3F drives the bones for walking, waving, seated activities and the six-pose stretch routine. SkeletonUtils clones isolate each character's skin and skeleton. There are no imported animation clips yet.
- Rig extras contain `humanoid_map`, a semantic role-to-bone mapping for retargeting. Historical `L`/`R` joint labels denote screen sides, so the map records anatomical sides explicitly. Local joint axes preserve the web animation API; this is a custom humanoid rig, not a drop-in Mixamo skeleton. To import external motion, map the source bones, compensate rest-pose orientation (the character uses relaxed arms), bake to this rig and export animation clips. Fingers and facial bones are not included.
- Run Blender with `--python-exit-code 1 --python scripts/blender/build_characters.py`, then `bun scripts/blender/validate_characters.mjs` to rebuild and validate. The validator re-imports the actual GLBs into Three.js and checks bones, skin weights, deformation, independent skeleton clones, raised arms, seated knees and asset budgets. Each avatar stays below 500 KB and 12,000 triangles; current measurements are in `character-report.json`.
- `scripts/blender/render_characters.py` re-imports the exported GLBs and renders neutral, raised-arm and seated poses to `character-rig-preview.png` for visual inspection.
- `sam-exe-personal-world.png` / `.blend`: full island artwork including the couple at the front promenade and the four city portals.

Rebuild with Blender background mode and `--python-exit-code 1 --python scripts/blender/render_couple.py`, then `scripts/blender/render_personal_world.py`. These scripts replace their generated outputs; save manual edits under a separate name.

Status: all six GLBs generated with Blender 5.2.1 LTS, validated, and visually inspected in a rendered re-import preview. Website TypeScript and production build pass.

![Exported model kit](kit-preview.png)

## Generate after installing Blender

```sh
bun run models:check
bun run models:build
bun run models:validate
bun run check
bun run build
```

The launcher locates `/Applications/Blender.app/Contents/MacOS/Blender` or `blender` on PATH. Set `BLENDER_BIN` to an executable path for a custom installation. No MCP server or add-on is required for this background script workflow.

`models:build` opens a fresh Blender process with factory startup, creates six original static low-poly installations, exports content-addressed GLBs, saves an editable kit, and updates `components/world/model-manifest.json` only after all exports succeed. It never opens a user's existing Blender scene. Re-running replaces `sam-exe-kit.generated.blend`; save artistic edits under a different filename before rebuilding. Previous hashed GLBs are retained so a failed generation cannot break the active catalog.

## Art direction

| District    | Main object                      | Supporting details              | Accent     |
| ----------- | -------------------------------- | ------------------------------- | ---------- |
| Robotics    | Friendly humanoid on a workbench | Visor, chest light, antenna     | Mint       |
| Frontend    | Physical desktop workspace       | Code lines, keyboard, coffee    | Apricot    |
| Blockchain  | Three server towers              | Faceted core, orbit             | Lilac      |
| AI          | Small observatory sculpture      | Two orbital rings, satellite    | Coral      |
| Photography | Oversized analog camera          | Lens, viewfinder, shutter, grip | Warm ivory |
| Travel      | Globe portal                     | Meridian, equator, suitcase     | Sea glass  |

All helpers use the site's Y-up coordinates and convert to Blender Z-up. The GLB exporter converts them back to Y-up. Each installation is centered at the origin, with its base on the ground; the website owns world placement, district labels, the player, and lighting. The first kit is static; robot rigging and animated clips are a separate art pass.

## Outputs

- `public/models/<district>-<hash>.glb`: web asset, no external textures or decoder downloads.
- `assets/blender/sam-exe-kit.generated.blend`: editable objects grouped by district; photography is initially visible, other collections hidden to avoid overlap at the origin.
- `assets/blender/report.json`: measured triangles, file bytes, and object counts.
- `components/world/model-manifest.json`: activates successfully exported assets.

## Budgets and validation

Each district must stay below 12,000 triangles and 500,000 bytes. These are ceilings, not measured results or a frame-rate guarantee. The generated report gives actual counts. The validator checks GLB headers, the six catalog entries, embedded geometry, triangle budgets, and absence of texture or decoder dependencies. The generated kit totals 299,468 bytes (292.4 KiB) and 3,868 triangles across 72 primitives. Re-imported models have been visually inspected for orientation, materials, and silhouette. Real-device loading time and frame rate remain unmeasured.

The R3F loader shows the existing procedural installation during loading and on errors. There is no global preload. Mobile still imports the 3D world only after the visitor enters it.

References: [Blender export operators](https://docs.blender.org/api/main/bpy.ops.export_scene.html), [Drei useGLTF](https://drei.docs.pmnd.rs/loaders/gltf-use-gltf).
