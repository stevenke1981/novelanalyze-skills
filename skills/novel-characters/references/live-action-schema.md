# 真人版圖片組資料結構

真人版圖片組使用獨立 sidecar JSON，不改動既有 `cast.json` 的卡通形象欄位。檔名建議為 `<書名>-live-action.json`。

## 頂層

```json
{
  "version": "1.0",
  "source": "渡口",
  "mode": "live-action",
  "scope": "main",
  "styleBible": {},
  "characters": []
}
```

| 欄位 | 必填 | 說明 |
| --- | --- | --- |
| `version` | 是 | 固定為 `1.0` |
| `source` | 是 | 對應 `cast.json.source` |
| `mode` | 是 | 固定為 `live-action` |
| `scope` | 是 | `main`、`all` 或 `custom` |
| `styleBible` | 是 | 全案共用視覺、攝影、材質、色彩與連戲規則 |
| `characters` | 是 | 一位以上的真人角色圖片組 |

## 全案視覺聖經

```json
{
  "styleBible": {
    "visualWorld": "民國年間江南渡口的真人電影美術……",
    "realityLevel": "Photorealistic cinematic live-action ...",
    "capture": {
      "cameraSystem": "Full-frame digital cinema camera ...",
      "lensLanguage": "Eighty-five millimetre portraits ...",
      "texture": "Natural skin texture, visible pores ...",
      "lighting": "Motivated soft daylight ...",
      "colorScience": "Muted navy, weathered brown ..."
    },
    "continuityPolicy": {
      "approvedReferenceFirst": true,
      "reuseSeedWhenSupported": true,
      "identityReferenceWeight": "high",
      "wardrobeReferenceWeight": "high",
      "locked": ["facial width-to-height ratio"],
      "variable": ["facial expression", "body pose", "camera angle"]
    },
    "globalNegativePrompt": "illustration, anime, 3d render, plastic skin, identity drift ..."
  }
}
```

- `visualWorld` 使用台灣繁體中文。
- `realityLevel`、`capture.*` 與 `globalNegativePrompt` 使用英文。
- `identityReferenceWeight` 與 `wardrobeReferenceWeight` 只接受 `low`、`medium`、`high`。
- `locked` 至少六項，`variable` 至少三項。

## 單一角色

```json
{
  "name": "沈知微",
  "aliases": ["姑娘"],
  "importance": "protagonist",
  "slug": "沈知微",
  "identityLock": {},
  "performance": {},
  "wardrobe": {},
  "basePrompt": "A fictional nineteen-year-old Chinese student ...",
  "basePromptZh": "虛構的十九歲民國女學生……",
  "characterNegativePrompt": "glamorous makeup, modern hairstyle, identity drift ...",
  "shots": []
}
```

`name`、`aliases` 與 `importance` 必須能在 `cast.json` 找到；`slug` 必須等於 CLI 產生的安全檔名：

```bash
node "<SKILL_DIR>/scripts/live-action-image-set.mjs" slug "<角色名>"
```

### `identityLock`

下列字串欄位全部使用台灣繁體中文，且不可為空：

- `agePresentation`
- `genderPresentation`
- `ancestryAndRegion`
- `faceGeometry`
- `eyes`
- `brows`
- `nose`
- `mouth`
- `skin`
- `hair`
- `body`

另外包含：

- `distinctiveMarks`：至少一項可辨識細節。
- `mustRemain`：至少六項不可變特徵。
- `mustNotAppear`：至少三項禁止出現的漂移或錯誤。

### `performance`

全部使用台灣繁體中文：

```json
{
  "defaultExpression": "安靜而警覺……",
  "gaze": "多數時間避開正面對視……",
  "posture": "肩膀微內收……",
  "movement": "動作幅度小而克制……"
}
```

### `wardrobe`

```json
{
  "primary": "主要服裝完整描述……",
  "palette": ["藏青", "米白"],
  "materials": ["低光澤棉布", "磨損皮革"],
  "continuityNotes": "所有圖片維持相同衣領寬度、鈕扣數量……"
}
```

### 基礎提示詞

- `basePrompt`：英文，描述不受鏡位影響的真人身份、身形、髮型與主要服裝。
- `basePromptZh`：對應台灣繁體中文版。
- `characterNegativePrompt`：英文，排除該角色特別容易發生的身份漂移。
- 三者都不得出現角色名或別名。

## 單張圖片

```json
{
  "id": "identity-board",
  "title": "角色身份固定參考圖表",
  "required": true,
  "aspectRatio": "16:10",
  "resolutionHint": "At least 3072 by 1920 pixels",
  "framing": "Professional multi-panel identity reference board",
  "camera": "Eighty-five millimetre equivalent ...",
  "lighting": "Neutral soft studio light ...",
  "background": "Light warm-grey seamless background",
  "prompt": "Create a professional live-action character identity lock board ...",
  "promptZh": "建立專業的真人角色身份固定參考圖表……",
  "negativePrompt": "different people across panels, face morphing ...",
  "output": "images/live-action/沈知微/01-identity-board.png",
  "status": "NOT_RUN",
  "acceptance": [
    "所有面板一眼可辨識為完全相同的人。",
    "臉部骨相、眼距、鼻形與膚色沒有漂移。",
    "服裝與配件細節一致。"
  ]
}
```

| 欄位 | 語言／約束 |
| --- | --- |
| `id` | 七種必要 ID 之一；同一角色內唯一 |
| `title` | 台灣繁體中文 |
| `required` | 七張必要圖片固定為 `true` |
| `aspectRatio` | 依必要圖片規格固定；支援 `1:1`、`3:2`、`2:3`、`4:5`、`5:4`、`16:9`、`16:10`、`9:16` |
| `resolutionHint`、`framing`、`camera`、`lighting`、`background` | 英文 |
| `prompt` | 英文，不含人名、別名、作品名或真人姓名 |
| `promptZh` | 台灣繁體中文，同樣不含人名或別名 |
| `negativePrompt` | 英文，不含人名或別名 |
| `output` | `images/live-action/<slug>/<序號>-<id>.png` |
| `status` | `NOT_RUN`、`PASS` 或 `FAIL` |
| `acceptance` | 至少三條台灣繁體中文驗收條件 |

## 七張必要圖片與固定比例

| ID | 比例 |
| --- | --- |
| `identity-board` | `16:10` |
| `neutral-portrait` | `4:5` |
| `face-angles` | `16:10` |
| `full-body-turnaround` | `16:10` |
| `expression-grid` | `16:10` |
| `wardrobe-board` | `16:10` |
| `cinematic-keyframe` | `16:9` |

## 驗證與稽核

```bash
node "<SKILL_DIR>/scripts/live-action-image-set.mjs" validate "<書名>-live-action.json" "<書名>-cast.json"
node "<SKILL_DIR>/scripts/live-action-image-set.mjs" audit "<書名>-live-action.json" "<輸出目錄>" "<書名>-cast.json"
```

`validate` 檢查結構、語言、必要鏡頭、比例、人名洩漏、輸出路徑、重複圖片與 `cast.json` 對應。`audit` 另外檢查所有標記 `PASS` 的 PNG 是否真的存在且不是空檔案。
