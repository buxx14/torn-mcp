export class KeyManager {
  private keys: string[];
  private index: number;
  private lastCall: Map<string, number>;

  constructor(keys: string[]) {
    this.keys = keys.filter(Boolean);
    if (this.keys.length === 0) throw new Error("No API keys provided");
    this.index = 0;
    this.lastCall = new Map();
  }

  async getKey(): Promise<string> {
    const key = this.keys[this.index % this.keys.length];
    this.index++;

    // Enforce 650ms minimum gap per key
    const now = Date.now();
    const last = this.lastCall.get(key) || 0;
    const wait = Math.max(0, 650 - (now - last));
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));

    this.lastCall.set(key, Date.now());
    return key;
  }

  get keyCount(): number {
    return this.keys.length;
  }

  get primaryKey(): string {
    return this.keys[0];
  }
}
