import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig, type PluginOption } from 'vite';
import hostingConfig from './.openai/hosting.json';

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  '00000000-0000-4000-8000-000000000000';

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

// Cloudflare Workers is the native target and stays the default. Nitro takes
// over for the platforms it adapts (Vercel and friends); the two build plugins
// own the same server output, so exactly one of them is ever active.
// `VERCEL` is set inside Vercel's build container, `NITRO_PRESET` is how local
// builds pick a platform, and `VINEXT_TARGET` overrides both by hand.
const deployTarget =
  process.env.VINEXT_TARGET ??
  (process.env.VERCEL ?? process.env.NITRO_PRESET ? 'nitro' : 'cloudflare');

const localBindingConfig = {
  main: 'vinext/server/fetch-handler',
  compatibility_flags: ['nodejs_compat'],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: 'site-creator-d1',
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: 'site-creator-r2',
        },
      ]
    : [],
};

async function deployPlugin(): Promise<PluginOption> {
  if (deployTarget === 'nitro') {
    const { nitro } = await import('nitro/vite');
    return nitro();
  }

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import('@cloudflare/vite-plugin');

  return cloudflare({
    viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
    config: localBindingConfig,
  });
}

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  return {
    css: { postcss: { plugins: [tailwindcss()] } },
    // Nitro leaves bare specifiers external in the RSC environment, so Vite's
    // postcss-import cannot resolve `@import 'tailwindcss'` and falls back to a
    // root-relative path that does not exist. The Cloudflare plugin resolves it
    // fine, so only the Nitro build needs the hint.
    resolve:
      deployTarget === 'nitro' ? { noExternal: ['tailwindcss'] } : undefined,
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [vinext(), sites(), await deployPlugin()],
  };
});
