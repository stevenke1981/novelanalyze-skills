export function exportTavernV2(character, options = {}) {
  if (!character?.name) throw new Error('export-card 需要角色 name');
  const persona = character.persona && typeof character.persona === 'object' ? character.persona : {};
  const description = [persona.identity, persona.appearance, persona.temperament, persona.motivation]
    .filter((value) => typeof value === 'string' && value.trim())
    .join('\n\n');
  const personality = Array.isArray(persona.personality) ? persona.personality.filter(Boolean).join('、') : '';

  return {
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      name: String(character.name).trim(),
      description,
      personality,
      scenario: typeof options.summary === 'string' ? options.summary : '',
      first_mes: '',
      mes_example: '',
      creator_notes: [
        'Exported from novel-characters. This RP card may use the character name.',
        'Image prompts stay in cast.json and must remain name-free.',
        Array.isArray(character.aliases) && character.aliases.length
          ? `Aliases: ${character.aliases.join(', ')}`
          : 'Aliases: none',
      ].join(' '),
      system_prompt: '',
      post_history_instructions: '',
      alternate_greetings: [],
      character_book: { extensions: {}, entries: [] },
      tags: ['novel-characters', character.importance].filter(Boolean),
      creator: typeof options.author === 'string' ? options.author : '',
      character_version: '1.0',
      extensions: {
        'novel-characters': {
          importance: character.importance ?? '',
          aliases: Array.isArray(character.aliases) ? character.aliases : [],
          evidence: Array.isArray(persona.evidence) ? persona.evidence : [],
          source: typeof options.source === 'string' ? options.source : '',
        },
      },
    },
  };
}

export function exportCastToTavernV2(cast, options = {}) {
  const characters = Array.isArray(cast) ? cast : cast?.characters;
  if (!Array.isArray(characters) || !characters.length) throw new Error('cast 沒有角色可匯出');
  return characters.map((character) => exportTavernV2(character, {
    source: options.source ?? (Array.isArray(cast) ? '' : cast.source),
    author: options.author ?? (Array.isArray(cast) ? '' : cast.author),
    summary: options.summary ?? (Array.isArray(cast) ? '' : cast.summary),
  }));
}
