// State manager to prevent memory leaks from never-cleaned Maps
// Automatically expires states after 15 minutes of inactivity

class StateManager {
  constructor() {
    this.registrationStates = new Map();
    this.updateStates = new Map();
    this.removalStates = new Map();
    this.expirationTime = 15 * 60 * 1000; // 15 minutes
    
    // Auto-cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
    
    console.log('✅ State Manager initialized with auto-cleanup');
  }

  // Registration states
  setRegistrationState(userId, state) {
    this.registrationStates.set(userId, {
      ...state,
      timestamp: Date.now()
    });
  }

  getRegistrationState(userId) {
    const state = this.registrationStates.get(userId);
    if (!state) return null;
    
    // Check if expired
    if (Date.now() - state.timestamp > this.expirationTime) {
      this.registrationStates.delete(userId);
      return null;
    }
    
    return state;
  }

  clearRegistrationState(userId) {
    this.registrationStates.delete(userId);
  }

  // Update states
  setUpdateState(userId, state) {
    this.updateStates.set(userId, {
      ...state,
      timestamp: Date.now()
    });
  }

  getUpdateState(userId) {
    const state = this.updateStates.get(userId);
    if (!state) return null;
    
    // Check if expired
    if (Date.now() - state.timestamp > this.expirationTime) {
      this.updateStates.delete(userId);
      return null;
    }
    
    return state;
  }

  clearUpdateState(userId) {
    this.updateStates.delete(userId);
  }

  // Removal states
  setRemovalState(userId, state) {
    this.removalStates.set(userId, {
      ...state,
      timestamp: Date.now()
    });
  }

  getRemovalState(userId) {
    const state = this.removalStates.get(userId);
    if (!state) return null;
    
    // Check if expired
    if (Date.now() - state.timestamp > this.expirationTime) {
      this.removalStates.delete(userId);
      return null;
    }
    
    return state;
  }

  clearRemovalState(userId) {
    this.removalStates.delete(userId);
  }

  // Clear all states for a user
  clearAllStates(userId) {
    this.clearRegistrationState(userId);
    this.clearUpdateState(userId);
    this.clearRemovalState(userId);
  }

  // Cleanup expired states
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    // Clean registration states
    for (const [userId, state] of this.registrationStates.entries()) {
      if (now - state.timestamp > this.expirationTime) {
        this.registrationStates.delete(userId);
        cleaned++;
      }
    }

    // Clean update states
    for (const [userId, state] of this.updateStates.entries()) {
      if (now - state.timestamp > this.expirationTime) {
        this.updateStates.delete(userId);
        cleaned++;
      }
    }

    // Clean removal states
    for (const [userId, state] of this.removalStates.entries()) {
      if (now - state.timestamp > this.expirationTime) {
        this.removalStates.delete(userId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 [STATE-MANAGER] Cleaned ${cleaned} expired state(s)`);
    }
  }

  // Get statistics
  getStats() {
    return {
      registration: this.registrationStates.size,
      update: this.updateStates.size,
      removal: this.removalStates.size,
      total: this.registrationStates.size + this.updateStates.size + this.removalStates.size
    };
  }

  // Destroy (for graceful shutdown)
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      console.log('🛑 State Manager cleanup interval stopped');
    }
    this.registrationStates.clear();
    this.updateStates.clear();
    this.removalStates.clear();
  }
}

// Export singleton instance
export default new StateManager();
