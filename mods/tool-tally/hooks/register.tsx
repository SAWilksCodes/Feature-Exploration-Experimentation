import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Tally } from '../types'

const PANE = 'tool-tally'
const counts = atom({ plugin: 'tool-tally', key: 'counts' } as const, {} as Tally)

const total = (tally: Tally) => Object.values(tally).reduce((sum, n) => sum + n, 0)

// Tools sorted by how often Claude called them, most first
const ranked = (tally: Tally) => Object.entries(tally).sort((a, b) => b[1] - a[1])

const summary = (tally: Tally) => {
  const rows = ranked(tally)
  if (rows.length === 0) return 'No tool calls yet.'
  return [`${total(tally)} tool calls this session:`, ...rows.map(([tool, n]) => `  ${tool}: ${n}`)].join('\n')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'tally',
      description: 'Show how many times Claude called each tool (add "text" for a plain summary)',
    })
    return next(e)
  })

  on('command.run', { command: 'tally' }, async ($, e) => {
    const tally = await read($, counts)
    if (e.args.trim() === 'text') return { text: summary(tally) }

    const { isPlaced } = await $.ui.open({ id: PANE, title: 'Tool tally' })
    // Where nothing draws (cloud session, claude -p), fall back to text
    return { text: isPlaced ? 'Tool tally pane opened.' : summary(tally) }
  })

  // Count every tool call, then let it run as usual
  on('tool.call', async ($, e, next) => {
    await update($, counts, tally => ({ ...tally, [e.tool]: (tally[e.tool] ?? 0) + 1 }))
    const tally = await read($, counts)
    $.ui.status(`tools: ${total(tally)}`)
    $.ui.invalidate('ui.render')
    return next(e)
  })

  // Keep Claude Code's spinner, with the running count after its word
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    const n = total(await read($, counts))
    return next({ ...e, props: { ...e.props, suffix: ` · ${n} tool call${n === 1 ? '' : 's'}…` } })
  })

  // The pane: one bar per tool, scaled to the busiest tool
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const rows = ranked(await read($, counts))
    const width = Math.max(10, (e.viewport?.columns ?? 60) - 24)
    const top = rows[0]?.[1] ?? 1

    return (
      <Box flexDirection="column">
        {rows.length === 0 && <Text dimColor>No tool calls yet.</Text>}
        {rows.map(([tool, n]) => (
          <Text>
            {tool.padEnd(14).slice(0, 14)} {'█'.repeat(Math.max(1, Math.round((n / top) * width)))} {n}
          </Text>
        ))}
      </Box>
    )
  })
}
