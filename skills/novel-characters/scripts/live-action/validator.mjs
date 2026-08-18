import {
  ASPECT_RATIOS, CAPTURE_STRING_FIELDS, IDENTITY_STRING_FIELDS, IMPORTANCE,
  LIVE_ACTION_VERSION, PERFORMANCE_STRING_FIELDS, REQUIRED_SHOTS, SCOPE,
  SHOT_STRING_FIELDS, STATUS, STYLE_STRING_FIELDS, asStringArray, checkEnglish,
  checkPromptNames, checkZhTw, collectForbiddenNames, getVisualMode, isNonEmptyString, isPlainObject, keyOf, mapCast,
  requireStringArray, requireStrings, slug,
} from './shared.mjs';

export function validateManifest(manifest, cast = null) {
  const problems = [];
  if (!isPlainObject(manifest)) return ['圖片組設定必須是 JSON 物件'];

  if (manifest.version !== LIVE_ACTION_VERSION) problems.push(`version 必須是 ${LIVE_ACTION_VERSION}`);
  const visualMode = getVisualMode(manifest.mode);
  if (!visualMode) problems.push('mode 必須是 live-action 或 comic');
  if (!isNonEmptyString(manifest.source)) problems.push('source 缺失或為空');
  if (!SCOPE.has(manifest.scope)) problems.push('scope 必須是 main/all/custom');

  const styleBible = manifest.styleBible;
  requireStrings(styleBible, STYLE_STRING_FIELDS, 'styleBible', problems);
  if (isPlainObject(styleBible)) {
    checkZhTw(styleBible.visualWorld, 'styleBible.visualWorld', problems);
    checkEnglish(styleBible.realityLevel, 'styleBible.realityLevel', problems);
    checkEnglish(styleBible.globalNegativePrompt, 'styleBible.globalNegativePrompt', problems);
    requireStrings(styleBible.capture, CAPTURE_STRING_FIELDS, 'styleBible.capture', problems);
    if (isPlainObject(styleBible.capture)) {
      for (const field of CAPTURE_STRING_FIELDS) checkEnglish(styleBible.capture[field], `styleBible.capture.${field}`, problems);
    }
    const policy = styleBible.continuityPolicy;
    if (!isPlainObject(policy)) {
      problems.push('styleBible.continuityPolicy 必須是物件');
    } else {
      if (typeof policy.approvedReferenceFirst !== 'boolean') problems.push('styleBible.continuityPolicy.approvedReferenceFirst 必須是布林值');
      if (typeof policy.reuseSeedWhenSupported !== 'boolean') problems.push('styleBible.continuityPolicy.reuseSeedWhenSupported 必須是布林值');
      if (!['low', 'medium', 'high'].includes(policy.identityReferenceWeight)) problems.push('styleBible.continuityPolicy.identityReferenceWeight 必須是 low/medium/high');
      if (!['low', 'medium', 'high'].includes(policy.wardrobeReferenceWeight)) problems.push('styleBible.continuityPolicy.wardrobeReferenceWeight 必須是 low/medium/high');
      requireStringArray(policy.locked, 'styleBible.continuityPolicy.locked', problems, 6);
      requireStringArray(policy.variable, 'styleBible.continuityPolicy.variable', problems, 3);
    }
  }

  if (!Array.isArray(manifest.characters) || manifest.characters.length === 0) {
    problems.push('characters 必須是非空陣列');
    return problems;
  }

  const castByName = cast ? mapCast(cast) : null;
  if (cast && isNonEmptyString(cast.source) && manifest.source !== cast.source) problems.push('source 與 cast.json.source 不一致');
  const seenCharacters = new Set();
  const seenOutputs = new Set();

  for (const [characterIndex, character] of manifest.characters.entries()) {
    validateCharacter(
      character,
      characterIndex,
      visualMode,
      castByName,
      seenCharacters,
      seenOutputs,
      problems,
      { source: manifest.source, author: manifest.author ?? cast?.author },
    );
  }

  if (cast && Array.isArray(cast.characters)) {
    const included = new Set(manifest.characters.map((character) => keyOf(character?.name)));
    const expected = cast.characters.filter((character) => {
      if (manifest.scope === 'all') return true;
      if (manifest.scope === 'main') return character?.importance === 'protagonist' || character?.importance === 'major';
      return false;
    });
    for (const character of expected) {
      if (isNonEmptyString(character?.name) && !included.has(keyOf(character.name))) {
        problems.push(`scope=${manifest.scope} 但缺少 cast.json 角色：${character.name}`);
      }
    }
  }

  return problems;
}

