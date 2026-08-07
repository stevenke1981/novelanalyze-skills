# 三視圖產生規格

三視圖是選用成果。只有目前執行環境已提供圖像生成工具時才產生；否則保留 `image.turnaround` 提示詞並明確回報未產圖。不得要求使用者提供 API key，也不得自行改用付費 API。

## Codex

在 Codex 中直接使用 `$imagegen`。不要從 Codex 再呼叫 `codex exec`，避免遞迴工作階段與重複消耗額度。

每次只處理一位角色：

1. 將 `image.turnaround` 作為主要視覺規格。
2. 要求輸出同一角色的正面、側面與背面全身像。
3. 要求三個視角共用同一基準線、身高比例、服裝與配件細節。
4. 使用純白背景、均勻漫射光、無投影，方便後製去背。
5. 將選定成圖複製到 `<輸出目錄>/images/<slug>-turnaround.png`。
6. 用實際檔案存在且可開啟作為完成條件。

建議交給圖像工具的補充指令：

```text
Generate one orthographic character turnaround sheet from the supplied character
specification. Show front, left-side, and back full-body views of the SAME character,
aligned on one ground line with identical proportions, costume, and accessories.
Use a plain pure white background, even diffuse lighting, and no cast shadows.
Save the selected final image to ./images/<slug>-turnaround.png.
```

## OpenCode 或其他環境

- 若目前環境已有可直接使用的圖像工具，依相同規格執行。
- 若沒有圖像工具，跳過 PNG 產生，但仍交付完整的 `image.turnaround` 英文提示詞。
- 不要自動開啟另一個 Codex 工作階段作為隱藏 fallback；需要跨客戶端呼叫時，先取得使用者明確同意。

## 畫風一致性

角色分開生成時容易出現畫風漂移。若圖像工具支援參考圖，將第一張已核准的三視圖提供給後續角色，並追加：

```text
Match the reference image's art style, line weight, shading, palette, and layout.
All characters must look as if they belong to the same production.
```

若第一張尚未核准，不要把它當作整批角色的風格基準。

## 檔名與驗收

使用下列指令建立安全檔名：

```bash
node "<SKILL_DIR>/scripts/novel-characters.mjs" slug "<角色名>"
```

`render` 會從 `images/<slug>-turnaround.png` 尋找檔案，因此必須先完成產圖再產生報告。

每張圖片的驗收狀態只能是：

- `PASS`：檔案存在、可開啟，而且確實包含同一角色的正面、側面與背面。
- `FAIL`：生成結果錯誤或檔案無法開啟。
- `NOT_RUN`：目前環境沒有圖像工具。

單張圖片失敗不阻斷文字成果，但最終報告必須列出失敗或未執行的角色。
