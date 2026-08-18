**繁體中文（台灣）** · [English](README.en.md)

# novel-characters

將小說或短篇故事轉換成可直接投入角色設計、配音、漫畫製作、真人選角與影像製作流程的角色設定集。

- **角色清單**：合併跨章節的正式名稱、稱謂與別名。
- **人物分析**：性別、年齡、身分、外貌、性情、動機、人物弧光與關係，並附逐字原文依據。
- **卡通形象提示詞**：中英雙語角色設計、反向提示詞、風格標籤與三視圖規格。
- **漫畫版圖片組**：獨立 sidecar JSON，包含漫畫身份硬鎖定、視覺聖經、七張必要圖片、服裝連戲與逐張驗收。
- **真人版圖片組**：獨立 sidecar JSON，包含真人身份硬鎖定、視覺聖經、七張必要圖片、服裝連戲與逐張驗收。
- **音色提示詞**：音色、音高、語速、口音、情緒與中英雙語音色設計提示詞。
- **可攜式成果**：`cast.json`、漫畫版 JSON、真人版 JSON、Markdown 與可離線開啟的 `report.html`。
- **圖片生成**：目前環境有圖像工具時，可產生卡通三視圖、漫畫身份固定圖片組與真人身份固定圖片組；沒有工具時仍交付完整提示詞與狀態。

![離線角色報告](assets/report.png)

![角色三視圖](assets/turnaround.jpg)

## 使用方式

先依[儲存庫根目錄說明](../../README.md)完成安裝，再於 Codex 或 OpenCode 中輸入：

```text
$novel-characters 請分析 ./我的小說.txt，輸出角色設定、漫畫版與真人版主要角色圖片組到 ./角色設定
```

OpenCode 可完整執行角色分析、驗證與報告產生；若目前環境沒有圖像工具，技能會交付三視圖、漫畫圖片組與真人圖片組提示詞，並明確標示 `NOT_RUN`。

## 處理流程

1. 依段落將長篇文字切成帶重疊區的分塊，避免角色剛好落在分界而遺漏。
2. 掃描每個分塊，擷取角色名稱、別名、觀察與逐字引文。
3. 依名稱與別名合併角色，並按出現分塊數估算戲份。
4. 為選定角色建立人物、卡通形象與音色設定。
5. 執行確定性驗證，修正所有錯誤後才產生報告。
6. 預設同時另建 `*-comic.json` 與 `*-live-action.json`，不覆寫卡通欄位。
7. 漫畫與真人圖片組都先生成並核准各自的身份固定板，再用同一參考圖生成肖像、臉部角度、三視圖、表情、服裝與敘事關鍵畫面。
8. 稽核所有 `PASS` 圖片真的存在，再輸出 Markdown 與離線 HTML。

每次執行需使用新的空白工作目錄；工具會拒絕混有前次產物的目錄，避免舊角色資料滲入新報告。

## 漫畫版與真人版圖片組

兩種 sidecar 預設都只處理 `protagonist` 與 `major`，每位角色包含同一組七張必要圖片：

| 圖片 | 比例 | 作用 |
| --- | --- | --- |
| 角色身份固定參考圖表 | 16:10 | 核准同一人的臉、身形、髮型、服裝與細節 |
| 中性肖像 | 4:5 | 乾淨胸上試鏡肖像 |
| 臉部角度組 | 16:10 | 核對正面、四分之三與側面骨相 |
| 全身三視圖 | 16:10 | 核對身形比例與服裝連戲 |
| 表情九宮格 | 16:10 | 只改表情，不改身份 |
| 主要服裝與材質板 | 16:10 | 固定版型、色值、磨損與道具 |
| 敘事關鍵畫面 | 16:9 | 驗證人物進入故事場景後仍不換臉 |

漫畫版輸出到 `images/comic/<slug>/`，真人版輸出到 `images/live-action/<slug>/`。完整規格見 `references/comic-image-set.md`、`references/comic-schema.md`、`references/live-action-image-set.md` 與 `references/live-action-schema.md`。

## 驗證規則

| 規則 | 目的 |
| --- | --- |
| `persona.evidence` 必須是原文中的連續逐字片段 | 防止虛構或拼接引文 |
| 卡通、漫畫與真人影像提示詞不得出現角色名稱或別名 | 避免模型被名稱記憶與既有 IP 偏誤影響 |
| 分析欄位使用台灣繁體中文，模型提示詞依欄位使用英文 | 維持穩定、可重用的輸出格式 |
| `importance` 僅接受四種列舉值 | 保護資料結構相容性 |
| 漫畫版與真人版七張必要圖片、固定比例與輸出路徑必須完整 | 確保能直接交給製作流程 |
| 圖片 `PASS` 必須對應真實非空 PNG | 避免把送出生成誤報為完成 |

逐字引文不做繁簡轉換，確保永遠能與來源文字比對。

## CLI

```bash
node scripts/novel-characters.mjs chunk book.txt workdir
node scripts/novel-characters.mjs merge workdir
node scripts/novel-characters.mjs validate cast.json book.txt
node scripts/novel-characters.mjs render cast.json --html
node scripts/novel-characters.mjs slug "胡二爺"

node scripts/comic-image-set.mjs validate book-comic.json cast.json
node scripts/comic-image-set.mjs render book-comic.json --md
node scripts/comic-image-set.mjs audit book-comic.json output-directory cast.json
node scripts/live-action-image-set.mjs validate book-live-action.json cast.json
node scripts/live-action-image-set.mjs render book-live-action.json --md
node scripts/live-action-image-set.mjs audit book-live-action.json output-directory cast.json
node scripts/live-action-image-set.mjs slug "胡二爺"
```

## 限制

- 單次最多 24 個分塊，約 33 萬字元；超出時會回報 `truncated: true`。
- 預設只為 `protagonist` 與 `major` 建立三視圖、漫畫圖片組與真人圖片組。
- 角色分開產圖時仍可能發生身份或畫風漂移；漫畫與真人模式都必須先核准各自的 `identity-board`，並作為其他圖片的主參考。
- 沒有圖像工具時不會產生 PNG，但 JSON、Markdown、HTML、三視圖提示詞與兩套圖片組設定仍可正常交付。

## 自測

```bash
node scripts/selftest.mjs
node scripts/comic-selftest.mjs
node scripts/live-action-selftest.mjs
```

自測涵蓋分塊、別名合併、資料驗證、台灣繁體中文檢查、Markdown／HTML 渲染、漫畫與真人身份設定、必要圖片、人名洩漏與圖片檔案稽核；不呼叫模型，也不消耗模型額度。
