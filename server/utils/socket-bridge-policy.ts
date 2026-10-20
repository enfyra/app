export function isSocketBridgeOriginAllowed(
  origin: string | undefined,
  cors: { loaded: boolean; origins: string[] },
) {
  if (!origin) return true;
  if (!cors.loaded) return false;
  return cors.origins.length === 0 || cors.origins.includes(origin);
}

export class SocketBridgeBuffer {
  private readonly messages: Array<string | Buffer> = [];
  private bytes = 0;

  constructor(
    private readonly maxMessages: number,
    private readonly maxBytes: number,
  ) {}

  push(data: string | Buffer) {
    const bytes = typeof data === "string" ? Buffer.byteLength(data) : data.byteLength;
    if (
      this.messages.length >= this.maxMessages ||
      this.bytes + bytes > this.maxBytes
    ) {
      return false;
    }
    this.messages.push(data);
    this.bytes += bytes;
    return true;
  }

  drain() {
    const messages = this.messages.splice(0);
    this.bytes = 0;
    return messages;
  }

  clear() {
    this.messages.length = 0;
    this.bytes = 0;
  }
}
