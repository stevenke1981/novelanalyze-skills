[繁體中文（台灣）](README.md) · **English**

# novelanalyze-skills

Self-contained fiction-analysis skills for AI coding agents. The repository currently ships `novel-characters` and `novel-bible`: the first turns prose into a production-ready character pack, and the second adds a source-grounded timeline and relationship bible.

## Capabilities

- Chunk long fiction, discover characters, and merge names and aliases across chapters.
- Produce evidence-backed profiles, bilingual cartoon-image prompts, voice prompts, JSON, Markdown, and an offline HTML report.
- By default produce parallel comic and live-action sidecars with hard identity locks, seven required image shots, wardrobe continuity, per-image acceptance criteria, and file auditing.
- Run without npm dependencies on Node.js 18 or newer.
- Install into Codex and OpenCode on Windows, macOS, and Linux.

## Install

Agent skills directory (Codex, OpenCode, or Claude Code):

```bash
npx skills add stevenke1981/novelanalyze-skills
```

This installs `novel-characters` and `novel-bible` into the current agent's skills folder. Use the installers below when you want SHA-256 tree verification on Windows or symlink updates on macOS and Linux.

Windows:

```powershell
git clone https://github.com/stevenke1981/novelanalyze-skills.git
Set-Location .\novelanalyze-skills
.\scripts\install.ps1 -Codex -OpenCode
```

macOS or Linux:

```bash
git clone https://github.com/stevenke1981/novelanalyze-skills.git
cd novelanalyze-skills
./scripts/install.sh --codex --opencode
```

The Windows installer copies the skill and verifies complete SHA-256 tree parity. The Bash installer uses symlinks so updates apply immediately after `git pull`.

## Use

```text
$novel-characters Analyze ./my-novel.txt and write the character bible plus comic and live-action image-set configuration to ./character-bible
```

Deterministic commands:

```bash
node skills/novel-characters/scripts/novel-characters.mjs chunk book.txt workdir --chapters
node skills/novel-characters/scripts/novel-characters.mjs select roster-merged.json --top 10
node skills/novel-characters/scripts/novel-characters.mjs harvest-quotes book.txt roster-merged.json
node skills/novel-characters/scripts/novel-characters.mjs export-card cast.json --format tavern-v2 --out cards
node skills/novel-characters/scripts/comic-image-set.mjs compose-sequence book-comic.json
node skills/novel-characters/scripts/novel-characters.mjs voice-preview cast.json --out voice-preview.json
node skills/novel-bible/scripts/novel-bible.mjs validate book-bible.json book.txt cast.json
node skills/novel-characters/scripts/novel-characters.mjs validate cast.json book.txt
node skills/novel-characters/scripts/novel-characters.mjs validate cast.json book.txt --denylist denylist.txt
node skills/novel-characters/scripts/novel-characters.mjs render cast.json --html > report.html
node skills/novel-characters/scripts/comic-image-set.mjs validate book-comic.json cast.json
node skills/novel-characters/scripts/comic-image-set.mjs render book-comic.json --md > book-comic.md
node skills/novel-characters/scripts/comic-image-set.mjs audit book-comic.json . cast.json
node skills/novel-characters/scripts/live-action-image-set.mjs validate book-live-action.json cast.json
node skills/novel-characters/scripts/live-action-image-set.mjs render book-live-action.json --md > book-live-action.md
node skills/novel-characters/scripts/live-action-image-set.mjs audit book-live-action.json . cast.json
```

## Requirements

- Node.js 18 or newer; no npm packages.
- The current agent session for model-driven character analysis and prompt writing.
- An image tool is optional. Without one, all JSON, Markdown, HTML, turnaround prompts, and both comic and live-action shot settings still remain deliverable.

## Validate

```bash
node skills/novel-characters/scripts/selftest.mjs
node skills/novel-characters/scripts/comic-selftest.mjs
node skills/novel-characters/scripts/live-action-selftest.mjs
node evals/eval.mjs
node skills/novel-bible/scripts/selftest.mjs
node skills/novel-characters/scripts/novel-characters.mjs validate skills/novel-characters/examples/渡口-cast.json skills/novel-characters/examples/渡口.txt
node skills/novel-bible/scripts/novel-bible.mjs validate skills/novel-bible/examples/渡口-bible.json skills/novel-characters/examples/渡口.txt skills/novel-characters/examples/渡口-cast.json
node skills/novel-characters/scripts/comic-image-set.mjs validate skills/novel-characters/examples/渡口-comic.json skills/novel-characters/examples/渡口-cast.json
node skills/novel-characters/scripts/live-action-image-set.mjs validate skills/novel-characters/examples/渡口-live-action.json skills/novel-characters/examples/渡口-cast.json
```

## License and provenance

Distributed under [Apache License 2.0](LICENSE). The original project and copyright remain with their respective owner; this repository preserves [NOTICE](NOTICE) and identifies the Traditional Chinese derivative changes.
