import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { compareIdentity, DEFAULT_MAX_DISTANCE, inspectPngFile } from '../lib/identity-score.mjs';
import { isNonEmptyString } from './shared.mjs';
import { validateManifest } from './validator.mjs';

export function auditManifest(manifest, baseDirectory = '.', cast = null, options = {}) {
  const problems = validateManifest(manifest, cast);
  const root = resolve(baseDirectory);
  const scoreIdentity = options.scoreIdentity !== false;
  const maxDistance = options.maxDistance ?? DEFAULT_MAX_DISTANCE;
  const inspections = new Map();

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
      if (!exists) continue;
      const stat = statSync(absolute);
      if (!stat.isFile()) {
        problems.push(`[${character.name}/${shot.id}] output 不是檔案：${shot.output}`);
        continue;
      }
      if (stat.size === 0) {
        problems.push(`[${character.name}/${shot.id}] output 是空檔案：${shot.output}`);
        continue;
      }
      if (shot.status !== 'PASS') continue;
      const inspected = inspectPngFile(absolute, shot.aspectRatio);
      if (!inspected.ok) {
        problems.push(`[${character.name}/${shot.id}] ${inspected.reason}：${shot.output}`);
        continue;
      }
      inspections.set(`${character.name}/${shot.id}`, inspected);
    }

    if (!scoreIdentity) continue;
    const identity = inspections.get(`${character.name}/identity-board`);
    if (!identity) continue;
    for (const shot of character?.shots ?? []) {
      if (shot.id === 'identity-board' || shot.status !== 'PASS') continue;
      const inspected = inspections.get(`${character.name}/${shot.id}`);
      if (!inspected) continue;
      const score = compareIdentity(identity, inspected, maxDistance);
      if (score.compared && !score.pass) {
        problems.push(`[${character.name}/${shot.id}] 與 identity-board 的身份分數過低（距離 ${score.distance} > ${maxDistance}）`);
      }
    }
  }
  return problems;
}
