class StateManager {
  constructor() {
    this.registrationStates = new Map();
    this.updateStates = new Map();
    this.removalStates = new Map();
    this.startCleanup();
  }

  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      const timeout = 30 * 60 * 1000;

      for (const [userId, state] of this.registrationStates.entries()) {
        if (now - state.timestamp > timeout) this.registrationStates.delete(userId);
      }
      for (const [userId, state] of this.updateStates.entries()) {
        if (now - state.timestamp > timeout) this.updateStates.delete(userId);
      }
      for (const [userId, state] of this.removalStates.entries()) {
        if (now - state.timestamp > timeout) this.removalStates.delete(userId);
      }
    }, 5 * 60 * 1000);
  }

  setRegistrationState(userId, data) {
    this.registrationStates.set(userId, { ...data, timestamp: Date.now() });
  }

  getRegistrationState(userId) {
    return this.registrationStates.get(userId);
  }

  clearRegistrationState(userId) {
    this.registrationStates.delete(userId);
  }

  setUpdateState(userId, data) {
    this.updateStates.set(userId, { ...data, timestamp: Date.now() });
  }

  getUpdateState(userId) {
    return this.updateStates.get(userId);
  }

  clearUpdateState(userId) {
    this.updateStates.delete(userId);
  }

  setRemovalState(userId, data) {
    this.removalStates.set(userId, { ...data, timestamp: Date.now() });
  }

  getRemovalState(userId) {
    return this.removalStates.get(userId);
  }

  clearRemovalState(userId) {
    this.removalStates.delete(userId);
  }
}

export default new StateManager();
