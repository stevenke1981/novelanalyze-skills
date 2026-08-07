**繁體中文（台灣）** · [English](README.en.md)

# novelanalyze-skills

提供可供 AI 編程代理使用的自包含小說分析技能。目前收錄 `novel-characters`：將小說整理成可直接投入角色設計、配音、真人選角與視覺製作的角色設定集。

| 技能 | 功能 |
| --- | --- |
| [**novel-characters**](skills/novel-characters/README.md) | 人物分析、卡通形象、音色、三視圖、真人身份固定圖片組與離線報告 |

## 主要能力

- 將長篇文本分塊後掃描角色，合併跨章節名稱與別名。
- 產出有原文依據的人物分析、卡通形象提示詞與 TTS 音色提示詞。
- 產出可選用的真人版 sidecar：身份硬鎖定、七張必要圖片、服裝連戲、逐張驗收與檔案稽核。
- `SKILL.md` 採用目前 Codex 技能格式，並提供 `agents/openai.yaml` 介面中繼資料。
- Windows PowerShell 與 macOS／Linux Bash 安裝器支援 Codex 與 OpenCode。
- Node.js 零套件依賴；GitHub Actions 於 Windows、macOS、Linux 及 Node.js 18／22／24 自測。
- 未實際產生的三視圖或真人圖片不得誤報為完成。

## 安裝

### Windows：Codex 與 OpenCode

```powershell
git clone https://github.com/stevenke1981/novelanalyze-skills.git
Set-Location .\novelanalyze-skills
.\scripts\install.ps1 -Codex -OpenCode
```

安裝器會複製技能並比對 SHA-256；預設不覆寫既有技能。要更新已安裝版本時使用：

```powershell
.\scripts\install.ps1 -Codex -OpenCode -Force
```

安裝位置：

- Codex：`%USERPROFILE%\.codex\skills\novel-characters`
- OpenCode：`%USERPROFILE%\.config\opencode\skills\novel-characters`

### macOS／Linux

```bash
git clone https://github.com/stevenke1981/novelanalyze-skills.git
cd novelanalyze-skills
./scripts/install.sh --codex --opencode
```

Bash 安裝器使用符號連結，因此 `git pull` 後會立即套用更新。

## 使用

在 Codex 或 OpenCode 中呼叫：

```text
$novel-characters 請分析 ./我的小說.txt，輸出角色設定與真人版主要角色圖片組到 ./角色設定
```

也可以直接使用確定性工具：

```powershell
node .\skills\novel-characters\scripts\novel-characters.mjs validate .\cast.json .\book.txt
node .\skills\novel-characters\scripts\novel-characters.mjs render .\cast.json --html > report.html
node .\skills\novel-characters\scripts\live-action-image-set.mjs validate .\book-live-action.json .\cast.json
node .\skills\novel-characters\scripts\live-action-image-set.mjs render .\book-live-action.json --md > book-live-action.md
node .\skills\novel-characters\scripts\live-action-image-set.mjs audit .\book-live-action.json . .\cast.json
```

## 需求

| 項目 | 必要性 | 說明 |
| --- | --- | --- |
| Node.js 18+ | 必要 | 只使用標準函式庫，不需要 `npm install` |
| 目前代理的模型額度 | 必要 | 角色掃描、分析與提示詞由目前工作階段完成 |
| 目前環境的圖像工具 | 選用 | 用於卡通三視圖與真人圖片；沒有圖像工具仍可交付完整文字設定 |

## 驗證

```powershell
node .\skills\novel-characters\scripts\selftest.mjs
node .\skills\novel-characters\scripts\live-action-selftest.mjs
node .\skills\novel-characters\scripts\novel-characters.mjs validate .\skills\novel-characters\examples\渡口-cast.json .\skills\novel-characters\examples\渡口.txt
node .\skills\novel-characters\scripts\live-action-image-set.mjs validate .\skills\novel-characters\examples\渡口-live-action.json .\skills\novel-characters\examples\渡口-cast.json
```

## 授權與來源

依 [Apache License 2.0](LICENSE) 發佈。原始專案與著作權歸原作者所有；本儲存庫保留原始 [NOTICE](NOTICE) 並標示繁體中文衍生修改。
