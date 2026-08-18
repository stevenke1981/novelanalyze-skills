**繁體中文（台灣）** · [English](README.en.md)

# novel-bible

在已驗證的 `cast.json` 之上整理時間線、人物關係、矛盾與未解線索。本技能不產圖、不重寫角色外貌。

## 使用

先跑完 `novel-characters` 的角色卡驗證，再在代理中呼叫：

```text
$novel-bible 請依 ./渡口.txt 與 ./渡口-cast.json 產出情節聖經到 ./角色設定
```

```bash
node scripts/novel-bible.mjs validate book-bible.json book.txt cast.json
node scripts/novel-bible.mjs render book-bible.json --md > book-bible.md
```

## 限制

- 每條紀錄都要有原文逐字引文。
- 關係兩端必須是角色卡裡的名稱或別名。
- 不內建資料庫或聊天記憶。
