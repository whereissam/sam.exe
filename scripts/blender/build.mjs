import { accessSync, constants } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { delimiter, join } from 'node:path';

const candidates = [
  process.env.BLENDER_BIN,
  '/Applications/Blender.app/Contents/MacOS/Blender',
  ...(process.env.PATH ?? '')
    .split(delimiter)
    .map((dir) => join(dir, 'blender')),
].filter(Boolean);
const binary = candidates.find((path) => {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
});
if (!binary) {
  console.error(
    'Blender is not available yet. Install Blender 4+ or set BLENDER_BIN to its executable. No models were changed.',
  );
  process.exit(1);
}
if (process.argv.includes('--check')) {
  console.log(`Blender executable: ${binary}`);
  process.exit(0);
}
const script = fileURLToPath(new URL('./build_world.py', import.meta.url));
const result = spawnSync(
  binary,
  [
    '--background',
    '--factory-startup',
    '--python-exit-code',
    '1',
    '--python',
    script,
  ],
  { stdio: 'inherit' },
);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
