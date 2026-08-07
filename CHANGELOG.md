# Changelog

## novel-characters 1.1.0 — 2026-08-07

- 全面改寫為台灣繁體中文，逐字原文引文維持來源字體。
- 將 `SKILL.md` 更新為現行 Codex 技能格式，補上 `agents/openai.yaml`。
- 新增台灣繁體中文欄位驗證與對應回歸測試。
- 修正長文截斷漏報、舊工作目錄資料污染、交叉別名合併與戲份排序。
- 強化逐字引文、巢狀結構、Markdown／HTML、圖片路徑與 Windows 檔名安全。
- 新增 Windows PowerShell 安裝器，支援 Codex 與 OpenCode 並驗證 SHA-256 完整性。
- Bash 安裝器新增 OpenCode 目標。
- 啟用 GitHub Actions，於 Windows、macOS 與 Linux 執行 Node.js 18／22／24 自測。
- 強化三視圖完成條件，未實際產生圖片時不得標示成功。

## novel-characters 1.0.0 — 2026-08-06

首個版本。

**管線**

- 兩階段：分塊掃描角色 → 別名合併 → 逐角色出完整設定
- 輸出人物分析、卡通形象提示詞（中英）、音色提示詞（中英）
- 三視圖出圖，走 Codex 內建 `$imagegen`，零 API key；沒有 Codex 就跳過，其餘照常
- 三視圖一律**純白背景**，方便摳圖

**產出**

- `cast.json` + Markdown + 自包含 `report.html`
- report.html 的設計約定見 `references/report-style.md`：
  雙字域排版（宋體＝原文 / 黑體＝分析 / 等寬＝提示詞）、不藏內容可 Cmd+F、
  「（推斷）」自動高亮、冷灰印張配鐵鏽紅印記
- 每段提示詞各自一個複製按鈕，每個角色 8 個

**驗證**

確定性檢查，不靠模型自覺：逐字引文、出圖提示詞不含人名、欄位語言分工、結構與列舉。

**自測**

初版自測涵蓋分塊、合併、驗證與渲染，不呼叫模型。
