# Feature exploration

Hands-on notes and samples for three new Claude features: **mods**, **Dashboards**, and **Motion**.

## 1. Claude Code mods: `mods/tool-tally`

A mod is a plugin made of JavaScript/TypeScript hooks that run *inside* Claude Code. Unlike settings hooks, skills, or MCP servers, a mod can draw UI (panes, bands above the prompt), restyle Claude Code's own UI, step into tool calls, and add `/commands` that run without a Claude turn. Docs: <https://code.claude.com/docs/en/plugins/mods/overview>

`tool-tally` is a small sample that shows the main pieces working together:

| Piece | What it does | API used |
| --- | --- | --- |
| `tool.call` hook | Counts each tool Claude calls, then lets it run as usual | `on('tool.call')`, `next(e)` |
| Shared state | Keeps the counts per session, typed in `types/index.d.ts` | `atom`, `read`, `update` |
| Spinner | Adds the running count beside the spinner (`Thinking · 7 tool calls…`) | `ui.render` on `Spinner` |
| Status line | Shows `tools: N` | `$.ui.status` |
| `/tally` | Opens a pane with a bar per tool; `/tally text` prints a plain summary | `$.command.register`, `$.ui.open`, `ui.render` on `Pane` |
| Tests | Checks the counting and the summary | `claude plugin test` |

Layout:

```
mods/tool-tally/
├── .claude-plugin/plugin.json   # manifest, names the state contract
├── hooks/hooks.json             # points at the hooks module
├── hooks/register.tsx           # the mod
├── types/index.d.ts             # $.state contract
└── tests/tally.test.ts
```

### Try it

You need Claude Code v2.1.287 or later. Mods draw in a terminal and in the Desktop app's Code tab. Cloud sessions and `claude -p` run the hooks but draw nothing, which is why `/tally` falls back to text there.

Load it for one session from a clone:

```bash
claude --plugin-dir ./mods/tool-tally
```

Or install it from this repo, which is a plugin marketplace:

```
/plugin install tool-tally --marketplace SAWilksCodes/Feature-Exploration-Experimentation
```

Run `/plugin` to confirm you see `1 mod active · tool-tally`. Ask Claude to do something, watch the spinner, then run `/tally`.

### Check it

```bash
claude plugin validate mods/tool-tally   # lists what it hooks and calls
claude plugin test mods/tool-tally       # 2 pass
```

### Ideas to try next

- Use `blast-radius` as a model for a guard that holds risky Bash commands and asks before running them.
- Add a band above the prompt with `ui.render` on `AbovePrompt`.
- Ask Claude in any session to "make a mod that…". The built-in `plugin-authoring` skill writes it and hot-reloads it.
- Look at the samples in `anthropics/claude-code-playground/claude-code/mods`: `token-weather`, `blast-radius`, and `replay-theater`.

## 2. Claude Dashboards

In chat, describe a question about your data. Claude writes the query behind each chart and shows its source and freshness. Dashboards are in beta on Pro, Max, Team, and Enterprise plans. Docs: <https://support.claude.com/en/articles/17454700-get-started-with-claude-dashboards>

Sample built in this session: **GitHub repo activity**, a private artifact. It has KPI tiles, a chart of last-push dates by month, and a searchable, sortable table of every repo. The data is a CSV snapshot attached to the dashboard.

What I learned:

- Data sources are either **live queries** on a connector (BigQuery, Snowflake, Databricks, Redshift, ClickHouse, Salesforce, Supabase, …) or **attached files** (CSV/TSV/JSON up to 8 MB).
- A live query runs with each reader's own access whenever the dashboard opens, so it stays current.
- Every number on the page is tied to a dataset or a named calculation. Readers can open **Sources** to see the query or formula and download the rows as CSV.
- Refine it by chatting, for example "add a filter for public repos" or "switch to weekly".
- Enterprise owners must turn it on in Organization settings → Artifacts.

The sample uses a file because all three Supabase projects on this account are paused. Restore one and the dashboard could switch to a live SQL query.

## 3. Claude Motion

Motion makes short animations as code, such as explainers, animated charts, and walkthroughs, and exports them as MP4. It is not a video-generation model, so it can't make realistic footage or people. Because the animation is code, you can change one word, number, or timing and leave the rest unchanged. Docs: <https://support.claude.com/en/articles/17454997-get-started-with-claude-motion>

- **Plans:** beta on **Team** (on by default) and **Enterprise** (an owner turns it on in Organization settings → Artifacts).
- **To create one:** pick Output → Motion in a chat, or pick a Motion template in the Artifacts tab.
- **Tip:** say who the audience is, where it will play, and how long it should be. Attach the data or images you want in it.

This account's artifact types list Dashboard, Design, Design System, Docs, and Slides, but not Motion. That fits Motion being Team/Enterprise only, so I couldn't build a sample here.
