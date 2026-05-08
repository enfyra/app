import { buildWebsocketEventSavePayload } from '~/utils/websocket-events'

describe('buildWebsocketEventSavePayload', () => {
  it('keeps an updated event attached to the current gateway', () => {
    const payload = buildWebsocketEventSavePayload(
      {
        id: 'event-1',
        eventName: 'message',
        gateway: { id: 'stale-gateway', path: '/stale' },
        scriptLanguage: 'unknown',
        sourceCode: '$ctx.$socket.reply("ok")',
      },
      'gateway-1',
    )

    expect(payload.gateway).toBe('gateway-1')
    expect(payload.scriptLanguage).toBe('typescript')
    expect(payload.compiledCode).toBeNull()
    expect(payload.sourceCode).toBe('$ctx.$socket.reply("ok")')
  })
})
