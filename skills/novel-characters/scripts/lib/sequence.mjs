const nonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

export function composeShotPrompt(manifest, character, shot) {
  const style = manifest?.styleBible ?? {};
  const capture = style.capture ?? {};
  const positiveParts = [
    style.realityLevel,
    capture.cameraSystem,
    character?.basePrompt,
    shot?.prompt,
    'Use the approved identity-board as the highest-priority reference. Keep the same person, hair, body, and costume continuity.',
  ].filter(nonEmptyString);
  const negativePrompt = [
    style.globalNegativePrompt,
    character?.characterNegativePrompt,
    shot?.negativePrompt,
  ].filter(nonEmptyString).join(', ');

  return {
    id: shot?.id,
    aspectRatio: shot?.aspectRatio,
    prompt: positiveParts.join('\n'),
    negativePrompt,
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
