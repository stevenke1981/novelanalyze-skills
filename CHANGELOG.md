# Changelog

## 1.6.0 — 2026-08-18

- `audit` 對 `PASS` 檢查有效 PNG、長寬比，並可選比對 identity-board 平均雜湊；假文字檔不能再過關。
- 視覺角色可選 `states`（wardrobe／expression／condition），禁止靜默改身份。
- 新增 `compose-sequence` 與 `sequence-generation.md`，七張圖可當一致序列配方。
- 新增 `optional-ip-adapter.md` 外部食譜，不引入擴散模型依賴。
- 新增 `voice-preview` 與 `voice-preview.md`：5 秒試聽清單，不阻擋角色卡驗證。

## 1.5.0 — 2026-08-18

- `chunk --chapters`／`--parts N`：長篇按章回或容量分段，每段各自最多 24 塊，並寫 `parts.json`。
- `merge` 會合併 `part-*/roster-*.json`；截斷改為按段回報。
- 新增 `harvest-quotes`，在寫角色卡前從原文抽出逐字引文候選。
- 新增 `export-card --format tavern-v2`；RP 卡可用人名，圖像提示詞不匯出。
- 新增可選 BookNLP 英文轉接器（文件 + 確定性轉換，不安裝 Python）。
- 新增兄弟技能 `novel-bible`：時間線、關係、矛盾、線索，全部要有原文引文。

## novel-characters 1.4.0 — 2026-08-18

- 文件新增 `npx skills add stevenke1981/novelanalyze-skills`，與既有 SHA-256／symlink 安裝器並存。
- `NOTICE` 與 Windows 安裝標記改回目前儲存庫名 `stevenke1981/novelanalyze-skills`。
- `slug()` 與名稱檢查改為共用模組；漫畫／真人 CLI 改用 `realpathSync` 判斷進入點。
- 圖像提示詞禁用檢查擴充到書名 `source`、可選 `author` 與 `--denylist`；少於 2 字的中文名稱仍不檢查。
- 新增 `select --top N`／`--names`，把預設前 10 名做成確定性指令。
- 新增 `evals/` 公開領域夾具與不呼叫模型的評測腳本。
- GitHub Actions 增加 HTML 渲染煙霧測試與 evals。

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
