---
name: novel-bible
description: >-
  在已驗證的小說角色卡之上整理時間線、人物關係、矛盾與未解線索，產出可驗證的 bible JSON 與 Markdown。當使用者要求故事聖經、情節時間線、角色關係圖、矛盾檢查、未收回伏筆，或在 novel-characters 之後補情節層資料時使用。
---

# 小說情節聖經

將本 `SKILL.md` 所在資料夾記為 `<SKILL_DIR>`。本技能不重做外貌、音色或圖像提示詞；先有通過驗證的 `<書名>-cast.json`。

需要 Node.js 18 以上，無 npm 依賴，也不建立長期資料庫。

## 成果契約

- `<書名>-bible.json`：時間線、關係、矛盾、線索。
- `<書名>-bible.md`：方便閱讀的版本。

每一條事件、關係、矛盾與線索都必須帶原文逐字 `evidence`。沒有引文就不要寫。

## 工作流程

### 1. 確認輸入

需要：

- 原文 `<book.txt>`
- 已通過 `novel-characters` `validate` 的 `<書名>-cast.json`

不要覆寫 `cast.json`。使用獨立的 `<書名>-bible.json`。

### 2. 讀取規格

先讀：

- `references/extract-pass.md`
- `references/schema.md`

預設只使用 `cast.json` 裡已有的角色名稱與別名。不要發明新主角來撐關係圖。

### 3. 寫出 bible

建立 `<書名>-bible.json`。長篇先按 `novel-characters` 的 `chunk --chapters` 或 `chunk --parts N` 分段觀察，再合併成一份 bible；每一段的發現都要能回到原文引文。

### 4. 驗證與渲染

```bash
node "<SKILL_DIR>/scripts/novel-bible.mjs" validate "<書名>-bible.json" "<book.txt>" "<書名>-cast.json"
node "<SKILL_DIR>/scripts/novel-bible.mjs" render "<書名>-bible.json" --md > "<書名>-bible.md"
```

有錯誤就修正，不得刪引文或放寬規則來換取通過。

## 邊界

- 不取代 `novel-characters`。
- 不在本技能內做即時編輯器、向量資料庫或角色聊天記憶。
- 分析欄位使用台灣繁體中文；`evidence` 永遠保留原文。
- 建議強度不得高於引文所能支撐的範圍。

## 自測

```bash
node "<SKILL_DIR>/scripts/selftest.mjs"
```

自測不得呼叫模型。
