# Optional BookNLP English pre-scan

BookNLP is an English literary NLP pipeline. It can emit character name clusters, limited coreference, and quote speakers. This adapter **does not install BookNLP** and is **not for Chinese novels**.

Use it only when:

1. The source text is English.
2. BookNLP has already been run outside this skill.
3. You want a first-pass `roster-NN.json` before the usual roster / profile passes.

## Convert existing output

```bash
node "<SKILL_DIR>/scripts/adapters/booknlp-to-roster.mjs" book.entities --quotes book.quotes --out roster-00.json
```

The converter reads the public BookNLP table shape:

- `.entities`: coref, start, end, NOM/PROP/PRON, category, text
- `.quotes` (optional): quote span, mention span, mention text, coref, quote text

It keeps `PER` mentions that are not pronouns, uses the most frequent surface form as `name`, and copies quote strings unchanged.

## After conversion

1. Inspect aliases. BookNLP still treats full book coreference as an open problem.
2. Continue with `merge`, `select`, `harvest-quotes`, and the normal profile pass.
3. `validate` still requires verbatim evidence from the novel text.

Do not add Python, PyTorch, or `pip install booknlp` to this skill's installer.
