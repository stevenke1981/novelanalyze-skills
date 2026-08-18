import { IDENTITY_STRING_FIELDS, getVisualMode } from './shared.mjs';

const markdownCode = (value) => `\n\`\`\`text\n${String(value ?? '').replace(/\`\`\`/g, '\`\`\\\`')}\n\`\`\`\n`;
const mdCell = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');

export function renderMarkdown(manifest) {
  const mode = getVisualMode(manifest.mode) ?? getVisualMode('live-action');
  const labels = mode.styleLabels;
  const lines = [
    `# ${manifest.source} · ${mode.heading}`, '',
    `- 規格版本：${manifest.version}`, `- 範圍：${manifest.scope}`, `- 模式：${manifest.mode}`, '',
    '## 全案視覺聖經', '', manifest.styleBible.visualWorld, '',
    '| 項目 | 設定 |', '| --- | --- |',
    `| ${labels.realityLevel} | ${mdCell(manifest.styleBible.realityLevel)} |`,
    `| ${labels.cameraSystem} | ${mdCell(manifest.styleBible.capture.cameraSystem)} |`,
    `| ${labels.lensLanguage} | ${mdCell(manifest.styleBible.capture.lensLanguage)} |`,
    `| ${labels.texture} | ${mdCell(manifest.styleBible.capture.texture)} |`,
    `| ${labels.lighting} | ${mdCell(manifest.styleBible.capture.lighting)} |`,
    `| ${labels.colorScience} | ${mdCell(manifest.styleBible.capture.colorScience)} |`, '',
    '### 全域反向提示詞', markdownCode(manifest.styleBible.globalNegativePrompt),
  ];

  for (const character of manifest.characters) {
    lines.push('', `## ${character.name}`, '',
      `**重要度：** ${character.importance}　 **安全檔名：** \`${character.slug}\``, '',
      '### 身份鎖定', '', '| 特徵 | 設定 |', '| --- | --- |');
    for (const field of IDENTITY_STRING_FIELDS) lines.push(`| ${field} | ${mdCell(character.identityLock[field])} |`);
    lines.push('', `**必須保持：** ${character.identityLock.mustRemain.join('、')}`, '',
      `**禁止出現：** ${character.identityLock.mustNotAppear.join('、')}`, '',
      `### ${mode.basePromptHeading}`, markdownCode(character.basePrompt),
      '### 角色反向提示詞', markdownCode(character.characterNegativePrompt));
    if (Array.isArray(character.states) && character.states.length) {
      lines.push('### 具名狀態', '');
      for (const state of character.states) {
        lines.push(`- **${state.label}**（\`${state.id}\`／${state.kind}${state.parent ? `／繼承 ${state.parent}` : ''}）：${state.changes}`);
      }
      lines.push('');
    }
    lines.push('### 圖片組', '');

    for (const shot of character.shots) {
      lines.push(`#### ${shot.title} · \`${shot.id}\``, '',
        `- 比例：${shot.aspectRatio}`, `- 輸出：\`${shot.output}\``, `- 狀態：${shot.status}${shot.state ? `　- 版本：\`${shot.state}\`` : ''}`,
        `- 鏡頭：${shot.camera}`, `- 光線：${shot.lighting}`, `- 背景：${shot.background}`, '',
        '**英文提示詞**', markdownCode(shot.prompt), '**中文提示詞**', markdownCode(shot.promptZh),
        '**反向提示詞**', markdownCode(shot.negativePrompt), '**驗收**', '',
        ...shot.acceptance.map((item) => `- ${item}`), '');
    }
  }
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n')}\n`;
}
