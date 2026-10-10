# quotes.csv

**Writer:** Quote Desk exporter · **One row per current policy line and per carrier quote request**.

| Column | Type | Allowed values / format |
| --- | --- | --- |
| quote_id | text | Unique |
| case_id | text | Must exist in cases.csv |
| line | text | home, renters, condo, dwelling_fire, mobile_home, flood, auto, motorcycle, rv, boat, umbrella, life, commercial, other |
| role | text | current, quote |
| carrier | text | Liberty and Safeco are written as `Liberty Mutual` |
| status | text | current: `in_force`. quote: success, declined, not_quoted, referred |
| term_months | integer | 6 or 12 |
| quoted_premium | number | As quoted for the term; empty unless success or in_force |
| annual_premium | number | quoted_premium × 12 ÷ term_months |
| quote_date | date | `YYYY-MM-DD` |
| rank_in_line | integer | 1 = cheapest annual among successful quotes for the case and line; empty otherwise |
| on_sheet | text | yes, no. Current rows are always yes; quotes are yes when in the top 3 on the comparison sheet |
