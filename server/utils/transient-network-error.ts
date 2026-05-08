const TRANSIENT_NET_ERRORS = new Set([
  'ECONNRESET',
  'EPIPE',
  'ERR_STREAM_WRITE_AFTER_END',
]);

export function isTransientNetworkError(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  if (typeof code === 'string' && TRANSIENT_NET_ERRORS.has(code)) return true;
  const message = (error as { message?: string } | null)?.message;
  if (typeof message === 'string') {
    for (const transientCode of TRANSIENT_NET_ERRORS) {
      if (message.includes(transientCode)) return true;
    }
  }
  return message === 'Session ID unknown';
}
