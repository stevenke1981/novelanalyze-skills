**繁體中文（台灣）** · [English](README.en.md)

# shuohao-skills 繁體中文版

這是 [eternityspring/shuohao-skills](https://github.com/eternityspring/shuohao-skills) 的台灣繁體中文強化版，提供可供 AI 編程代理使用的自包含技能。

| 技能 | 功能 |
| --- | --- |
| [**novel-characters**](skills/novel-characters/README.md) | 將小說整理成角色設定集：人物分析、形象提示詞、音色提示詞、三視圖與離線報告 |

## 主要改進

- 技能指令、參考資料、CLI 訊息與範例全面改為台灣繁體中文。
- `SKILL.md` 採用目前 Codex 技能格式，並加入 `agents/openai.yaml` 介面中繼資料。
- 新增 Windows PowerShell 安裝器，支援 ChatGPT Codex 與 OpenCode。
- 保留 Node.js 零套件依賴，並補上 GitHub Actions 跨平台自測。
- 強化驗收流程，避免把未產生的三視圖或未掃描的內容誤報為完成。

## 安裝

### Windows：Codex 與 OpenCode

```powershell
git clone https://github.com/stevenke1981/shuohao-skills-zh-tw.git
Set-Location .\shuohao-skills-zh-tw
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
git clone https://github.com/stevenke1981/shuohao-skills-zh-tw.git
cd shuohao-skills-zh-tw
./scripts/install.sh --codex --opencode
```

Bash 安裝器使用符號連結，因此 `git pull` 後會立即套用更新。

## 使用

在 Codex 或 OpenCode 中呼叫：

```text
$novel-characters 請分析 ./我的小說.txt，將結果輸出到 ./角色設定
```

也可以直接使用 CLI 的確定性工具：

```powershell
node .\skills\novel-characters\scripts\novel-characters.mjs validate .\cast.json .\book.txt
node .\skills\novel-characters\scripts\novel-characters.mjs render .\cast.json --html > report.html
```

## 需求

| 項目 | 必要性 | 說明 |
| --- | --- | --- |
| Node.js 18+ | 必要 | 只使用標準函式庫，不需要 `npm install` |
| 目前代理的模型額度 | 必要 | 角色掃描與分析由目前工作階段完成 |
| Codex `$imagegen` | 選用 | 只用於三視圖；OpenCode 仍可完成所有文字與報告產出 |

## 驗證

```powershell
node .\skills\novel-characters\scripts\selftest.mjs
node .\skills\novel-characters\scripts\novel-characters.mjs validate .\skills\novel-characters\examples\渡口-cast.json .\skills\novel-characters\examples\渡口.txt
```

## 授權與來源

依 [Apache License 2.0](LICENSE) 發佈。原始專案與著作權歸原作者所有；本儲存庫保留原始 [NOTICE](NOTICE) 並標示繁體中文衍生修改。
