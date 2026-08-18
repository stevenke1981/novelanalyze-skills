# 可選：七張圖當一致序列生成

預設仍是先核准 `identity-board`，再逐張帶參考圖生成。若目前環境的圖像工具支援長序列一致注意力（例如 StoryDiffusion 一類後端），可以把七張必要圖當成**同一條序列**一次送出。

## 不變的契約

- shot id、比例、輸出路徑與 `PASS` 檔案規則都不變。
- 沒有這類後端時，維持逐張生成；未產圖就標 `NOT_RUN`。
- 不要為了序列生成改 `cast.json` 或省略身份固定板。

## 建議順序

1. `identity-board`
2. `neutral-portrait`
3. `face-angles`
4. `full-body-turnaround`
5. `expression-grid`
6. `wardrobe-board`
7. `cinematic-keyframe`

至少送 5–6 條 prompt。可用確定性指令組出完整提示詞：

```bash
node "<SKILL_DIR>/scripts/comic-image-set.mjs" compose-sequence "<書名>-comic.json" --character "沈知微"
node "<SKILL_DIR>/scripts/live-action-image-set.mjs" compose-sequence "<書名>-live-action.json"
```

每條實際 prompt 的順序是：畫風／攝影 → `basePrompt` → 該張 `shot.prompt` → 以核准身份固定板為最高優先 → 全域／角色／單張反向提示詞。

## 限制

序列一致能降低換臉，但不能取代 `audit` 的 PNG、比例與身份雜湊檢查。情緒愈強，身份愈容易漂；`expression-grid` 失敗時不要把其餘六張也標成通過。
