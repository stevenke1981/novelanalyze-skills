# 第二階段 · 生成角色卡

你是在為一部動畫或視覺改編準備製作素材。給你一個角色的名字、合併後的全部觀察記錄、以及可引用的原文片段，產出一張完整的角色卡。

**只輸出 JSON，不要任何解釋、不要 markdown 圍欄。** 結構見 `schema.md`。

## 強制規則

1. **一切基於觀察記錄。** 為了讓設定可用而不得不補全的部分，要跟原文保持一致，並且**標註出來**——中文欄位加「（推斷）」，英文欄位加 `(inferred)`。**只用一種標記，不要中英都加。**

2. **語言分工。** 除了以下欄位使用英文，其餘分析內容一律使用**台灣繁體中文**：`image.prompt`、`image.negativePrompt`、`image.tags`、`image.turnaround`、`voice.prompt`。（`image.style` 可使用英文。）`promptZh` 系列是對應英文的台灣繁體中文版。
   特別注意：`voice.timbre` / `pitch` / `pace` / `accent` / `emotion` / `referenceHint` **必須是台灣繁體中文**。`persona.evidence` 是逐字引文，不得轉換原文字體。

3. **`persona.evidence` 只能放「可引用原文」區塊裡的字串，逐字照抄。** 不得翻譯、不得裁剪、不得把兩條合併、不得從觀察記錄裡另找。那個區塊是空的就返回空陣列。

4. **`image.prompt` / `image.promptZh` / `image.turnaround` 裡絕對不得出現角色名、別名、作者名、作品名。** 影像模型對這些偏見極重，會畫成它記憶裡的角色而不是你的角色。描述這個人，不要叫他的名字。

5. `image.prompt` 是**卡通角色設定圖**：純背景、全身或半身、剪影可辨、表情有戲。要寫明畫風、線條質感、配色、光照、構圖、表情。

6. `image.turnaround` 是**三視圖設定表**：同一個角色的正視 / 側視 / 背視三個全身像並排，共用一條地平線，三個視角的身高比例和服裝細節完全一致，中性站姿、雙臂自然下垂，**純白背景**（`plain pure white background`）、均勻漫射光、無投影，方便後期摳圖。畫風配色跟 `image.prompt` 保持同一個人。

7. `voice.prompt` 是給 TTS 音色設計引擎的：描述**樂器本身**，不是某一句台詞的演繹。包含性別、聽感年齡、音色、音高區間、共鳴、氣聲、語速、節奏、口音、能量與預設情緒。

8. **同一批角色之間要能區分開。** 會給你同批其他角色的名字，不要把他們的長相和聲線做成一個樣。

9. **真人版設定另行建立。** 即使使用者要求真人版，也不要把本角色卡的卡通 `image.*` 欄位改成真人寫實，否則會破壞既有報告與工具相容性。先完成本角色卡與 `cast.json`，再依 `live-action-image-set.md` 與 `live-action-schema.md` 建立獨立 `<書名>-live-action.json`。

## 輸入格式

```
Character: 老周
Also referred to as: 老伯、擺渡人
Other characters in this cast: 沈知微、陸行遠、胡二爺

Observations gathered from the source text:
1. ...
2. ...

Verbatim quotes — the ONLY strings allowed in `persona.evidence`:
- ...
- ...
```
