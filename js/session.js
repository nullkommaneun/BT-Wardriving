export class SessionManager {
  constructor(onNewSession = ()=>{}) {
    this.counter = 0;
    this.currentId = null;
    this.lastPacketTs = 0;
    this.timeoutMs = 180000; // 3 Minuten
    this.onNewSession = onNewSession;
  }
  _buildId() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    this.counter += 1;
    return `${y}${m}${day}-${this.counter}`;
  }
  ensureActiveSession(now = Date.now()) {
    if (!this.currentId || (now - this.lastPacketTs) > this.timeoutMs) {
      this.currentId = this._buildId();
      this.onNewSession(this.currentId);
    }
    this.lastPacketTs = now;
    return this.currentId;
  }
}
