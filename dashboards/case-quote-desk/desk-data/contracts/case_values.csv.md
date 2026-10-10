# case_values.csv

**Writer:** Quote Desk exporter · **One row per extracted coverage value**, for cases with a comparison.

| Column | Type | Allowed values / format |
| --- | --- | --- |
| case_id | text | Must exist in cases.csv |
| role | text | current, quote |
| carrier | text | As in quotes.csv |
| line | text | As in quotes.csv |
| field | text | Coverage name, e.g. `Liability (BI/PD)`, `Dwelling`, `Deductible` |
| value | text | As printed on the sheet, e.g. `250/500/100`, `$1,000` |
| source | text | document, calculated, confirm |
| document | text | Source file name; empty when calculated |
| page | integer | Page in that document; empty when calculated |
