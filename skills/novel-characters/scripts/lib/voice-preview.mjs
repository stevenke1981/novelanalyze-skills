export function buildVoicePreview(cast) {
  const characters = Array.isArray(cast) ? cast : cast?.characters ?? [];
  return {
    version: '1.0',
    source: Array.isArray(cast) ? '' : (cast?.source ?? ''),
    note: 'Audio files are optional. Do not mark validate as passed because a preview was requested.',
    characters: characters
      .filter((character) => character?.importance === 'protagonist' || character?.importance === 'major')
      .map((character) => ({
        name: character.name,
        importance: character.importance,
        durationHintSeconds: 5,
        prompt: character?.voice?.prompt ?? '',
        promptZh: character?.voice?.promptZh ?? '',
        status: 'NOT_RUN',
        output: null,
      })),
  };
}
