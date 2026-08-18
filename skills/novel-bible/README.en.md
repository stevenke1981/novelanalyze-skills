[繁體中文（台灣）](README.md) · **English**

# novel-bible

Add a source-grounded timeline, relationship list, contradiction log, and open-thread list on top of a validated `cast.json`. This skill does not generate images or rewrite character appearance.

```bash
node scripts/novel-bible.mjs validate book-bible.json book.txt cast.json
node scripts/novel-bible.mjs render book-bible.json --md > book-bible.md
```
