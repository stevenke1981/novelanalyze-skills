export function composeShotPrompt(manifest, character, shot) {
  const style = manifest?.styleBible ?? {};
  const capture = style.capture ?? {};
  const parts = [
    style.realityLevel,
    capture.cameraSystem,
    character?.basePrompt,
    shot?.prompt,
    'Use the approved identity-board as the highest-priority reference. Keep the same person, hair, body, and costume continuity.',
    [style.globalNegativePrompt, character?.characterNegativePrompt, shot?.negativePrompt].filter(Boolean).join(', '),
  ].filter((value) => typeof value === 'string' && value.trim());
  return {
    id: shot?.id,
    aspectRatio: shot?.aspectRatio,
    prompt: parts.slice(0, -1).join('\n'),
    negativePrompt: parts.at(-1) ?? '',
  };
}

export function composeSequence(manifest, characterName = null) {
  const characters = manifest?.characters ?? [];
  const selected = characterName
    ? characters.filter((character) => character?.name === characterName)
    : characters;
  return selected.map((character) => ({
    name: character.name,
    shots: (character.shots ?? []).map((shot) => composeShotPrompt(manifest, character, shot)),
  }));
}
