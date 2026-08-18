---
name: novel-characters
description: >-
  將小說或短篇故事整理成角色設定集，產出角色清單、人物分析、卡通形象提示詞、漫畫版圖片組、真人版圖片組、音色提示詞、JSON、Markdown 與離線 HTML 報告，並可在圖像工具可用時為主要角色製作三視圖、漫畫身份固定圖與真人身份固定圖。當使用者要求拆解小說角色、分析人物、建立角色卡、角色聖經、配音設定、角色設計稿、漫畫化角色、真人化角色、電影化角色、角色身份固定圖，或從小說建立 character sheet 時使用。
---

# 小說角色設定集

將本 `SKILL.md` 所在資料夾記為 `<SKILL_DIR>`。所有腳本都從 `<SKILL_DIR>/scripts/` 執行，不要假設目前工作目錄就是技能目錄。

本技能需要 Node.js 18 以上版本，且不需要 npm 套件或 API key。Codex、OpenCode 與 Claude Code 都能執行文字流程；只有目前環境真的提供圖像工具時才產生圖片。

## 成果契約

基本成果至少交付：

- `<書名>-cast.json`：可供其他工具使用的結構化角色資料。
- `<書名>-cast.md`：方便閱讀與版本管理的角色設定集。
- `report.html`：可離線開啟、搜尋、列印的完整報告。
- `images/*-turnaround.png`：僅在圖像工具可用且實際生成成功時交付。

預設另外同時交付漫畫版與真人版圖片組：

- `<書名>-comic.json`：漫畫身份鎖定、全案視覺聖經、七張必要圖片設定與逐張狀態。
- `<書名>-comic.md`：漫畫圖片組製作版。
- `images/comic/<slug>/*.png`：僅在實際生成並驗收成功時交付。
- `<書名>-live-action.json`：真人身份鎖定、全案視覺聖經、七張必要圖片設定與逐張狀態。
- `<書名>-live-action.md`：真人圖片組製作版。
- `images/live-action/<slug>/*.png`：僅在實際生成並驗收成功時交付。

只有使用者明確只要其中一種視覺版本時，才可省略另一種。

人物分析與提示詞使用台灣繁體中文；英文提示詞欄位維持英文。`persona.evidence` 必須保留原文，無論原文使用哪一種語言或字體。

## 工作流程

### 1. 準備輸入與輸出目錄

使用使用者提供的文字檔。若使用者直接貼上正文，先以 UTF-8 寫入暫存 `.txt`，讓逐字引文能被驗證。

優先使用使用者指定的輸出目錄；未指定時，使用原文檔案旁的同名輸出目錄。不要覆寫原文。

每次執行使用新的空白 `<workdir>`。`chunk` 會拒絕含有舊分塊、角色清單或角色卡的工作目錄，避免把前一次分析混入本次結果。

### 2. 分塊

```bash
node "<SKILL_DIR>/scripts/novel-characters.mjs" chunk "<book.txt>" "<workdir>"
```

長篇若回報 `truncated: true`，改用階層分塊，不要假裝已掃完全文：

```bash
node "<SKILL_DIR>/scripts/novel-characters.mjs" chunk "<book.txt>" "<workdir>" --chapters
node "<SKILL_DIR>/scripts/novel-characters.mjs" chunk "<book.txt>" "<workdir>" --parts 3
```

`--chapters` 依章回標題分段；找不到標題時改按容量切成多段。每一段各自最多 24 塊，寫在 `part-NN/chunk-MM.txt`，並留下 `parts.json`。某段仍 `truncated` 時必須點名該段。

檢查輸出的 JSON：

- `chunks == 0`：停止並回報輸入為空。
- `mode == "flat"` 且 `chunks == 1`：直接讀取該分塊並建立 `roster-00.json`。
- `chunks > 1` 或 `parts > 1`：逐塊執行角色掃描；有 `part-NN/` 時把 roster 寫進同一段目錄。
- 任一 `truncated == true`：明確回報未掃描範圍，不得宣稱已分析全文。

### 3. 掃描角色

每個分塊都必須先讀取 `references/roster-pass.md`，再將結果寫成 `<workdir>/roster-NN.json`。掃描時保留角色名稱、別名、密集觀察與可逐字引用的原文。

### 4. 合併與選角

