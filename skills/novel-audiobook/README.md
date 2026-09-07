# 小說有聲書製作材料

將小說製作成 Fish Audio S2 Pro 的逐段配音材料，保留原文依據、旁白、角色對白與內心話。可獨立分析小說，也能沿用 novel-characters 的角色卡。

```text
$novel-audiobook 分析 ./我的小說.txt，以忠於原文的多人有聲書方式輸出到 ./有聲書材料，目標 Fish S2 Pro；先產出材料，不生成音訊。
```

成果包含 `audiobook.json`、可讀配音稿、每段 TTS 文字、Fish 請求 JSON、音檔順序清單與發音表。沒有真實聲音 ID 時仍完成文本材料，相關請求標記 blocked；綁定聲音後可補齊 ready 請求。

這是代理執行的分析 skill，沒有內建 API 呼叫器或音訊合成器。分析依目前工作階段模型完成，Fish 生成費用需另外授權。見 [SKILL.md](SKILL.md) 與 [短篇範例](examples/README.md)。
