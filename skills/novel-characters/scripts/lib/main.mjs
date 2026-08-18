import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * True when this module is the process entrypoint.
 * Both sides use realpath so symlink installs still match.
 */
export function isMainModule(metaUrl) {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(metaUrl));
  } catch {
    return false;
  }
}