function validateCharacter(
  character,
  characterIndex,
  visualMode,
  castByName,
  seenCharacters,
  seenOutputs,
  problems,
  workIdentity = {},
) {
  const prefix = `characters[${characterIndex}]`;
  const name = character?.name ?? '(無名)';
  const label = `${prefix}(${name})`;

  if (!isNonEmptyString(character?.name)) problems.push(`${prefix}.name 缺失或為空`);
  const nameKey = keyOf(character?.name);
  if (nameKey && seenCharacters.has(nameKey)) problems.push(`${label} 角色重複`);
  if (nameKey) seenCharacters.add(nameKey);

  if (!Array.isArray(character?.aliases)) {
    problems.push(`${label}.aliases 必須是陣列`);
  } else {
    character.aliases.forEach((alias, index) => {
      if (!isNonEmptyString(alias)) problems.push(`${label}.aliases[${index}] 必須是非空字串`);
    });
  }
  if (!IMPORTANCE.has(character?.importance)) problems.push(`${label}.importance 不合法`);
  if (character?.slug !== slug(character?.name)) problems.push(`${label}.slug 必須等於安全檔名 ${slug(character?.name)}`);

  if (castByName) {
    const castCharacter = castByName.get(nameKey);
    if (!castCharacter) problems.push(`${label} 在 cast.json 中找不到`);
    else if (castCharacter.importance !== character.importance) problems.push(`${label}.importance 與 cast.json 不一致`);
  }

  const identity = character?.identityLock;
  requireStrings(identity, IDENTITY_STRING_FIELDS, `${label}.identityLock`, problems);
  if (isPlainObject(identity)) {
    for (const field of IDENTITY_STRING_FIELDS) checkZhTw(identity[field], `${label}.identityLock.${field}`, problems);
    requireStringArray(identity.distinctiveMarks, `${label}.identityLock.distinctiveMarks`, problems, 1);
    requireStringArray(identity.mustRemain, `${label}.identityLock.mustRemain`, problems, 6);
    requireStringArray(identity.mustNotAppear, `${label}.identityLock.mustNotAppear`, problems, 3);
  }

  const performance = character?.performance;
  requireStrings(performance, PERFORMANCE_STRING_FIELDS, `${label}.performance`, problems);
  if (isPlainObject(performance)) {
    for (const field of PERFORMANCE_STRING_FIELDS) checkZhTw(performance[field], `${label}.performance.${field}`, problems);
  }

  const wardrobe = character?.wardrobe;
  if (!isPlainObject(wardrobe)) {
    problems.push(`${label}.wardrobe 必須是物件`);
  } else {
    if (!isNonEmptyString(wardrobe.primary)) problems.push(`${label}.wardrobe.primary 缺失或為空`);
    if (!isNonEmptyString(wardrobe.continuityNotes)) problems.push(`${label}.wardrobe.continuityNotes 缺失或為空`);
    if (isNonEmptyString(wardrobe.primary)) checkZhTw(wardrobe.primary, `${label}.wardrobe.primary`, problems);
    if (isNonEmptyString(wardrobe.continuityNotes)) checkZhTw(wardrobe.continuityNotes, `${label}.wardrobe.continuityNotes`, problems);
    requireStringArray(wardrobe.palette, `${label}.wardrobe.palette`, problems, 2);
    requireStringArray(wardrobe.materials, `${label}.wardrobe.materials`, problems, 1);
  }

  const names = collectForbiddenNames({
    name: character?.name,
    aliases: character?.aliases,
    source: workIdentity.source,
    author: workIdentity.author,
  });
  checkEnglish(character?.basePrompt, `${label}.basePrompt`, problems);
  checkZhTw(character?.basePromptZh, `${label}.basePromptZh`, problems);
  checkEnglish(character?.characterNegativePrompt, `${label}.characterNegativePrompt`, problems);
  for (const [field, value] of [
    ['basePrompt', character?.basePrompt],
    ['basePromptZh', character?.basePromptZh],
    ['characterNegativePrompt', character?.characterNegativePrompt],
  ]) checkPromptNames(value, `${label}.${field}`, names, problems);

  if (!Array.isArray(character?.shots)) {
    problems.push(`${label}.shots 必須是陣列`);
    return;
  }

  const shotIds = new Set();
  for (const [shotIndex, shot] of character.shots.entries()) {
    validateShot(shot, shotIndex, character, visualMode, label, names, shotIds, seenOutputs, problems);
  }

  for (const required of REQUIRED_SHOTS) {
    if (!shotIds.has(required.id)) {
      problems.push(`${label}.shots 缺少必要圖片：${required.id}`);
      continue;
    }
    const shot = character.shots.find((entry) => entry?.id === required.id);
    if (shot?.aspectRatio !== required.aspectRatio) problems.push(`${label}.shots.${required.id}.aspectRatio 必須是 ${required.aspectRatio}`);
    if (shot?.required !== true) problems.push(`${label}.shots.${required.id}.required 必須是 true`);
  }
}

