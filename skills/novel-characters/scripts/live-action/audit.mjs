import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { isNonEmptyString } from './shared.mjs';
import { validateManifest } from './validator.mjs';

export function auditManifest(manifest, baseDirectory = '.', cast = null) {
  const problems = validateManifest(manifest, cast);
  const root = resolve(baseDirectory);
  for (const character of manifest?.characters ?? []) {
    for (const shot of character?.shots ?? []) {
      if (!isNonEmptyString(shot?.output)) continue;
      const absolute = resolve(root, shot.output);
      const insideRoot = absolute === root || absolute.startsWith(`${root}/`) || absolute.startsWith(`${root}\\`);
      if (!insideRoot) {
        problems.push(`[${character.name}/${shot.id}] output 路徑逃出基準目錄`);
        continue;
      }
      const exists = existsSync(absolute);
      if (shot.status === 'PASS' && !exists) problems.push(`[${character.name}/${shot.id}] status=PASS 但檔案不存在：${shot.output}`);
      if (exists) {
        const stat = statSync(absolute);
        if (!stat.isFile()) problems.push(`[${character.name}/${shot.id}] output 不是檔案：${shot.output}`);
        if (stat.isFile() && stat.size === 0) problems.push(`[${character.name}/${shot.id}] output 是空檔案：${shot.output}`);
      }
    }
  }
  return problems;
}
