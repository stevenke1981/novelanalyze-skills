# 可選：音色試聽

`voice.prompt` 與 `voice.promptZh` 仍是正式成果。音檔是可選人工檢查，**不是** `validate` 通過條件。

## 範圍

- 預設只為 `protagonist` 與 `major` 做試聽。
- 每段大約 5 秒，唸一句無劇透、無專有名詞的中性句子。
- 保留字幕或文字稿；沒有 TTS 工具就維持 `NOT_RUN`。

```bash
node "<SKILL_DIR>/scripts/novel-characters.mjs" voice-preview "<書名>-cast.json" --out voice-preview.json
```

## 不要做的事

- 不要把整本小說送到外部 TTS。
- 不要因為缺少音檔而讓角色卡驗證失敗。
- 不要用名人聲音當參考。