function validateShot(shot, shotIndex, character, visualMode, label, names, shotIds, seenOutputs, problems) {
  const shotLabel = `${label}.shots[${shotIndex}]`;
  requireStrings(shot, SHOT_STRING_FIELDS, shotLabel, problems);
  if (!isPlainObject(shot)) return;

  if (shotIds.has(shot.id)) problems.push(`${shotLabel}.id 重複：${shot.id}`);
  shotIds.add(shot.id);
  if (typeof shot.required !== 'boolean') problems.push(`${shotLabel}.required 必須是布林值`);
  if (!ASPECT_RATIOS.has(shot.aspectRatio)) problems.push(`${shotLabel}.aspectRatio 不受支援`);
  if (!STATUS.has(shot.status)) problems.push(`${shotLabel}.status 必須是 NOT_RUN/PASS/FAIL`);
  checkZhTw(shot.title, `${shotLabel}.title`, problems);
  for (const field of ['resolutionHint', 'framing', 'camera', 'lighting', 'background', 'prompt', 'negativePrompt']) {
    checkEnglish(shot[field], `${shotLabel}.${field}`, problems);
  }
  checkZhTw(shot.promptZh, `${shotLabel}.promptZh`, problems);
  for (const [field, value] of [['prompt', shot.prompt], ['promptZh', shot.promptZh], ['negativePrompt', shot.negativePrompt]]) {
    checkPromptNames(value, `${shotLabel}.${field}`, names, problems);
  }
  requireStringArray(shot.acceptance, `${shotLabel}.acceptance`, problems, 3);
  for (const [index, item] of asStringArray(shot.acceptance).entries()) checkZhTw(item, `${shotLabel}.acceptance[${index}]`, problems);

  const outputDir = visualMode?.outputDir ?? 'live-action';
  const expectedPrefix = `images/${outputDir}/${character.slug}/`;
  if (!isNonEmptyString(shot.output) || !shot.output.startsWith(expectedPrefix) || !shot.output.endsWith('.png')) {
    problems.push(`${shotLabel}.output 必須位於 ${expectedPrefix} 並使用 .png`);
  }
  if (isNonEmptyString(shot.output) && (shot.output.includes('\\') || shot.output.split('/').includes('..'))) {
    problems.push(`${shotLabel}.output 不得包含反斜線或 .. 路徑片段`);
  }
  if (seenOutputs.has(shot.output)) problems.push(`${shotLabel}.output 與其他圖片重複：${shot.output}`);
  seenOutputs.add(shot.output);
}
