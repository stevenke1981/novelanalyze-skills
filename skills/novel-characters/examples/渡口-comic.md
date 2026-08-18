# 渡口 · 漫畫版圖片組設定

- 規格版本：1.0
- 範圍：custom
- 模式：comic

## 全案視覺聖經

民國年間江南渡口的水墨淡彩漫畫美術，線條克制、色彩低飽和，人物造型樸素並保留生活磨損。

| 項目 | 設定 |
| --- | --- |
| 畫風層級 | Hand-drawn ink-wash comic character design with clean confident linework, flat-to-wash colour, and no photorealism. |
| 構圖系統 | Orthographic comic model-sheet framing with even graphic composition. |
| 分鏡語言 | Flat graphic perspective for reference sheets and mild cinematic panel depth for narrative keyframes. |
| 線條與材質 | Visible ink line weight, paper grain, restrained cel-to-wash colouring, and graphic fabric folds. |
| 光線 | Even graphic lighting for reference sheets and soft ink-wash atmosphere for narrative panels. |
| 色彩 | Muted navy, weathered brown, soft cream, cool grey mist, faded rose, and restrained print-ink saturation. |

### 全域反向提示詞

```text
photorealistic, live-action, photograph, 3d render, plastic skin, celebrity likeness, modern styling, moe anime, identity drift, face morphing, text, watermark
```

## 沈知微

**重要度：** protagonist　 **安全檔名：** `沈知微`

### 身份鎖定

| 特徵 | 設定 |
| --- | --- |
| agePresentation | 外觀約十九歲，年輕但不帶幼童感。 |
| genderPresentation | 女性，造型樸素而克制。 |
| ancestryAndRegion | 東亞漢族外觀，符合民國江南水鄉生活背景。 |
| faceGeometry | 窄鵝蛋臉，臉頰柔和，下頜纖細，下巴短而圓。 |
| eyes | 深褐眼睛，眼距自然，眼神警覺且常帶遲疑。 |
| brows | 自然平緩眉形，眉色接近黑髮，眉眼距離固定。 |
| nose | 鼻樑纖細平直，鼻尖小而自然，側面輪廓固定。 |
| mouth | 唇形自然偏薄，唇峰柔和，嘴角慣常微收。 |
| skin | 偏白紙感膚色，以淡彩表現血色，不畫真實毛孔。 |
| hair | 中央分線，兩條長黑辮，辮梢繫褪色紅繩，髮際固定。 |
| body | 身形單薄，肩膀微內收，四肢纖細，站姿帶輕微防備。 |

**必須保持：** 窄鵝蛋臉比例、深褐眼睛與自然眼距、纖細平直鼻形、自然偏薄唇形、中央分線與雙長辮、偏白淡彩膚色、單薄身形與內收肩膀、藏青學生裝與舊皮箱

**禁止出現：** 成熟艷麗妝容、現代髮型或服裝、不同人物的臉部輪廓、真人照片質感

### 漫畫基礎提示詞

```text
A fictional nineteen-year-old Chinese student from the 1930s drawn as a hand-drawn ink-wash comic character, slender build with slightly inward shoulders, narrow oval face, deep brown wary eyes, fine straight nose, naturally thin lips, pale wash skin, centre-parted black hair in two long braids tied with faded red cord, wearing a worn navy student tunic with a plain cream collar and carrying a battered brown leather suitcase.
```

### 角色反向提示詞

```text
photorealistic, live-action, photograph, mature glamorous face, heavy makeup, modern haircut, loose hair, different braid length, different eye spacing, wide jaw, altered nose profile, 3d render, luxury costume, modern suitcase, identity drift
```

### 圖片組

#### 漫畫角色身份固定參考圖表 · `identity-board`

- 比例：16:10
- 輸出：`images/comic/沈知微/01-identity-board.png`
- 狀態：NOT_RUN
- 鏡頭：Orthographic comic model-sheet framing
- 光線：Even graphic lighting with readable ink edges
- 背景：Clean warm-grey paper background

**英文提示詞**

```text
Create a comic identity lock board with front portrait, profile, three-quarter portrait, full body, hairline detail, line-weight detail, and wardrobe detail. Every panel must depict the exact same fictional person.
```

**中文提示詞**

```text
建立專業漫畫身份固定板，包含正面肖像、側面、四分之三肖像、全身、髮際、線條與服裝細節；所有面板必須是完全相同的虛構人物。
```

**反向提示詞**

```text
different person, identity drift, face morphing, photorealistic, live-action, photograph, 3d render, plastic skin, modern clothing, extra fingers, text, watermark
```

**驗收**

- 所有畫面可辨識為同一位人物。
- 臉部輪廓、髮型與畫風沒有漂移。
- 服裝、配件與身形比例保持連戲。

#### 漫畫中性立繪 · `neutral-portrait`

- 比例：4:5
- 輸出：`images/comic/沈知微/02-neutral-portrait.png`
- 狀態：NOT_RUN
- 鏡頭：Orthographic comic model-sheet framing
- 光線：Even graphic lighting with readable ink edges
- 背景：Clean warm-grey paper background

**英文提示詞**

```text
Create a neutral chest-up comic portrait of the approved fictional person, relaxed mouth, direct gaze, clean ink-wash colour, and unchanged identity.
```

**中文提示詞**

```text
建立胸上中性漫畫立繪，嘴部放鬆、直視鏡頭、保留清楚淡彩層次，人物身份不得改變。
```

**反向提示詞**

```text
different person, identity drift, face morphing, photorealistic, live-action, photograph, 3d render, plastic skin, modern clothing, extra fingers, text, watermark
```

