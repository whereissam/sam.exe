# Real photography and travel stories

`stories.json` includes Berlin, Taipei, New York, and Tokyo, with eight reference photographs and clearly marked sample journals as requested. These are temporary demonstration content, not original photographs or verified personal travel stories. See `assets/demo-photography/source.json` for editable copy and image credits.

Prepare a JSON file next to your originals, then run:

```sh
bun run content:import /path/to/stories-source.json
bun run check
bun run build
```

The importer preserves originals, corrects EXIF orientation, removes source metadata, exports maximum 1600px WebP images and 480px thumbnails, and validates journey-to-photo references. It publishes only after every input is processed. Previously generated images remain on disk; the catalog selects the active set. The entire catalog is replaced on import, so include every photo and journey you want to keep.

Source schema (the strings below are instructions, not published personal content):

```json
{
  "photos": [
    {
      "id": "your-photo-id",
      "file": "./your-original.jpg",
      "title": "Your photograph title",
      "alt": "Describe what is visible in this photograph",
      "location": "Optional location",
      "country": "Optional country for the 3D memory atlas",
      "date": "Optional date",
      "series": "Optional series name",
      "caption": "Optional story behind the photograph"
    }
  ],
  "journeys": [
    {
      "id": "your-journey-id",
      "city": "Actual city",
      "country": "Actual country",
      "period": "Your travel period",
      "title": "Your story title",
      "paragraphs": ["Your own travel story."],
      "photoIds": ["your-photo-id"]
    }
  ]
}
```

The Darkroom opens a walkable 3D world map with recognizable continents. Photographs are grouped by their optional `country` field, falling back to the country of their associated journey. Unassigned photographs stay accessible in “Uncharted memories.” Walk or tap a destination to enter its photo garden, then scroll/swipe to move the traveller beneath the framed images with binoculars. Photos retain their original proportions. Notes and credits open in a small dialog over the garden.

The travel-journal photo viewer uses a native dialog with focus containment, Escape to close, and arrow-key navigation. It loads thumbnails in the grid and requests the larger photograph only when opened. Travel entries expand into narratives with their associated photographs. All content remains usable without entering 3D.

## Project Arcade

`content/projects.ts` is the web app exhibit catalog. SAM.EXE is the first confirmed entry. Add real app names, categories, a local cover image and accurate descriptions there; optional `liveUrl` and `sourceUrl` expose external links. Covers should be optimized WebP images in `public/projects`. Caption concept art as artwork and actual screenshots as screenshots. Do not invent impact metrics or project ownership.

Visitors reach the gallery through **Projects**, the Project Arcade world installation, or its district card. Each app has its own preview, stack, expandable build story and available links. Category filters appear when more than one category is present. The gallery also works without entering 3D.
