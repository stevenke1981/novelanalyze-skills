# Fish S2 Pro 對接

2026-09-07 查核官方 [TTS API](https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech) 與 [模型說明](https://docs.fish.audio/developer-guide/models-pricing/models-overview)。實際生成前再次確認所用服務支援 `s2-pro`；不得自動換模型。

## 預設：一段一個聲音

HTTP `POST https://api.fish.audio/v1/tts`，headers 包含 `model: s2-pro`、`Content-Type: application/json` 與執行時注入的 Bearer authentication。model 放 header，聲音放 body 的 `reference_id`。

每個 ready 段的 body：

```json
{
  "text": "[whisper]你終於回來了。",
  "reference_id": "REPLACE_WITH_REAL_VOICE_ID",
  "format": "wav",
  "sample_rate": 44100
}
```

此處 ID 只示意，不能原樣輸出成 ready 請求。未綁聲時不產生可提交 body。聲線文字描述不能取代 reference_id。保留 WAV 方便後製，其他格式由使用者選擇。不要把 pause_after_ms、speaker_id 或導演備註加入 API body。

S2 Pro 用 `[whisper]` 等中括號自然語言提示；不是 S1 的小括號語法。提示效果需試聽，無法保證精確停頓或情緒強度。材料預設把提示放段首；需要句中情緒轉折時另切段。

## 選用：同請求多人對話

只在使用者要多人單次合成時額外輸出此格式，保留原本逐段材料方便定位及重製。`reference_id` 為有序聲音 ID 陣列，正文用 `<|speaker:0|>`、`<|speaker:1|>` 對應陣列索引；索引是此請求的局部索引，不是角色 ID。

```json
{
  "text": "<|speaker:0|>門開了。<|speaker:1|>[whisper]你終於回來了。",
  "reference_id": ["REAL_NARRATOR_ID", "REAL_CHARACTER_ID"],
  "format": "wav",
  "sample_rate": 44100
}
```

以上為模板，所有聲音確認才可提交。多人請求另存 `dialogue-requests/`，另附 batch 到 segment ID 的對照及預計音檔路徑，不把 batch 音檔冒充逐段音檔；不能再依逐段 pause_after_ms 在批次音檔內直接插靜音。

## 自架或參考音訊

本文 JSON 針對 Fish 雲端端點。自架 Fish Speech 先核對該部署的介面，不假設 URL、模型 header 或參數相容。只有本地參考 WAV 時，先交付檔案路徑、逐字 transcript、角色對應及授權狀態，標記聲音未綁定；不要把 Windows 路徑當成 reference_id，也不要把音訊任意編碼塞進此 JSON 範本。

## 請求與驗收邊界

產出材料不會上傳原文、建立聲音或消耗 Fish 額度。實際提交是另一階段；確認確切批次與費用授權後執行一次。逾時或回應不明時先查現有結果，不自動再送。HTTP 成功不等於音訊有效：核對非空檔案、實際格式、完整解碼與試聽角色、漏句、重句及發音後，才標示音檔完成。
