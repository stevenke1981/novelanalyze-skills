# Deterministic evals

這些夾具檢查**確定性契約**，不呼叫模型、不消耗額度。

| 指令 | 目的 |
| --- | --- |
| `skills/novel-characters/scripts/selftest.mjs` | 單元測試驗證器、合併、渲染 |
| `evals/eval.mjs` | 公開領域短篇的引文對齊、截斷標記、選角與書名洩漏 |

模型抽取品質（有沒有漏掉角色）不在這裡評分。若要加模型評測，另開腳本且預設跳過。

## 夾具

| 檔案 | 來源 | 授權 |
| --- | --- | --- |
| `fixtures/peach-blossom-spring.txt` | 陶淵明〈桃花源記〉全文 | 公開領域 |
| `fixtures/alice-excerpt.txt` | Lewis Carroll, *Alice's Adventures in Wonderland* (1865) 開頭節錄 | 公開領域 |

對應的 `*.gold.json` 只標：應在原文出現的角色名、至少一條逐字引文、是否預期 `truncated`。