```bash
node "<SKILL_DIR>/scripts/novel-characters.mjs" merge "<workdir>" > "<workdir>/roster-merged.json"
node "<SKILL_DIR>/scripts/novel-characters.mjs" select "<workdir>/roster-merged.json" --top 10 > "<workdir>/roster-selected.json"
```

`merge` 會讀取工作目錄裡的 `roster-*.json`，也會讀取 `part-*/roster-*.json`。依名稱與別名合併同一角色，並依出現分塊數排序。再用 `select` 切片；預設前 10 位。使用者指定數量時改 `--top N`，指定名單時用 `--names 沈知微,老周`（此時忽略 `--top`）。不要只在心裡切前 10 名。最後回報尚未製作完整角色卡的人數。

在寫角色卡前，用原文補引文候選（只複製連續原文，不寫分析）：

```bash
node "<SKILL_DIR>/scripts/novel-characters.mjs" harvest-quotes "<book.txt>" "<workdir>/roster-selected.json"
```

英文小說若已有 BookNLP 輸出，可先看 `adapters/booknlp-to-roster.md`；這不是安裝依賴，也不可用於中文。

### 5. 建立角色卡與故事摘要

先讀取 `references/profile-pass.md` 與 `references/schema.md`。每位角色建立一個 `card-<slug>.json`，並提供同批其他角色名稱，避免造型與聲線重複。

同時建立 3–5 句台灣繁體中文故事摘要，交代時空背景、核心情境與角色相遇原因；不要劇透結局，也不要寫成推薦文。

合併成：

```json
{
  "source": "書名",
  "summary": "故事摘要",
  "characters": []
}
```

### 6. 執行角色卡強制驗證

```bash
node "<SKILL_DIR>/scripts/novel-characters.mjs" validate "<書名>-cast.json" "<book.txt>"
```

驗證結構、角色重要度列舉、逐字引文、影像提示詞中的名稱洩漏（角色名、別名、`source` 書名、可選 `author`、以及 `--denylist`）、欄位語言分工，以及應使用台灣繁體中文的分析欄位。少於兩個字的中文名稱／別名不檢查，避免誤傷普通詞。有錯誤時逐項修正並重跑，直到結束碼為 0。

不得刪除引文或放寬驗證規則來換取通過。

### 7. 同時建立漫畫版與真人版圖片組

預設同時建立兩種視覺 sidecar，不要互相覆寫，也不要改寫既有角色卡中的卡通 `image.prompt`。先讀取：

- `references/comic-image-set.md`
- `references/comic-schema.md`
- `references/live-action-image-set.md`
- `references/live-action-schema.md`

預設只處理 `protagonist` 與 `major`；使用者明確要求全部角色時才擴大。每位角色在每一種視覺版本裡都必須有七張必要圖片設定：

1. `identity-board`
2. `neutral-portrait`
3. `face-angles`
4. `full-body-turnaround`
5. `expression-grid`
6. `wardrobe-board`
7. `cinematic-keyframe`

漫畫版輸出到 `<書名>-comic.json` 與 `images/comic/<slug>/`；真人版輸出到 `<書名>-live-action.json` 與 `images/live-action/<slug>/`。兩份設定共用身份鎖定來源，但畫風、反向提示詞與產圖路徑必須分開。

完成後執行：

```bash
node "<SKILL_DIR>/scripts/comic-image-set.mjs" validate "<書名>-comic.json" "<書名>-cast.json"
node "<SKILL_DIR>/scripts/comic-image-set.mjs" render "<書名>-comic.json" --md > "<書名>-comic.md"
node "<SKILL_DIR>/scripts/live-action-image-set.mjs" validate "<書名>-live-action.json" "<書名>-cast.json"
node "<SKILL_DIR>/scripts/live-action-image-set.mjs" render "<書名>-live-action.json" --md > "<書名>-live-action.md"
```

英文與中文圖像提示詞都不得出現角色名、別名、作品名、作者名、演員名、明星名或公眾人物名。驗證器會檢查角色名、別名、`source` 與 `author`；演員／明星請放到可選的 denylist 檔，不要把巨大詞表寫進技能。

### 8. 產生卡通三視圖（選用）

只為 `protagonist` 與 `major` 自動生成；使用者明確要求全部生成時才擴大範圍。

先讀取 `references/turnaround.md`：

- 在 Codex 中直接使用目前提供的圖像工具，不要遞迴呼叫 `codex exec`。
- 在 OpenCode 或其他沒有圖像工具的環境中，保留三視圖提示詞並跳過產圖。
- 每位角色分開生成，成功後確認實際檔案位於 `images/<slug>-turnaround.png`。
- 不得把「已送出生成」當成「已產生檔案」。

