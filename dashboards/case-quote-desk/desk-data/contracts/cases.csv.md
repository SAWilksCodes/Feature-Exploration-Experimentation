# cases.csv

**Writer:** Case Desk exporter · **One row per case**, every case including closed ones.

| Column | Type | Allowed values / format |
| --- | --- | --- |
| case_id | text | `Q-` + 16 hex, unique |
| client | text | Label only, e.g. `Case 0142` (see PRIVACY.md) |
| lines | text | Case Desk line label: Auto, Auto + Renters, Renters, Home, Home + Auto, Home + Auto + Umbrella, Landlord / Dwelling Fire, Motorcycle / RV / Boat, Life, Commercial, Flood, Other |
| stage | text | intake, needs_review, quoting, compared, client_ready, sold, lost |
| owner | text | Person or `Agent` |
| opened_on | date | `YYYY-MM-DD` |
| stage_since | date | `YYYY-MM-DD`, when it entered its current stage |
| days_open | integer | Days from opened_on to the export date |
| days_in_stage | integer | Days from stage_since to the export date |
| next_action | text | Empty when sold or lost |
| next_action_due | date | `YYYY-MM-DD`, empty when sold or lost |
| current_carrier | text | Carrier of the policy in force |
| won_carrier | text | Set only when stage is sold |
| lost_reason | text | Set only when stage is lost |
