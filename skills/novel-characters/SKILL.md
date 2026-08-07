---
name: novel-characters
description: 將小說或短篇故事整理成角色設定集，產出角色清單、人物分析、卡通形象提示詞、音色提示詞、JSON、Markdown 與離線 HTML 報告，並可在 Codex 中為主要角色製作三視圖。當使用者要求拆解小說角色、分析人物、建立角色卡、角色聖經、配音設定、角色設計稿，或從小說建立 character sheet 時使用。
---

# 小說角色設定集

將本 `SKILL.md` 所在資料夾記為 `<SKILL_DIR>`。所有腳本都從 `<SKILL_DIR>/scripts/novel-characters.mjs` 執行，不要假設目前工作目錄就是技能目錄。

本技能需要 Node.js 18 以上版本，且不需要 npm 套件或 API key。Codex、OpenCode 與 Claude Code 都能執行文字流程；只有 Codex 可直接使用內建 `$imagegen` 產生三視圖。

## 成果契約

至少交付：

- `<書名>-cast.json`：可供其他工具使用的結構化角色資料。
- `<書名>-cast.md`：方便閱讀與版本管理的角色設定集。
- `report.html`：可離線開啟、搜尋、列印的完整報告。
- `images/*-turnaround.png`：僅在圖像工具可用且實際生成成功時交付。

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

檢查輸出的 JSON：

- `chunks == 0`：停止並回報輸入為空。
- `chunks == 1`：直接讀取該分塊並建立 `roster-00.json`。
- `chunks > 1`：逐塊執行角色掃描；環境支援安全的子代理時可平行處理。
- `truncated == true`：明確回報尾端未掃描，不得宣稱已分析全文。

### 3. 掃描角色

每個分塊都必須先讀取 `references/roster-pass.md`，再將結果寫成 `<workdir>/roster-NN.json`。掃描時保留角色名稱、別名、密集觀察與可逐字引用的原文。

### 4. 合併與選角

```bash
node "<SKILL_DIR>/scripts/novel-characters.mjs" merge "<workdir>" > "<workdir>/roster-merged.json"
```

依名稱與別名合併同一角色，並依出現分塊數排序。預設為前 10 位；使用者指定數量時以使用者要求為準。最後回報尚未製作完整角色卡的人數。

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

### 6. 執行強制驗證

```bash
node "<SKILL_DIR>/scripts/novel-characters.mjs" validate "<cast.json>" "<book.txt>"
```

驗證結構、角色重要度列舉、逐字引文、影像提示詞中的人名洩漏、欄位語言分工，以及應使用台灣繁體中文的分析欄位。有錯誤時逐項修正並重跑，直到結束碼為 0。

不得刪除引文或放寬驗證規則來換取通過。

### 7. 產生三視圖（選用）

只為 `protagonist` 與 `major` 自動生成；使用者明確要求全部生成時才擴大範圍。

先讀取 `references/turnaround.md`：

- 在 Codex 中直接使用 `$imagegen`，不要遞迴呼叫 `codex exec`。
- 在 OpenCode 或其他沒有圖像工具的環境中，保留三視圖提示詞並跳過產圖。
- 每位角色分開生成，成功後確認實際檔案位於 `images/<slug>-turnaround.png`。
- 不得把「已送出生成」當成「已產生檔案」。

### 8. 產生報告

先完成選用的三視圖，再執行：

```bash
node "<SKILL_DIR>/scripts/novel-characters.mjs" render "<cast.json>" --md > "<書名>-cast.md"
node "<SKILL_DIR>/scripts/novel-characters.mjs" render "<cast.json>" --html > "report.html"
```

修改 HTML 樣式前先讀取 `references/report-style.md`，並保留離線、自包含、可搜尋、可列印、鍵盤焦點可見與減少動效等特性。

### 9. 驗收

實際確認：

1. `validate` 結束碼為 0。
2. JSON 與 Markdown 可讀，角色數一致。
3. `report.html` 可開啟，角色索引、複製按鈕與內容正常。
4. 聲稱已生成的每張三視圖都存在且可開啟。
5. 若有截斷、跳過產圖或失敗角色，最後明確列出。

## 邊界

- 單次最多 24 個分塊，約 33 萬字元；超出時只分析已分塊範圍。
- 分析欄位固定使用台灣繁體中文；逐字引文永遠保留原文。
- 影像生成僅使用目前環境已提供的圖像工具，不自行要求或改用 `OPENAI_API_KEY`。
- 不在本技能內建立即時編輯器或長期資料庫。

## 自測

修改技能或腳本後執行：

```bash
node "<SKILL_DIR>/scripts/selftest.mjs"
```

自測不得呼叫模型或消耗模型額度。
