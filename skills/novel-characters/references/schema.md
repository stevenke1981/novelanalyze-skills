# 角色卡結構

`cast.json` 頂層：

```json
{
  "source": "渡口",
  "summary": "民國年間的清晨，一條河的渡口濃霧未散。擺渡四十年的老船伕照常開船，先後上船的是……",
  "characters": [ /* 角色卡 */ ]
}
```

| 頂層欄位 | 必填 | 說明 |
| --- | --- | --- |
| `source` | 是 | 書名/篇名，報告標題用 |
| `summary` | 是 | **故事摘要**，使用台灣繁體中文撰寫 3–5 句。交代時空背景、核心情境與人物相遇原因，讓讀者不看原文也能理解角色關係。不要劇透結局，也不要寫成推薦文 |
| `characters` | 是 | 角色卡陣列 |

`summary` 缺失會被 `validate` 判為違規——報告頂部會空著。

單張角色卡：

```json
{
  "name": "老周",
  "aliases": ["老伯"],
  "importance": "major",
  "oneLiner": "在渡口擺渡四十年的老船伕，一隻眼睛是白的。",

  "persona": {
    "gender": "男",
    "ageRange": "約七十歲（推斷）",
    "identity": "渡口船伕",
    "appearance": "背駝得像一張拉滿的弓。左眼被風沙磨得只剩一層白翳。……",
    "personality": ["沉默", "耐性", "老練"],
    "temperament": "開口時嗓子裡像卡著半口江水，含混、發沉。……",
    "motivation": "把船開過去。霧再厚也照常開船。",
    "arc": "靜止。他是這條河的一部分。",
    "relationships": [{ "name": "沈知微", "relation": "向他問路的年輕渡客" }],
    "evidence": ["霧一厚，連自己的手都看不清。"]
  },

  "image": {
    "style": "Flat vector cartoon with ink-wash colouring",
    "prompt": "Character design sheet of an elderly Chinese ferryman ...",
    "promptZh": "角色設定圖：約七十歲的中國老船伕……",
    "negativePrompt": "photorealistic, 3d render, young face, ...",
    "tags": ["flat vector", "character sheet", "ink wash palette"],
    "turnaround": "Orthographic character turnaround model sheet: three full-body views ..."
  },

  "voice": {
    "timbre": "沙啞低沉的男中低音，喉音重",
    "pitch": "低",
    "pace": "緩慢，字與字之間拖著氣口",
    "accent": "南方水鄉口音，尾音含混",
    "emotion": "疲憊而平靜",
    "prompt": "An elderly male voice, around seventy-five. Low bass-baritone ...",
    "promptZh": "約七十五歲的老年男聲。低音區男中低聲部……",
    "referenceHint": "像一個在同一個渡口喊了四十年「開船」的人"
  }
}
```

## 欄位約束

| 欄位 | 型別 | 語言 | 說明 |
| --- | --- | --- | --- |
| `name` | string | 原文 | 原文裡用得最多的稱呼；同一份角色清單內必須唯一 |
| `aliases` | string[] | 原文 | 其他稱謂；職業名詞（如「貨郎」）歸 `identity`，不進這裡 |
| `importance` | enum | — | `protagonist` / `major` / `supporting` / `minor`，**只能這四個** |
| `oneLiner` | string | 台灣繁體中文 | 一句話抓住這個人 |
| `persona.*` | — | **台灣繁體中文** | 除 `evidence` 外皆使用台灣繁體中文。`personality` 3–5 個詞 |
| `persona.evidence` | string[] | 原文 | **逐字引用**，沒有就空陣列 |
| `image.style` | string | 英文 | 畫風一句話 |
| `image.prompt` | string | **英文** | 卡通角色設定圖；**禁止出現人名** |
| `image.promptZh` | string | 台灣繁體中文 | 上面那條的繁體中文版；**同樣禁止人名** |
| `image.negativePrompt` | string | **英文** | 逗號分隔 |
| `image.tags` | string[] | **英文** | 4–8 個風格標籤 |
| `image.turnaround` | string | **英文** | 正/側/背三視圖；**禁止出現人名** |
| `voice.timbre/pitch/pace/accent/emotion/referenceHint` | string | **台灣繁體中文** | 最容易誤寫成英文或簡體中文的欄位 |
| `voice.prompt` | string | **英文** | 給 TTS 音色設計引擎 |
| `voice.promptZh` | string | 台灣繁體中文 | 上面那條的繁體中文版 |

## 漫畫版與真人版圖片組 sidecar

漫畫製作包與真人／寫實／電影化設定**都不直接塞進角色卡**。完成 `cast.json` 後，預設同時另建兩份 sidecar：

- `comic-image-set.md` / `comic-schema.md`：漫畫身份鎖定、七張必要圖片與產圖驗收。
- `live-action-image-set.md` / `live-action-schema.md`：真人身份鎖定、七張必要圖片與產圖驗收。

這樣可以同時保留既有卡通提示詞、三視圖與報告相容性，又能平行提供漫畫與真人兩套製作圖：身份固定板、臉部角度、表情、服裝連戲與敘事關鍵畫面。

## 驗證

`scripts/novel-characters.mjs validate <cast.json> <book.txt>` 會檢查：結構完整性、`importance` 列舉、**引文逐字**、**出圖提示詞不含人名**、**語言分工**與**台灣繁體中文欄位**。違規時逐條列出並以結束碼 1 結束。

漫畫版與真人版 sidecar 另用：

```bash
node scripts/comic-image-set.mjs validate <comic.json> <cast.json>
node scripts/comic-image-set.mjs audit <comic.json> <output-directory> <cast.json>
node scripts/live-action-image-set.mjs validate <live-action.json> <cast.json>
node scripts/live-action-image-set.mjs audit <live-action.json> <output-directory> <cast.json>
```
