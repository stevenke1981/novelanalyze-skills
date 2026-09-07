# 最小材料範例

`source.txt` 是本技能的原創短篇範例。`audiobook.json` 示範旁白、兩位角色、內心話、忠實朗讀與逐字跨度；`manifest.json` 和 `text/` 是對應交付材料。

沒有真實聲音 ID，所有音訊請求都 blocked，因此不建立 `requests/` 或假音檔。這是可驗證的文字材料，不是已合成有聲書。提供真實聲音 ID 後，依 `references/fish-s2-pro.md` 為各段建立 body 並更新 manifest；不使用假 ID 來規避待辦。