**驗收**

- 所有畫面可辨識為同一位人物。
- 臉部輪廓、髮型與畫風沒有漂移。
- 服裝、配件與身形比例保持連戲。

#### 漫畫臉部角度組 · `face-angles`

- 比例：16:10
- 輸出：`images/comic/沈知微/03-face-angles.png`
- 狀態：NOT_RUN
- 鏡頭：Orthographic comic model-sheet framing
- 光線：Even graphic lighting with readable ink edges
- 背景：Clean warm-grey paper background

**英文提示詞**

```text
Create five comic facial views of the approved fictional person: front, left three-quarter, left profile, right three-quarter, and slight upward angle. Keep facial geometry identical.
```

**中文提示詞**

```text
建立五個漫畫臉部角度：正面、左四分之三、左側面、右四分之三與微仰角；輪廓必須完全一致。
```

**反向提示詞**

```text
different person, identity drift, face morphing, photorealistic, live-action, photograph, 3d render, plastic skin, modern clothing, extra fingers, text, watermark
```

**驗收**

- 所有畫面可辨識為同一位人物。
- 臉部輪廓、髮型與畫風沒有漂移。
- 服裝、配件與身形比例保持連戲。

#### 漫畫全身三視圖 · `full-body-turnaround`

- 比例：16:10
- 輸出：`images/comic/沈知微/04-full-body-turnaround.png`
- 狀態：NOT_RUN
- 鏡頭：Orthographic comic model-sheet framing
- 光線：Even graphic lighting with readable ink edges
- 背景：Plain pure white paper background

**英文提示詞**

```text
Create front, left-side, and back full-body comic views of the approved fictional person on one ground line with identical body proportions, costume, and accessories.
```

**中文提示詞**

```text
建立正面、左側面與背面漫畫全身三視圖，共用同一基準線，身形比例、服裝與配件必須一致。
```

**反向提示詞**

```text
different person, identity drift, face morphing, photorealistic, live-action, photograph, 3d render, plastic skin, modern clothing, extra fingers, text, watermark
```

**驗收**

- 所有畫面可辨識為同一位人物。
- 臉部輪廓、髮型與畫風沒有漂移。
- 服裝、配件與身形比例保持連戲。

#### 漫畫表情九宮格 · `expression-grid`

- 比例：16:10
- 輸出：`images/comic/沈知微/05-expression-grid.png`
- 狀態：NOT_RUN
- 鏡頭：Orthographic comic model-sheet framing
- 光線：Even graphic lighting with readable ink edges
- 背景：Clean warm-grey paper background

**英文提示詞**

```text
Create a three-by-three comic expression grid of the approved fictional person: neutral, wary, restrained fear, resolve, doubt, grief, anger, relief, and quiet focus. Change only expression and gaze.
```

**中文提示詞**

```text
建立三乘三漫畫表情格：中性、警覺、克制恐懼、決心、疑惑、悲傷、憤怒、安心與專注；只改表情與視線。
```

**反向提示詞**

```text
different person, identity drift, face morphing, photorealistic, live-action, photograph, 3d render, plastic skin, modern clothing, extra fingers, text, watermark
```

**驗收**

- 所有畫面可辨識為同一位人物。
- 臉部輪廓、髮型與畫風沒有漂移。
- 服裝、配件與身形比例保持連戲。

#### 漫畫服裝與道具板 · `wardrobe-board`

- 比例：16:10
- 輸出：`images/comic/沈知微/06-wardrobe-board.png`
- 狀態：NOT_RUN
- 鏡頭：Orthographic comic model-sheet framing
- 光線：Even graphic lighting with readable ink edges
- 背景：Clean warm-grey paper background

**英文提示詞**

```text
Create a comic wardrobe continuity board showing the approved costume front and back, collar, buttons, braid ties, suitcase, colour blocks, wear marks, and exact palette.
```

**中文提示詞**

```text
建立主要服裝連戲與道具板，呈現正背面、衣領、鈕扣、辮繩、皮箱、色塊、磨損記號與精確色彩。
```

**反向提示詞**

```text
different person, identity drift, face morphing, photorealistic, live-action, photograph, 3d render, plastic skin, modern clothing, extra fingers, text, watermark
```

**驗收**

- 所有畫面可辨識為同一位人物。
- 臉部輪廓、髮型與畫風沒有漂移。
- 服裝、配件與身形比例保持連戲。

#### 漫畫分鏡關鍵畫面 · `cinematic-keyframe`

- 比例：16:9
- 輸出：`images/comic/沈知微/07-cinematic-keyframe.png`
- 狀態：NOT_RUN
- 鏡頭：Mild cinematic comic panel composition
- 光線：Soft ink-wash atmosphere with readable silhouette
- 背景：Misty historical river ferry before dawn

**英文提示詞**

```text
Place the approved fictional comic character at a misty historical river ferry before dawn, holding the worn suitcase close, with restrained dramatic tension and consistent ink-wash styling.
```

**中文提示詞**

```text
將核准的虛構漫畫人物置於黎明前的歷史渡頭薄霧中，緊抱磨舊皮箱，以克制張力與一致水墨淡彩呈現分鏡畫面。
```

**反向提示詞**

```text
different person, identity drift, face morphing, photorealistic, live-action, photograph, 3d render, plastic skin, modern clothing, extra fingers, text, watermark
```

**驗收**

- 所有畫面可辨識為同一位人物。
- 臉部輪廓、髮型與畫風沒有漂移。
- 服裝、配件與身形比例保持連戲。

