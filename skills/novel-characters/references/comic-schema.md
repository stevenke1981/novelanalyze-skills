# 漫畫版圖片組資料結構

漫畫版圖片組使用與真人版相同的 sidecar JSON 結構，只改 `mode`、視覺聖經語彙與輸出目錄。不要改動既有 `cast.json` 的卡通形象欄位。檔名建議為 `<書名>-comic.json`。

完整欄位、語言約束與七張必要圖片比例見 `live-action-schema.md`。本文件只記錄漫畫版差異。

## 頂層差異

```json
{
  "version": "1.0",
  "source": "渡口",
  "mode": "comic",
  "scope": "main",
  "styleBible": {},
  "characters": []
}
```

| 欄位 | 漫畫版約束 |
| --- | --- |
| `mode` | 固定為 `comic` |
| `styleBible.visualWorld` | 台灣繁體中文，描述漫畫美術世界，不是電影寫實 |
| `styleBible.realityLevel` | 英文，描述畫風層級，例如 ink-wash comic、clean line art |
| `styleBible.capture.*` | 英文；欄位名稱沿用，語意改為構圖、分鏡、線條、平塗／淡彩 |
| `styleBible.globalNegativePrompt` | 英文，必須排除真人寫實、照片、3D 與明星臉 |
| 單張 `output` | `images/comic/<slug>/<序號>-<id>.png` |

## 全案視覺聖經語彙

漫畫版仍使用同一組 `capture` 欄位，但寫法必須是漫畫製作規格：

| 欄位 | 真人版語意 | 漫畫版語意 |
| --- | --- | --- |
| `realityLevel` | 寫實層級 | 畫風層級 |
| `capture.cameraSystem` | 攝影機系統 | 構圖／設定圖機位 |
| `capture.lensLanguage` | 鏡頭語言 | 分鏡與透視語言 |
| `capture.texture` | 皮膚與實物材質 | 線條、紙感、平塗或淡彩 |
| `capture.lighting` | 實拍光線 | 色面、網點或水墨光影 |
| `capture.colorScience` | 電影調色 | 漫畫限色與印墨色彩 |

`continuityPolicy` 與真人版相同：先核准身份固定板，身份與服裝參考權重預設為 `high`。

## 七張必要圖片

必要 ID 與比例與真人版相同，標題改為漫畫製作用語：

| ID | 建議標題 | 比例 |
| --- | --- | --- |
| `identity-board` | 漫畫角色身份固定參考圖表 | `16:10` |
| `neutral-portrait` | 漫畫中性立繪 | `4:5` |
| `face-angles` | 漫畫臉部角度組 | `16:10` |
| `full-body-turnaround` | 漫畫全身三視圖 | `16:10` |
| `expression-grid` | 漫畫表情九宮格 | `16:10` |
| `wardrobe-board` | 漫畫服裝與道具板 | `16:10` |
| `cinematic-keyframe` | 漫畫分鏡關鍵畫面 | `16:9` |

`cinematic-keyframe` 這個 ID 為了與真人版共用驗證器而保留；漫畫版內容必須是分鏡畫面，不得寫成真人電影劇照。

## 驗證與稽核

```bash
node "<SKILL_DIR>/scripts/comic-image-set.mjs" validate "<書名>-comic.json" "<書名>-cast.json"
node "<SKILL_DIR>/scripts/comic-image-set.mjs" render "<書名>-comic.json" --md > "<書名>-comic.md"
node "<SKILL_DIR>/scripts/comic-image-set.mjs" audit "<書名>-comic.json" "<輸出目錄>" "<書名>-cast.json"
```

`live-action-image-set.mjs` 也可驗證 `mode=comic` 的檔案；兩個 CLI 共用同一套確定性引擎。
