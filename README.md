**繁體中文（台灣）** · [English](README.en.md)

# novelanalyze-skills

提供可供 AI 編程代理使用的自包含小說分析技能。目前收錄三套技能：`novel-characters` 建立角色設定集；`novel-bible` 整理有原文依據的情節資料；`novel-audiobook` 將小說拆成 Fish S2 Pro 可用的有聲書配音材料。

| 技能 | 功能 |
| --- | --- |
| [**novel-characters**](skills/novel-characters/README.md) | 人物分析、卡通形象、音色、三視圖、漫畫與真人身份固定圖片組與離線報告 |
| [**novel-bible**](skills/novel-bible/README.md) | 在已驗證角色卡之上整理時間線、關係、矛盾與未解線索 |
| [**novel-audiobook**](skills/novel-audiobook/README.md) | 旁白／角色分段、配音稿、發音表、Fish S2 Pro 請求與音檔順序清單 |

## 主要能力

- 將長篇文本分塊後掃描角色，合併跨章節名稱與別名；章回模式會保留第一章前的序言／前言，並自動把超出單段容量的長章再細分，避免靜默漏讀。
- 產出有原文依據的人物分析、卡通形象提示詞與 TTS 音色提示詞。
- 預設同時產出漫畫版與真人版 sidecar：身份硬鎖定、七張必要圖片、服裝連戲、逐張驗收與檔案稽核。
- 視覺設定會驗證 state 引用、輸出路徑與 CLI 參數；正向提示詞與 negative prompt 分開組合，不會因空欄位而互相錯置。
- `novel-bible` 會檢查時間線 ID、順序與各類線索 ID 的唯一性，Markdown renderer 會轉義不可信的模型輸出。
- `SKILL.md` 採用目前 Codex 技能格式，並提供 `agents/openai.yaml` 介面中繼資料。
- Windows PowerShell 與 macOS／Linux Bash 安裝器支援 Codex、OpenCode 與 Claude Code。
- Node.js 零套件依賴；GitHub Actions 於 Windows、macOS、Linux 及 Node.js 18／22／24 自測。
- 未實際產生的三視圖、漫畫圖片或真人圖片不得誤報為完成。

## 安裝

### 技能目錄（Codex／OpenCode／Claude Code）

```bash
npx skills add stevenke1981/novelanalyze-skills
```

這會把上述三套技能裝進目前代理的 skills 目錄。若要 SHA-256 完整性校驗（Windows 複製）或符號連結（macOS／Linux），改用下面的安裝器。

### Windows：Codex、OpenCode 與 Claude Code

```powershell
git clone https://github.com/stevenke1981/novelanalyze-skills.git
Set-Location .\novelanalyze-skills
.\scripts\install.ps1 -Codex -OpenCode -Claude
```

安裝器會複製技能並比對 SHA-256；預設不覆寫既有技能。要更新已安裝版本時使用：

```powershell
.\scripts\install.ps1 -Codex -OpenCode -Claude -Force
```

安裝位置：

- Codex：`%USERPROFILE%\.codex\skills\novel-characters`
- OpenCode：`%USERPROFILE%\.config\opencode\skills\novel-characters`
- Claude Code：`%USERPROFILE%\.claude\skills\novel-characters`

### macOS／Linux

```bash
git clone https://github.com/stevenke1981/novelanalyze-skills.git
cd novelanalyze-skills
./scripts/install.sh --codex --opencode --claude
```

Bash 安裝器使用符號連結，因此 `git pull` 後會立即套用更新。

## 使用

有聲書材料：

```text
$novel-audiobook 分析 ./我的小說.txt，輸出 Fish S2 Pro 的旁白與角色配音稿、逐段 TTS 文字及請求材料到 ./有聲書材料
```

可不帶角色卡獨立使用。沒有真實 Fish 聲音 ID 時會交付完整文字並標記待綁定；本技能不會自行呼叫付費 TTS。

