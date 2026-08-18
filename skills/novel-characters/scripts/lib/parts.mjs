const CHAPTER_HEADING = /^(?:#{1,3}\s+\S.*|第[一二三四五六七八九十百千萬0-9]+[章節回卷部].*|Chapter\s+\d+\b.*)$/i;

export function effectiveChunkCapacity(chunkSize, chunkOverlap, maxChunks) {
  return maxChunks * (chunkSize - chunkOverlap) + chunkOverlap;
}

export function suggestedPartCount(text, chunkWithMeta, capacity) {
  const clean = String(text ?? '').replace(/\r\n/g, '\n').trim();
  if (!clean) return 1;
  if (!chunkWithMeta(clean).truncated) return 1;
  return Math.max(2, Math.ceil(clean.length / capacity));
}

export function detectChapters(text) {
  const clean = String(text ?? '').replace(/\r\n/g, '\n');
  if (!clean.trim()) return null;
  const lines = clean.split('\n');
  const headings = [];
  let offset = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && trimmed.length <= 80 && CHAPTER_HEADING.test(trimmed)) {
      headings.push({ title: trimmed.replace(/^#+\s+/, ''), start: offset });
    }
    offset += line.length + 1;
  }
  if (headings.length < 2) return null;
  const chapters = headings.map((heading, index) => {
    const end = index + 1 < headings.length ? headings[index + 1].start : clean.length;
    return {
      id: `chapter-${String(index).padStart(2, '0')}`,
      title: heading.title,
      text: clean.slice(heading.start, end).trim(),
      start: heading.start,
      end,
    };
  }).filter((chapter) => chapter.text.length > 0);
  return chapters.length >= 2 ? chapters : null;
}

export function partitionText(text, parts) {
  const count = Number(parts);
  const clean = String(text ?? '').replace(/\r\n/g, '\n').trim();
  if (!clean) return [];
  if (!Number.isInteger(count) || count < 2) return [clean];

  const target = Math.ceil(clean.length / count);
  const result = [];
  let cursor = 0;
  for (let index = 0; index < count && cursor < clean.length; index += 1) {
    if (index === count - 1) {
      result.push(clean.slice(cursor).trim());
      break;
    }
    let end = Math.min(cursor + target, clean.length);
    if (end < clean.length) {
      const window = clean.slice(end, Math.min(end + Math.floor(target * 0.25), clean.length));
      const para = window.indexOf('\n\n');
      const sentence = Math.max(window.indexOf('。'), window.indexOf('！'), window.indexOf('？'), window.indexOf('. '));
      const offset = para >= 0 ? para : sentence;
      if (offset >= 0) end += offset + 1;
    }
    const slice = clean.slice(cursor, end).trim();
    if (slice) result.push(slice);
    cursor = end;
  }
  return result;
}

function toPart(segment, index, prefix, meta) {
  return {
    id: segment.id ?? `${prefix}-${String(index).padStart(2, '0')}`,
    title: segment.title ?? `第 ${index + 1} 段`,
    text: segment.text,
    chars: segment.text.length,
    chunks: meta.chunks,
    truncated: meta.truncated,
  };
}

export function planHierarchicalChunks(text, options = {}) {
  const chunkWithMeta = options.chunkWithMeta;
  if (typeof chunkWithMeta !== 'function') throw new Error('planHierarchicalChunks 需要 chunkWithMeta');

  const clean = String(text ?? '').replace(/\r\n/g, '\n').trim();
  if (!clean) return { mode: 'flat', parts: [], truncated: false, fallback: null };

  const wantChapters = Boolean(options.chapters);
  const explicitParts = options.parts == null ? null : Number(options.parts);
  if (explicitParts != null && (!Number.isInteger(explicitParts) || explicitParts < 1)) {
    throw new Error('--parts 必須是正整數');
  }

  if (!wantChapters && (explicitParts == null || explicitParts === 1)) {
    const flat = chunkWithMeta(clean);
    return {
      mode: 'flat',
      parts: [toPart({ id: 'part-00', title: '', text: clean }, 0, 'part', flat)],
      truncated: flat.truncated,
      fallback: null,
    };
  }

  let fallback = null;
  let segments = null;
  if (wantChapters) {
    segments = detectChapters(clean);
    if (!segments) {
      const count = explicitParts && explicitParts > 1
        ? explicitParts
        : suggestedPartCount(clean, chunkWithMeta, options.capacity ?? clean.length);
      fallback = count > 1 ? 'parts' : 'flat';
      segments = count > 1
        ? partitionText(clean, count).map((partText, index) => ({
          id: `part-${String(index).padStart(2, '0')}`,
          title: `第 ${index + 1} 段`,
          text: partText,
        }))
        : [{ id: 'part-00', title: '', text: clean }];
    }
  } else {
    segments = partitionText(clean, explicitParts).map((partText, index) => ({
      id: `part-${String(index).padStart(2, '0')}`,
      title: `第 ${index + 1} 段`,
      text: partText,
    }));
  }

  const parts = segments.map((segment, index) => (
    toPart(segment, index, wantChapters && !fallback ? 'chapter' : 'part', chunkWithMeta(segment.text))
  ));
  return {
    mode: wantChapters && !fallback ? 'chapters' : (parts.length > 1 ? 'parts' : 'flat'),
    parts,
    truncated: parts.some((part) => part.truncated),
    fallback,
  };
}
