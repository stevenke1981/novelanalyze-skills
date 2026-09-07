# 材料格式 v1

所有檔案 UTF-8；JSON 是本技能的交接格式，只有 `requests/*.json` 是 Fish HTTP body。不要把整份 audiobook 或 manifest 當成 API request。

## audiobook.json

頂層欄位：

| 欄位 | 規則 |
| --- | --- |
| schema_version | 固定 `1` |
| title / language | 書名／例如 `zh-TW`，語言是材料中繼資料 |
| scope | `{complete, included, excluded}`；complete 指是否取得並分析整本書 |
| source_file | `source.txt` |
| chapters | `[{id,title}]`，ID 唯一 |
| voices | `[{id,name,voice_description,description_basis,reference_id}]`；最後一欄為真實 Fish 聲音 ID 或 null |
| segments | 下表；陣列按原文順序排列 |
| pronunciation | `[{original,reading,reason,segment_ids,status}]`；status 為 confirmed 或 needs_review |
| issues | 尚待確認的配音／涵蓋範圍問題，不可隱藏 |

每段欄位：

| 欄位 | 規則 |
| --- | --- |
| id / order / chapter_id | 安全 ID 如 `ch001-s0001`；全書 order 從 1 連續遞增 |
| kind | narration、dialogue、thought 或 omit |
| speaker_id | voices 中的 ID；omit 或尚未判定時 null |
| attribution | `{status,evidence,candidates}`；status confirmed 或 needs_review，evidence 引用上下文並說明判斷 |
| source_start / source_end | 原檔 UTF-16 code unit offset，0-based，半開區間，不先正規化 CRLF 或 Unicode |
| source_text | 必須等於原檔 slice(start,end)；包含原有引號及空白 |
| spoken_text | 不含演出標記的朗讀正文；omit 時空字串 |
| edits | `[{from,to,reason}]`；依序對 source_text 套用，每次替換第一個吻合位置，結果必須等於 spoken_text |
| direction | `{cue,reason}`；cue 空字串或單一中括號自然語言提示；中性用空字串 |
| tts_text | 此版本固定 `direction.cue + spoken_text`，omit 時空字串 |
| pause_after_ms | 非負整數，後製靜音，不放進 Fish body；不要當實際音訊時長 |

原文所有字元都由 segments 覆蓋，包含空白。標題預設由旁白朗讀；若指定省略，用 omit 段保存原文，edits 記錄移除原因。空白可跟相鄰段落合併。需要精確時間戳時等音檔產生後測量，不能從字數捏造字幕時間。

## manifest.json

頂層 `{schema_version:1, model:"s2-pro", endpoint:"https://api.fish.audio/v1/tts", headers:{"Content-Type":"application/json","model":"s2-pro"}, items:[...]}`。Authorization 僅在執行端從本地秘密設定注入，不輸出 key。

每個非 omit 段對應一項 `{segment_id,order,status,request_file,text_file,output_file,pause_after_ms,blocked_reasons}`。

- status 只用 ready 或 blocked；ready 代表材料可送出，不代表音檔存在。
- request_file：ready 為 `requests/ch001-s0001.json`；blocked 為 null。
- text_file：`text/ch001-s0001.txt`；內容等於 tts_text。
- output_file：`audio/ch001-s0001.wav`，為預計路徑。
- 聲音缺失、歸屬或影響朗讀的發音尚待確認時 blocked。
- ID 限英數與連字號；所有檔案路徑禁止絕對路徑、`..`、反斜線、Windows 保留名稱，且不含原文或角色名構成的任意路徑。

實際合成器應按 order 取 ready 項，但章節組裝遇 blocked 必須停止或明確標記不完整，不得略過後聲稱整章完成。逐段生成才能獨立重製台詞；狀態、檔案存在與音訊解碼分開記錄。
