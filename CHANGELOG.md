# Changelog

## novel-characters 1.3.0 — 2026-08-18

- 預設同時產出漫畫版與真人版圖片組 sidecar，不再把漫畫製作包只留在角色卡卡通欄位。
- 共用視覺包驗證器支援 `mode=comic` 與 `mode=live-action`，輸出目錄分別為 `images/comic/` 與 `images/live-action/`。
- 新增 `comic-image-set.mjs`、`comic-schema.md`、`comic-image-set.md`、`渡口-comic.json`、對應 Markdown 範例與漫畫版確定性自測。
- Markdown renderer 依模式切換標題與視覺聖經欄位名稱。
- 更新技能契約、README、介面中繼資料與 GitHub Actions，使兩種視覺版本成為基本成果。

## novel-characters 1.2.0 — 2026-08-07

- 新增獨立真人版圖片組 sidecar，不改動既有卡通角色卡結構。
- 新增全案視覺聖經、真人身份硬鎖定、表演、服裝與材質連戲設定。
- 每位真人角色固定提供七張製作圖片：身份固定板、中性肖像、臉部角度、全身三視圖、表情九宮格、服裝材質板與電影關鍵畫面。
- 新增零套件 `live-action-image-set.mjs`，可驗證語言、必要鏡頭、比例、人名洩漏、重複輸出、`cast.json` 對應與安全路徑。
- 新增 `audit`，禁止在 PNG 不存在或為空時將圖片狀態標示為 `PASS`。
- 新增真人版 Markdown renderer、完整範例與確定性自測。
- GitHub Actions 於 Windows、macOS、Linux 及 Node.js 18／22／24 執行真人版自測與範例驗證。
- 修正根目錄 README 的儲存庫名稱與 clone URL，避免安裝指令指向舊專案名稱。

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
