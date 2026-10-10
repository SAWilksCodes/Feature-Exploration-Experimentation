# parser_weeks.csv

**Writer:** Quote Desk exporter, from `learning.json` · **One row per carrier per week**, Monday start.

| Column | Type | Allowed values / format |
| --- | --- | --- |
| week | date | Monday, `YYYY-MM-DD` |
| carrier | text | As in quotes.csv |
| fields_extracted | integer | Fields extracted on sheets generated that week |
| fields_overridden | integer | Of those, fields the user edited before generating |
| fields_to_confirm | integer | Values flagged amber that week |
