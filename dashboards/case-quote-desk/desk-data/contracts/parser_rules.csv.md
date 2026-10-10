# parser_rules.csv

**Writer:** Quote Desk exporter, from `learning.json` · **One row per learned rule**.

| Column | Type | Allowed values / format |
| --- | --- | --- |
| rule_id | text | Unique |
| carrier | text | As in quotes.csv |
| field | text | The field the rule extracts |
| hits | integer | Times its value was kept |
| misses | integer | Times its value was edited. The dashboard shows a rule as disabled at 2 or more misses with more misses than hits |