### 9. 產生漫畫與真人圖片組（選用）

只有第 7 步已建立設定且目前環境有圖像工具時執行。漫畫版與真人版分開產圖，不可混用參考圖。

1. 每一種視覺版本、每位角色都先只生成該版本的 `identity-board`。
2. 該版本身份固定板未通過前，不得生成其餘六張。
3. 後續每張都以同一張核准身份固定板為最高優先參考；支援參考圖權重時設為高。
4. 完成一張就檢查同一人、輪廓、髮型、身形、服裝與道具連戲，再更新 `status`。
5. `PASS` 只能用於存在、可開啟且通過驗收的 PNG；失敗用 `FAIL`，未執行用 `NOT_RUN`。
6. 全部處理後執行：

```bash
node "<SKILL_DIR>/scripts/comic-image-set.mjs" audit "<書名>-comic.json" "<輸出目錄>" "<書名>-cast.json"
node "<SKILL_DIR>/scripts/live-action-image-set.mjs" audit "<書名>-live-action.json" "<輸出目錄>" "<書名>-cast.json"
```

圖片工具不可用時不阻斷文字成果，保留完整設定並將所有圖片維持 `NOT_RUN`。

### 10. 產生角色報告

先完成選用的三視圖、漫畫圖片組與真人圖片組，再執行：

```bash
node "<SKILL_DIR>/scripts/novel-characters.mjs" render "<書名>-cast.json" --md > "<書名>-cast.md"
node "<SKILL_DIR>/scripts/novel-characters.mjs" render "<書名>-cast.json" --html > "report.html"
```

修改 HTML 樣式前先讀取 `references/report-style.md`，並保留離線、自包含、可搜尋、可列印、鍵盤焦點可見與減少動效等特性。

若漫畫版或真人版設定有更新，最後再重跑對應 Markdown：

```bash
node "<SKILL_DIR>/scripts/comic-image-set.mjs" render "<書名>-comic.json" --md > "<書名>-comic.md"
node "<SKILL_DIR>/scripts/live-action-image-set.mjs" render "<書名>-live-action.json" --md > "<書名>-live-action.md"
```

### 11. 可選匯出與情節聖經

若使用者要 SillyTavern／Tavern 角色卡：

```bash
node "<SKILL_DIR>/scripts/novel-characters.mjs" export-card "<書名>-cast.json" --format tavern-v2 --out "<輸出目錄>/cards"
```

RP 卡可以使用角色名；圖像提示詞留在 `cast.json`，繼續禁人名。

時間線、關係、矛盾與伏筆不要寫進本技能。改用兄弟技能 `novel-bible`。

### 12. 驗收

實際確認：

1. 角色卡 `validate` 結束碼為 0。
2. JSON 與 Markdown 可讀，角色數一致。
3. `report.html` 可開啟，角色索引、複製按鈕與內容正常。
4. 聲稱已生成的每張卡通三視圖都存在且可開啟。
5. 漫畫版與真人版的 `validate` 與 `audit` 結束碼都為 0。
6. 每張標示 `PASS` 的漫畫或真人圖片都存在、可開啟，且與該版本核准身份固定板為同一人。
7. 若有截斷、跳過產圖、失敗角色或 `NOT_RUN` 圖片，最後明確列出。

## 邊界

- 單段最多 24 個分塊，約 33 萬字元。長篇必須用 `--chapters` 或 `--parts N` 分段；仍截斷的段落要點名。
- 分析欄位固定使用台灣繁體中文；逐字引文永遠保留原文。
- 影像生成僅使用目前環境已提供的圖像工具，不自行要求或改用 `OPENAI_API_KEY`。
- 漫畫與真人身份固定都不使用明星、演員、公眾人物或既有 IP 角色相貌作捷徑。
- 不在本技能內建立即時編輯器或長期資料庫。

## 自測

修改技能或腳本後執行：

```bash
node "<SKILL_DIR>/scripts/selftest.mjs"
node "<SKILL_DIR>/scripts/comic-selftest.mjs"
node "<SKILL_DIR>/scripts/live-action-selftest.mjs"
```

若在儲存庫根目錄，另外執行 `node evals/eval.mjs`。自測與 evals 都不得呼叫模型或消耗模型額度。
