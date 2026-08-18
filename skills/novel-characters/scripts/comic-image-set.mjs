#!/usr/bin/env node
// Thin alias for the shared visual-pack CLI. Accepts mode=comic manifests.
// Node.js 18+; no third-party dependencies.

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCli } from './live-action-image-set.mjs';

export {
  LIVE_ACTION_VERSION,
  REQUIRED_SHOTS,
  VISUAL_MODES,
  VISUAL_PACK_VERSION,
  auditManifest,
  getVisualMode,
  renderMarkdown,
  runCli,
  slug,
  validateManifest,
} from './live-action-image-set.mjs';

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    runCli(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
