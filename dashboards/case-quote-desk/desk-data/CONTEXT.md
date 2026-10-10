# Desk Data

The one authoritative home for the numbers the Case & Quote Desk dashboard shows.

## What lives here

| Folder | What it is | Who writes it | Who reads it |
| --- | --- | --- | --- |
| `current/` | The five export files, always the latest | Case Desk and Quote Desk exporters only | The dashboard (read-only), people |
| `contracts/` | What each file must contain: columns, types, allowed values | People, by hand | Exporters, the dashboard, agents |
| `snapshots/` | Optional dated copies of `current/`, never edited | Exporters | People, for history |

## Rules

1. **One writer per file.** Only the exporter named in its contract writes it. Nothing else edits `current/`.
2. **Overwrite whole files.** An exporter writes the full file each time. It never appends a row or edits in place.
3. **Contracts first.** A column is added to the contract before an exporter starts writing it.
4. **No copies elsewhere.** Other folders link here and keep no copy of these files.
5. **Case ID is the join key.** Every file that refers to a case uses `case_id` in the form `Q-` plus 16 hex characters.

## Where to go

- What a file contains → `contracts/<file>.md`
- The latest numbers → `current/`
- How things looked on a past date → `snapshots/<YYYY-MM-DD>/`

## Status

`current/` holds **synthetic test data**. Replace it with real exports only after the privacy decision is made (see `contracts/PRIVACY.md`).
