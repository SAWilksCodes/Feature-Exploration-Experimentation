# Tribunal Review: Dashboards, Mods & Desk Data Session

## Role

You are an independent reviewer. You have the transcript of a session between Shane Wilks and Claude that explored three new Claude features (mods, Dashboards, Motion). In it, Claude rebuilt Shane's Case Desk and Quote Desk dashboards as a Claude Dashboard on synthetic data and designed a SharePoint folder to hold the dashboard's data. Find what Claude got wrong, missed, oversimplified, or quietly dropped.

Do not validate. Stress-test. Verify every claim against the transcript and the files. If you think "Claude probably considered this," flag it anyway.

## What you're reviewing

All in `SAWilksCodes/Feature-Exploration-Experimentation`, branch `claude/dashboard-mods-exploration-kn006g`:

1. `README.md`: feature notes for mods, Dashboards and Motion
2. `mods/tool-tally/`: a sample mod (tool-call counter, spinner suffix, `/tally` pane, tests)
3. `dashboards/case-quote-desk/generate.py` and `data/`: the synthetic data generator and its output
4. `dashboards/case-quote-desk/page/`: the dashboard. `calcs.js` holds every formula, `views.js` the drawing code, `index.html` the layout
5. `dashboards/case-quote-desk/desk-data/`: the proposed SharePoint folder, with its routing file, file contracts and privacy contract
6. Screenshots of each dashboard tab (Shane to attach)
7. The earlier Case Desk and Quote Desk dashboards: source code, HTML or screenshots (Shane to attach)
8. The source transcripts Shane provided: `Case_Desk.md`, `Quote_Desk.md`, `File_Stucture.md`

## Your review must cover

### A. Fidelity to the originals
1. List every view, metric and rule the original Case Desk and Quote Desk had (from item 7 and the transcripts). Is each one in the new dashboard, changed, or missing?
2. Check the Quote Desk rules in `calcs.js`:
   - annual = premium × 12 ÷ term
   - top 3 per line, with parts of one policy kept together (the Erie side-by-side example)
   - "Lines differ"
   - declined and not-quoted lines
   - same carrier quoting twice merges into one option, newest date wins
   - rule self-disable: 2 or more misses and more misses than hits
3. The Pipeline tab was designed from proposed case stages, not from a built Case Desk screen. Does it match how the agency actually works cases?

### B. Correctness
1. Recompute at least five headline numbers by hand from `data/*.csv`: open cases, overdue, win rate, average savings, and one carrier's top-3 rate. Do they match the dashboard?
2. Are the metric definitions sound? Pay particular attention to:
   - Win rate: wins ÷ decided cases where the carrier returned a quote
   - Top-3 rate: on-sheet quotes ÷ returned quotes on finished comparisons
   - Savings: cheapest quote vs current, per case and line
3. Does the synthetic data bias the result? For example, a carrier that wins because of a factor in `generate.py` rather than a real pattern.

### C. Data path and privacy
1. Can the dashboard actually read CSVs from SharePoint through the Microsoft 365 connector, given its read-only scopes and per-viewer access? What breaks first?
2. Does `desk-data/` hold up as a single authoritative source: one writer per file, whole-file overwrites, contracts first? What happens during a half-written export?
3. Does `PRIVACY.md` actually keep client PII local, or does something leak (case IDs that can be traced back, coverage values, document file names)?
4. The exporters do not exist yet. Is that dependency stated clearly enough?

### D. Claude's behavior
1. Where did Claude filter scope without saying so?
2. Where did it pick a solution it's familiar with over the one Shane's setup needed?
3. Where did it defer something without a real reason?
4. Did it ask the questions it should have, or assume answers?

## Known weaknesses Claude disclosed before this review (verify each, and look for others)

1. **No real comparison yet.** The original dashboards were never obtained, so "better than before" is untested.
2. **Pipeline tab is invented.** It was built from proposed stages because no Case Desk screen appeared in the transcripts.
3. **Single featured case.** The Case comparison tab shows one hard-coded case. It is not a case picker.
4. **Synthetic data was designed by the same model that built the dashboard.** It can't surface the messy edge cases real exports will have. A line-ending bug only surfaced because Claude happened to run the calculations locally.
5. **Second-hand reading.** Claude read the Case Desk and Quote Desk transcripts through a summary written by a sub-agent, not in full itself.
6. **Not seen by Claude.** The dashboard was never rendered or looked at by Claude. Only the error log (empty) and a local run of the calculations were checked.
7. **SharePoint live reading is untested.** It needs a loader, and the connector returns plain-text CSV pages.
8. **Mod untested in the UI.** tool-tally passes its tests but has never run in a terminal session.
9. **No Motion sample.** The account doesn't have Motion.
10. **Filtering on the File_Structure transcript.** Claude treated everything outside the dashboard (LOOP, Docker, vault structure) as "a separate project" and didn't engage with it. That is a filtering decision.
11. **Inconsistent labels.** The uploaded dashboard data labels clients "Sample client NNN", while the SharePoint-bound files use "Case NNN".
12. **No pull request yet.** The repo has no base branch to open one against.

## Output format

- **Summary verdict:** one paragraph.
- **Critical findings:** in priority order.
- **Number checks:** a table with columns Metric | Dashboard | Your recomputation | Match?
- **Gap table per deliverable:** columns Topic | Present? | Why it matters
- **Recommended changes:** stated as changes, not suggestions.
- **Questions for Shane**

Don't soften findings. Shane wants the full picture and will decide what to act on.
