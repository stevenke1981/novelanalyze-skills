[繁體中文（台灣）](README.md) · **English**

# shuohao-skills Traditional Chinese Edition

This is a Taiwan Traditional Chinese enhancement of [eternityspring/shuohao-skills](https://github.com/eternityspring/shuohao-skills). It currently includes `novel-characters`, a self-contained skill that turns fiction into a production-ready character bible.

## Install

Windows, for Codex and OpenCode:

```powershell
git clone https://github.com/stevenke1981/shuohao-skills-zh-tw.git
Set-Location .\shuohao-skills-zh-tw
.\scripts\install.ps1 -Codex -OpenCode
```

macOS or Linux:

```bash
git clone https://github.com/stevenke1981/shuohao-skills-zh-tw.git
cd shuohao-skills-zh-tw
./scripts/install.sh --codex --opencode
```

The Windows installer copies the skill and verifies complete SHA-256 tree parity. The Bash installer uses symlinks so updates apply immediately after `git pull`.

## Requirements

- Node.js 18 or newer; no npm dependencies.
- The current agent session for the two model-driven analysis passes.
- Codex `$imagegen` is optional and used only for turnaround images. OpenCode can complete all text, validation, and report outputs without it.

## Validate

```powershell
node .\skills\novel-characters\scripts\selftest.mjs
node .\skills\novel-characters\scripts\novel-characters.mjs validate .\skills\novel-characters\examples\渡口-cast.json .\skills\novel-characters\examples\渡口.txt
```

## License and provenance

Distributed under [Apache License 2.0](LICENSE). The original project and copyright remain with their respective owner; this repository preserves [NOTICE](NOTICE) and identifies the Traditional Chinese derivative changes.
