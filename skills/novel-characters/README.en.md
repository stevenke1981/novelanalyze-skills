[繁體中文（台灣）](README.md) · **English**

# novel-characters

Turn a novel or short story into a production-ready character bible:

- merged cast and aliases;
- evidence-backed profiles;
- bilingual cartoon-image and voice-design prompts;
- JSON, Markdown, and a self-contained offline HTML report;
- optional cartoon turnaround sheets;
- default parallel comic and live-action sidecars with hard identity locks, a shared visual bible, seven required image shots, wardrobe continuity, acceptance criteria, and file auditing.

After following the [repository installation guide](../../README.en.md), invoke:

```text
$novel-characters Analyze ./my-novel.txt and write the character bible plus comic and live-action image-set configuration to ./character-bible
```

The visual-pack workflow keeps the existing cartoon fields intact. It writes separate `<title>-comic.json` and `<title>-live-action.json` files, validates that prompts contain no character names, aliases, work titles, or author names, generates each version's identity board first, and only then uses the approved board as the primary reference for the remaining shots.

Required shots for both versions:

1. identity board (`16:10`);
2. neutral portrait (`4:5`);
3. face-angle set (`16:10`);
4. full-body turnaround (`16:10`);
5. expression grid (`16:10`);
6. wardrobe and material board (`16:10`);
7. narrative keyframe (`16:9`). Comic writes this as a storyboard panel; live-action writes it as a cinematic still.

Dependency-free deterministic helpers require Node.js 18 or newer:

```bash
node scripts/novel-characters.mjs chunk book.txt workdir
node scripts/novel-characters.mjs merge workdir
node scripts/novel-characters.mjs select roster-merged.json --top 10
node scripts/novel-characters.mjs validate cast.json book.txt
node scripts/novel-characters.mjs render cast.json --html
node scripts/comic-image-set.mjs validate book-comic.json cast.json
node scripts/comic-image-set.mjs render book-comic.json --md
node scripts/comic-image-set.mjs audit book-comic.json output-directory cast.json
node scripts/live-action-image-set.mjs validate book-live-action.json cast.json
node scripts/live-action-image-set.mjs render book-live-action.json --md
node scripts/live-action-image-set.mjs audit book-live-action.json output-directory cast.json
node scripts/selftest.mjs
node scripts/comic-selftest.mjs
node scripts/live-action-selftest.mjs
node ../../../evals/eval.mjs
```

Analysis fields are emitted in Taiwan Traditional Chinese. Verbatim evidence always preserves the source text. Image generation is optional; without an image tool, the skill still delivers all prompts and keeps every image status at `NOT_RUN`.
