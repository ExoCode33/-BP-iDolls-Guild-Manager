class StateManager {
  constructor() {
    this.states = new Map();
    this.ttl = 30 * 60 * 1000;
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  cleanup() {
    const now = Date.now();
    for (const [key, state] of this.states) {
      if (now - state.timestamp > this.ttl) {
        this.states.delete(key);
      }
    }
  }

  set(userId, type, data) {
    this.states.set(`${userId}:${type}`, { ...data, timestamp: Date.now() });
  }

  get(userId, type) {
    return this.states.get(`${userId}:${type}`);
  }

  clear(userId, type) {
    this.states.delete(`${userId}:${type}`);
  }

  update(userId, type, data) {
    const current = this.get(userId, type) || {};
    this.set(userId, type, { ...current, ...data });
  }
}

export default new StateManager();
