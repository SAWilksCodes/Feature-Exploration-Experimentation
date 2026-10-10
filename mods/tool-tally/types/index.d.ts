export type Tally = Record<string, number>

declare module 'claude-code' {
  interface PluginState {
    'tool-tally': { counts: Tally }
  }
}
