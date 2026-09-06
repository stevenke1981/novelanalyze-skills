# Bible 結構

```json
{
  "version": "1.0",
  "source": "渡口",
  "cast": "渡口-cast.json",
  "timeline": [],
  "relationships": [],
  "contradictions": [],
  "threads": []
}
```

| 欄位 | 必填 | 說明 |
| --- | --- | --- |
| `version` | 是 | 必須是 `1.0` |
| `source` | 是 | 書名，且應與 `cast.json.source` 一致 |
| `cast` | 否 | 對應角色卡檔名，方便人工對照 |
| `timeline` | 是 | 事件陣列，可為空 |
| `relationships` | 是 | 關係陣列，可為空 |
| `contradictions` | 是 | 矛盾陣列，可為空 |
| `threads` | 是 | 未解／已解線索陣列，可為空 |

`timeline`、`relationships`、`contradictions`、`threads` 合計至少一條。所有 `id` 必須在各自陣列內唯一；`timeline.order` 也必須唯一，避免排序不穩定或事件互相覆蓋。

## timeline[]

| 欄位 | 說明 |
| --- | --- |
| `id` | 陣列內唯一的穩定短 id，例如 `t01` |
| `order` | 陣列內唯一的正整數，愈小愈早 |
| `when` | 台灣繁體中文時間／場景 |
| `what` | 台灣繁體中文事件 |
| `who` | 角色名陣列，必須能在 cast 的 name／aliases 找到 |
| `evidence` | 原文逐字片段陣列，至少一條 |

## relationships[]

| 欄位 | 說明 |
| --- | --- |
| `from` / `to` | 角色名或別名 |
| `relation` | 台灣繁體中文關係 |
| `evidence` | 原文逐字片段 |

## contradictions[] / threads[]

| 欄位 | 說明 |
| --- | --- |
| `id` | 各自陣列內唯一的穩定短 id |
| `summary` 或 `name` | 台灣繁體中文 |
| `status` | contradictions：`open` / `resolved` / `disputed`；threads：`open` / `resolved` |
| `evidence` | 原文逐字片段 |

Markdown renderer 會轉義模型產生內容中的 HTML 與 Markdown 控制字元，避免角色名、事件文字或引文被解讀成可執行標記。