在 Codex、OpenCode 或 Claude Code 中呼叫：

```text
$novel-characters 請分析 ./我的小說.txt，輸出角色設定、漫畫版與真人版主要角色圖片組到 ./角色設定
```

也可以直接使用確定性工具：

```powershell
node .\skills\novel-characters\scripts\novel-characters.mjs chunk .\book.txt .\workdir --chapters
node .\skills\novel-characters\scripts\novel-characters.mjs select .\roster-merged.json --top 10
node .\skills\novel-characters\scripts\novel-characters.mjs harvest-quotes .\book.txt .\roster-merged.json
node .\skills\novel-characters\scripts\novel-characters.mjs export-card .\cast.json --format tavern-v2 --out .\cards
node .\skills\novel-characters\scripts\comic-image-set.mjs compose-sequence .\book-comic.json
node .\skills\novel-characters\scripts\novel-characters.mjs voice-preview .\cast.json --out .\voice-preview.json
node .\skills\novel-bible\scripts\novel-bible.mjs validate .\book-bible.json .\book.txt .\cast.json
node .\skills\novel-characters\scripts\novel-characters.mjs validate .\cast.json .\book.txt
node .\skills\novel-characters\scripts\novel-characters.mjs validate .\cast.json .\book.txt --denylist .\denylist.txt
node .\skills\novel-characters\scripts\novel-characters.mjs render .\cast.json --html > report.html
node .\skills\novel-characters\scripts\comic-image-set.mjs validate .\book-comic.json .\cast.json
node .\skills\novel-characters\scripts\comic-image-set.mjs render .\book-comic.json --md > book-comic.md
node .\skills\novel-characters\scripts\comic-image-set.mjs audit .\book-comic.json . .\cast.json
node .\skills\novel-characters\scripts\live-action-image-set.mjs validate .\book-live-action.json .\cast.json
node .\skills\novel-characters\scripts\live-action-image-set.mjs render .\book-live-action.json --md > book-live-action.md
node .\skills\novel-characters\scripts\live-action-image-set.mjs audit .\book-live-action.json . .\cast.json
```

## 需求

| 項目 | 必要性 | 說明 |
| --- | --- | --- |
| Node.js 18+ | 必要 | 只使用標準函式庫，不需要 `npm install` |
| 目前代理的模型額度 | 必要 | 角色掃描、分析與提示詞由目前工作階段完成 |
| 目前環境的圖像工具 | 選用 | 用於卡通三視圖、漫畫圖片與真人圖片；沒有圖像工具仍可交付完整文字設定 |

## 驗證

```powershell
node .\skills\novel-characters\scripts\selftest.mjs
node .\skills\novel-characters\scripts\regression-selftest.mjs
node .\skills\novel-characters\scripts\comic-selftest.mjs
node .\skills\novel-characters\scripts\live-action-selftest.mjs
node .\evals\eval.mjs
node .\skills\novel-bible\scripts\selftest.mjs
node .\skills\novel-characters\scripts\novel-characters.mjs validate .\skills\novel-characters\examples\渡口-cast.json .\skills\novel-characters\examples\渡口.txt
node .\skills\novel-bible\scripts\novel-bible.mjs validate .\skills\novel-bible\examples\渡口-bible.json .\skills\novel-characters\examples\渡口.txt .\skills\novel-characters\examples\渡口-cast.json
node .\skills\novel-characters\scripts\comic-image-set.mjs validate .\skills\novel-characters\examples\渡口-comic.json .\skills\novel-characters\examples\渡口-cast.json
node .\skills\novel-characters\scripts\live-action-image-set.mjs validate .\skills\novel-characters\examples\渡口-live-action.json .\skills\novel-characters\examples\渡口-cast.json
```

## 授權與來源

依 [Apache License 2.0](LICENSE) 發佈。原始專案與著作權歸原作者所有；本儲存庫保留原始 [NOTICE](NOTICE) 並標示繁體中文衍生修改。
