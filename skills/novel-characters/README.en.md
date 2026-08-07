[繁體中文（台灣）](README.md) · **English**

# novel-characters

Turn a novel or short story into a production-ready character bible:

- merged cast and aliases;
- evidence-backed profiles;
- bilingual image and voice-design prompts;
- JSON, Markdown, and a self-contained offline HTML report;
- optional front/side/back turnaround sheets through Codex `$imagegen`.

After following the [repository installation guide](../../README.en.md), invoke:

```text
$novel-characters Analyze ./my-novel.txt and write the result to ./character-bible
```

The deterministic helper is dependency-free and requires Node.js 18 or newer:

```bash
node scripts/novel-characters.mjs chunk book.txt workdir
node scripts/novel-characters.mjs merge workdir
node scripts/novel-characters.mjs validate cast.json book.txt
node scripts/novel-characters.mjs render cast.json --html
node scripts/selftest.mjs
```

Analysis fields are emitted in Taiwan Traditional Chinese. Verbatim evidence always preserves the source text so validation can compare it exactly. OpenCode can complete the text and report workflow; image generation is skipped when no image tool is available.
