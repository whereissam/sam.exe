import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { resolve, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const source = process.argv[2];
if (!source) {
  console.error(
    'Usage: bun run content:import /absolute/path/to/stories-source.json',
  );
  process.exit(1);
}
const outputFlag = process.argv.indexOf('--output-root');
const root =
  outputFlag === -1
    ? fileURLToPath(new URL('../../', import.meta.url))
    : resolve(required(process.argv[outputFlag + 1], '--output-root'));

const sourcePath = resolve(source);
const input = JSON.parse(await readFile(sourcePath, 'utf8'));
const photos = input.photos,
  journeys = input.journeys;
if (!Array.isArray(photos) || !Array.isArray(journeys))
  throw new Error('photos and journeys must be arrays');
const ids = new Set();
function required(value, label) {
  if (typeof value !== 'string' || !value.trim())
    throw new Error(`${label} must be non-empty text`);
  return value.trim();
}
function sourceUrl(value) {
  if (value === undefined) return undefined;
  const url = new URL(required(value, 'sourceUrl'));
  if (url.protocol !== 'https:')
    throw new Error('Photo credits must use HTTPS URLs');
  return url.href;
}
function optional(value, label) {
  return value === undefined ? undefined : required(value, label);
}
const prepared = photos.map((p) => {
  const id = required(p.id, 'photo.id');
  if (!/^[a-z0-9-]+$/.test(id) || ids.has(id))
    throw new Error(`Invalid or duplicate photo ID: ${id}`);
  ids.add(id);
  const file = resolve(dirname(sourcePath), required(p.file, `${id}.file`));
  if (
    !['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff'].includes(
      extname(file).toLowerCase(),
    )
  )
    throw new Error(`Unsupported photo format: ${file}`);
  return {
    file,
    id,
    demo: p.demo === true,
    credit: optional(p.credit, `${id}.credit`),
    sourceUrl: sourceUrl(p.sourceUrl),
    title: required(p.title, `${id}.title`),
    alt: required(p.alt, `${id}.alt`),
    caption: optional(p.caption, `${id}.caption`),
    location: optional(p.location, `${id}.location`),
    country: optional(p.country, `${id}.country`),
    date: optional(p.date, `${id}.date`),
    series: optional(p.series, `${id}.series`),
  };
});
const journeyIds = new Set();
const finalJourneys = journeys.map((j) => {
  const id = required(j.id, 'journey.id');
  if (!/^[a-z0-9-]+$/.test(id) || journeyIds.has(id))
    throw new Error(`Invalid or duplicate journey ID: ${id}`);
  journeyIds.add(id);
  if (!Array.isArray(j.paragraphs))
    throw new Error(`${id}: paragraphs required`);
  if (!Array.isArray(j.photoIds) || j.photoIds.some((p) => !ids.has(p)))
    throw new Error(`${id}: unknown photo ID`);
  return {
    id,
    demo: j.demo === true,
    city: required(j.city, `${id}.city`),
    country: required(j.country, `${id}.country`),
    period: typeof j.period === 'string' ? j.period.trim() : '',
    title: required(j.title, `${id}.title`),
    paragraphs: j.paragraphs.map((p) => required(p, `${id}.paragraph`)),
    photoIds: j.photoIds,
  };
});
// Validate all source files before creating derivatives. Original files stay untouched.
for (const photo of prepared)
  await sharp(photo.file, { limitInputPixels: 100_000_000 }).metadata();
const out = join(root, 'public', 'photography');
await mkdir(out, { recursive: true });
const finalPhotos = [];
for (const { file, ...photo } of prepared) {
  const full = await sharp(file, { limitInputPixels: 100_000_000 })
    .rotate()
    .resize({
      width: 1600,
      height: 1600,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 84 })
    .toBuffer({ resolveWithObject: true });
  const thumb = await sharp(full.data)
    .resize({
      width: 480,
      height: 480,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 76 })
    .toBuffer();
  const hash = createHash('sha256')
    .update(full.data)
    .update(thumb)
    .digest('hex')
    .slice(0, 12);
  const name = `${photo.id}-${hash}`;
  await writeFile(join(out, `${name}.webp`), full.data);
  await writeFile(join(out, `${name}-thumb.webp`), thumb);
  finalPhotos.push({
    ...photo,
    src: `/photography/${name}.webp`,
    thumbnail: `/photography/${name}-thumb.webp`,
    width: full.info.width,
    height: full.info.height,
  });
  console.log(
    `${photo.id}: ${full.info.width}×${full.info.height}, full ${Math.round(full.data.length / 1024)} KiB, thumbnail ${Math.round(thumb.length / 1024)} KiB`,
  );
}
await mkdir(join(root, 'content'), { recursive: true });
const manifest = join(root, 'content', 'stories.json');
await writeFile(
  `${manifest}.pending`,
  JSON.stringify({ photos: finalPhotos, journeys: finalJourneys }, null, 2) +
    '\n',
);
await rename(`${manifest}.pending`, manifest);
console.log(
  `Imported ${finalPhotos.length} photographs and ${finalJourneys.length} travel stories. Original files unchanged; output images contain no source EXIF metadata.`,
);
