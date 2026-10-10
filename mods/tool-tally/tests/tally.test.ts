import { expect, test } from 'claude-code/testing'
import type { CommandRunInput } from 'claude-code'

const tally = (args: string): CommandRunInput => ({
  command: 'tally',
  args,
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 80 },
})

test('counts tool calls by tool and reports them', async ($, on) => {
  // Stand in for the engine: every tool call succeeds, the status line takes anything
  on('tool.call', async () => ({ result: 'ok' }))
  on('ui.status', async () => ({ value: undefined }))

  await $.tool.call({ tool: 'Read', file_path: 'a.md' })
  await $.tool.call({ tool: 'Read', file_path: 'b.md' })
  await $.tool.call({ tool: 'Bash', command: 'ls' })

  const { text } = await $.command.run(tally('text'))
  expect(text).toBe('3 tool calls this session:\n  Read: 2\n  Bash: 1')
})

test('says so when nothing has run', async $ => {
  const { text } = await $.command.run(tally('text'))
  expect(text).toBe('No tool calls yet.')
})
