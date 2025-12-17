/**
 * Advanced Performance Monitor
 * 
 * Features:
 * - Real-time memory & CPU tracking with accurate readings
 * - Automatic performance optimization
 * - Memory leak detection with root cause analysis
 * - Performance degradation alerts
 * - Automatic cleanup recommendations
 * - Health scoring system
 * - Performance history & analytics
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = [];
    this.maxHistorySize = 120; // 2 hours at 1min intervals
    this.monitorInterval = null;
    this.isMonitoring = false;
    
    // Store previous CPU usage for accurate calculation
    this.previousCPU = null;
    this.previousTime = null;
    
    // Thresholds (MB)
    this.thresholds = {
      memory: {
        warning: parseInt(process.env.MEMORY_WARNING_THRESHOLD) || 150,
        critical: parseInt(process.env.MEMORY_CRITICAL_THRESHOLD) || 200,
        gc: parseInt(process.env.MEMORY_GC_THRESHOLD) || 175
      },
      cpu: {
        warning: 70, // 70% CPU usage
        critical: 90  // 90% CPU usage
      }
    };
    
    // Health tracking
    this.health = {
      score: 100,
      status: 'Excellent',
      issues: []
    };
    
    // Performance stats
    this.stats = {
      startTime: Date.now(),
      peakMemory: 0,
      peakCPU: 0,
      avgMemory: 0,
      avgCPU: 0,
      gcTriggers: 0,
      warnings: 0,
      criticals: 0,
      alerts: [],
      recommendations: [],
      uptime: '0s',
      metricsCollected: 0
    };
    
    // Leak detection
    this.leakDetection = {
      enabled: true,
      threshold: 5, // MB increase per 10 readings
      consecutiveIncreases: 0,
      lastCheck: 0
    };
    
    // Performance trends
    this.trends = {
      memory: 'stable',
      cpu: 'stable',
      health: 'stable'
    };
  }

  // ============================================================================
  // MONITORING
  // ============================================================================

  /**
   * Start monitoring with configurable interval
   */
  startMonitoring(intervalMs = 60000) {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log(`[PERFORMANCE] Starting monitor - interval: ${intervalMs/1000}s`);
    console.log(`[PERFORMANCE] Memory thresholds: Warning=${this.thresholds.memory.warning}MB | Critical=${this.thresholds.memory.critical}MB | GC=${this.thresholds.memory.gc}MB`);
    
    // Initialize CPU tracking
    this.previousCPU = process.cpuUsage();
    this.previousTime = Date.now();
    
    // Initial reading
    this.recordMetrics();
    
    // Periodic monitoring
    this.monitorInterval = setInterval(() => {
      this.recordMetrics();
      this.analyzePerformance();
      this.updateHealth();
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    
    this.isMonitoring = false;
    console.log('[PERFORMANCE] Monitor stopped');
  }

  /**
   * Record current metrics
   */
  recordMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();
    
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
    const externalMB = Math.round(memUsage.external / 1024 / 1024);
    
    // Calculate accurate CPU percentage
    const cpuPercent = this.calculateCPUPercent(cpuUsage);
    
    const metric = {
      timestamp: Date.now(),
      memory: {
        heapUsed: heapUsedMB,
        heapTotal: heapTotalMB,
        rss: rssMB,
        external: externalMB,
        heapPercent: Math.round((heapUsedMB / heapTotalMB) * 100)
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        percent: cpuPercent
      },
      uptime: Math.round(uptime)
    };
    
    // Add to history
    this.metrics.push(metric);
    this.stats.metricsCollected++;
    
    if (this.metrics.length > this.maxHistorySize) {
      this.metrics.shift();
    }
    
    // Update peaks
    if (heapUsedMB > this.stats.peakMemory) {
      this.stats.peakMemory = heapUsedMB;
    }
    if (cpuPercent > this.stats.peakCPU) {
      this.stats.peakCPU = cpuPercent;
    }
    
    // Update uptime string
    this.stats.uptime = this.formatUptime(Date.now() - this.stats.startTime);
    
    // Check thresholds
    this.checkThresholds(metric);
    
    // Log status
    this.logStatus(metric);
  }

  /**
   * Calculate accurate CPU usage percentage
   */
  calculateCPUPercent(currentCPU) {
    if (!this.previousCPU || !this.previousTime) {
      // First reading, store and return 0
      this.previousCPU = currentCPU;
      this.previousTime = Date.now();
      return 0;
    }
    
    const currentTime = Date.now();
    
    // Calculate microseconds used
    const userDiff = currentCPU.user - this.previousCPU.user;
    const systemDiff = currentCPU.system - this.previousCPU.system;
    const totalCPUMicros = userDiff + systemDiff;
    
    // Calculate wall clock time in microseconds
    const wallClockMicros = (currentTime - this.previousTime) * 1000;
    
    // Calculate percentage (totalCPUMicros / wallClockMicros * 100)
    let cpuPercent = 0;
    if (wallClockMicros > 0) {
      cpuPercent = (totalCPUMicros / wallClockMicros) * 100;
      // Cap at 100%
      cpuPercent = Math.min(Math.round(cpuPercent), 100);
    }
    
    // Update previous values
    this.previousCPU = currentCPU;
    this.previousTime = currentTime;
    
    return cpuPercent;
  }

  /**
   * Log current status
   */
  logStatus(metric) {
    const { memory, cpu } = metric;
    const healthIcon = this.getHealthIcon();
    
    console.log(`[PERFORMANCE] ${healthIcon} Heap: ${memory.heapUsed}MB/${memory.heapTotal}MB (${memory.heapPercent}%) | RSS: ${memory.rss}MB | CPU: ${cpu.percent}% | Health: ${this.health.score}/100`);
  }

  /**
   * Get health icon
   */
  getHealthIcon() {
    if (this.health.score >= 90) return '🟢';
    if (this.health.score >= 70) return '🟡';
    if (this.health.score >= 50) return '🟠';
    return '🔴';
  }

  // ============================================================================
  // THRESHOLD CHECKING & ACTIONS
  // ============================================================================

  /**
   * Check thresholds and take action
   */
  checkThresholds(metric) {
    const { memory, cpu } = metric;
    
    // Memory thresholds
    if (memory.heapUsed >= this.thresholds.memory.critical) {
      this.handleCriticalMemory(memory.heapUsed);
    } else if (memory.heapUsed >= this.thresholds.memory.gc) {
      this.handleHighMemory(memory.heapUsed);
    } else if (memory.heapUsed >= this.thresholds.memory.warning) {
      this.handleWarningMemory(memory.heapUsed);
    }
    
    // CPU thresholds
    if (cpu.percent >= this.thresholds.cpu.critical) {
      this.handleCriticalCPU(cpu.percent);
    } else if (cpu.percent >= this.thresholds.cpu.warning) {
      this.handleWarningCPU(cpu.percent);
    }
  }

  /**
   * Handle critical memory
   */
  handleCriticalMemory(heapUsedMB) {
    this.stats.criticals++;
    this.addAlert('critical', `Critical memory: ${heapUsedMB}MB`, 'Forcing garbage collection');
    
    console.error(`[PERFORMANCE] 🔴 CRITICAL: Memory at ${heapUsedMB}MB (threshold: ${this.thresholds.memory.critical}MB)`);
    
    // Force GC immediately
    this.triggerGarbageCollection('critical');
    
    // Log to logger if available
    if (global.logger) {
      global.logger.logError('Performance', `Critical memory usage: ${heapUsedMB}MB`, null, {
        threshold: this.thresholds.memory.critical,
        action: 'Forced GC'
      });
    }
  }

  /**
   * Handle high memory (trigger preventive GC)
   */
  handleHighMemory(heapUsedMB) {
    console.warn(`[PERFORMANCE] 🟡 High memory: ${heapUsedMB}MB (threshold: ${this.thresholds.memory.gc}MB)`);
    this.triggerGarbageCollection('preventive');
  }

  /**
   * Handle warning memory
   */
  handleWarningMemory(heapUsedMB) {
    this.stats.warnings++;
    this.addAlert('warning', `Memory approaching limit: ${heapUsedMB}MB`, 'Monitor closely');
    
    console.warn(`[PERFORMANCE] ⚠️  Warning: Memory at ${heapUsedMB}MB (threshold: ${this.thresholds.memory.warning}MB)`);
    
    if (global.logger) {
      global.logger.logWarning('Performance', `High memory usage: ${heapUsedMB}MB`, `Threshold: ${this.thresholds.memory.warning}MB`);
    }
  }

  /**
   * Handle critical CPU
   */
  handleCriticalCPU(cpuPercent) {
    this.stats.criticals++;
    this.addAlert('critical', `Critical CPU usage: ${cpuPercent}%`, 'Check for infinite loops');
    
    console.error(`[PERFORMANCE] 🔴 CRITICAL: CPU at ${cpuPercent}% (threshold: ${this.thresholds.cpu.critical}%)`);
    
    if (global.logger) {
      global.logger.logError('Performance', `Critical CPU usage: ${cpuPercent}%`, null, {
        threshold: this.thresholds.cpu.critical
      });
    }
  }

  /**
   * Handle warning CPU
   */
  handleWarningCPU(cpuPercent) {
    this.stats.warnings++;
    this.addAlert('warning', `High CPU usage: ${cpuPercent}%`, 'Monitor performance');
    
    console.warn(`[PERFORMANCE] ⚠️  Warning: CPU at ${cpuPercent}% (threshold: ${this.thresholds.cpu.warning}%)`);
  }

  /**
   * Add alert to history
   */
  addAlert(severity, message, action) {
    this.stats.alerts.unshift({
      severity,
      message,
      action,
      timestamp: Date.now()
    });
    
    // Keep last 20 alerts
    if (this.stats.alerts.length > 20) {
      this.stats.alerts.pop();
    }
  }

  // ============================================================================
  // GARBAGE COLLECTION
  // ============================================================================

  /**
   * Trigger garbage collection
   */
  triggerGarbageCollection(reason = 'manual') {
    if (!global.gc) {
      console.warn('[PERFORMANCE] GC not available (start with --expose-gc flag)');
      return null;
    }
    
    const beforeMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    
    try {
      console.log(`[PERFORMANCE] ♻️  Triggering GC (${reason})...`);
      global.gc();
      
      const afterMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
      const freedMB = beforeMB - afterMB;
      
      this.stats.gcTriggers++;
      console.log(`[PERFORMANCE] ✓ GC complete - Freed ${freedMB}MB (${beforeMB}MB → ${afterMB}MB)`);
      
      return {
        before: beforeMB,
        after: afterMB,
        freed: freedMB
      };
    } catch (error) {
      console.error(`[PERFORMANCE] GC failed: ${error.message}`);
      return null;
    }
  }

  // ============================================================================
  // ANALYSIS & HEALTH
  // ============================================================================

  /**
   * Analyze performance and detect issues
   */
  analyzePerformance() {
    if (this.metrics.length < 10) return;
    
    // Detect memory leaks
    const leak = this.detectMemoryLeak();
    if (leak.detected) {
      this.addRecommendation('memory-leak', leak.message, 'Investigate memory growth pattern');
    }
    
    // Analyze trends
    this.analyzeTrends();
    
    // Check for performance degradation
    this.checkPerformanceDegradation();
  }

  /**
   * Detect memory leaks
   */
  detectMemoryLeak() {
    if (!this.leakDetection.enabled || this.metrics.length < 10) {
      return { detected: false, message: 'Not enough data' };
    }
    
    const recent = this.metrics.slice(-10);
    const first = recent[0].memory.heapUsed;
    const last = recent[recent.length - 1].memory.heapUsed;
    const increase = last - first;
    
    // Check if memory increased significantly
    if (increase > this.leakDetection.threshold) {
      const increasePercent = Math.round((increase / first) * 100);
      
      // Check if it's a consistent increase
      let increasingCount = 0;
      for (let i = 1; i < recent.length; i++) {
        if (recent[i].memory.heapUsed > recent[i-1].memory.heapUsed) {
          increasingCount++;
        }
      }
      
      if (increasingCount >= 7) { // 7 out of 10 readings increased
        this.leakDetection.consecutiveIncreases++;
        
        if (this.leakDetection.consecutiveIncreases >= 3) {
          return {
            detected: true,
            message: `Potential memory leak: ${increase}MB increase (+${increasePercent}%) over last 10 readings`,
            increase,
            increasePercent,
            severity: increasePercent > 20 ? 'high' : 'medium'
          };
        }
      } else {
        this.leakDetection.consecutiveIncreases = 0;
      }
    } else {
      this.leakDetection.consecutiveIncreases = 0;
    }
    
    return { detected: false, message: 'No leak detected' };
  }

  /**
   * Analyze performance trends
   */
  analyzeTrends() {
    if (this.metrics.length < 20) return;
    
    const recent = this.metrics.slice(-20);
    const older = this.metrics.slice(-40, -20);
    
    if (older.length === 0) return;
    
    // Memory trend
    const recentAvgMem = this.average(recent.map(m => m.memory.heapUsed));
    const olderAvgMem = this.average(older.map(m => m.memory.heapUsed));
    const memDiff = recentAvgMem - olderAvgMem;
    
    if (memDiff > 5) {
      this.trends.memory = 'increasing';
    } else if (memDiff < -5) {
      this.trends.memory = 'decreasing';
    } else {
      this.trends.memory = 'stable';
    }
    
    // CPU trend
    const recentAvgCPU = this.average(recent.map(m => m.cpu.percent));
    const olderAvgCPU = this.average(older.map(m => m.cpu.percent));
    const cpuDiff = recentAvgCPU - olderAvgCPU;
    
    if (cpuDiff > 10) {
      this.trends.cpu = 'increasing';
    } else if (cpuDiff < -10) {
      this.trends.cpu = 'decreasing';
    } else {
      this.trends.cpu = 'stable';
    }
  }

  /**
   * Check for performance degradation
   */
  checkPerformanceDegradation() {
    if (this.trends.memory === 'increasing' && this.trends.cpu === 'increasing') {
      this.addRecommendation('degradation', 'Performance degrading', 'Both memory and CPU usage increasing');
    }
  }

  /**
   * Update health score
   */
  updateHealth() {
    if (this.metrics.length === 0) return;
    
    const current = this.metrics[this.metrics.length - 1];
    let score = 100;
    const issues = [];
    
    // Memory score (40 points max)
    const memPercent = (current.memory.heapUsed / this.thresholds.memory.critical) * 100;
    if (memPercent > 90) {
      score -= 40;
      issues.push('Critical memory usage');
    } else if (memPercent > 75) {
      score -= 25;
      issues.push('High memory usage');
    } else if (memPercent > 60) {
      score -= 10;
      issues.push('Elevated memory usage');
    }
    
    // CPU score (30 points max)
    if (current.cpu.percent > 80) {
      score -= 30;
      issues.push('Critical CPU usage');
    } else if (current.cpu.percent > 60) {
      score -= 15;
      issues.push('High CPU usage');
    }
    
    // Trend score (20 points max)
    if (this.trends.memory === 'increasing') {
      score -= 10;
      issues.push('Memory trend increasing');
    }
    if (this.trends.cpu === 'increasing') {
      score -= 10;
      issues.push('CPU trend increasing');
    }
    
    // Leak detection (10 points max)
    if (this.leakDetection.consecutiveIncreases >= 3) {
      score -= 10;
      issues.push('Possible memory leak');
    }
    
    this.health.score = Math.max(0, score);
    this.health.issues = issues;
    
    // Update status
    if (score >= 90) this.health.status = 'Excellent';
    else if (score >= 70) this.health.status = 'Good';
    else if (score >= 50) this.health.status = 'Fair';
    else if (score >= 30) this.health.status = 'Poor';
    else this.health.status = 'Critical';
  }

  /**
   * Add recommendation
   */
  addRecommendation(type, title, description) {
    // Check if recommendation already exists
    const exists = this.stats.recommendations.find(r => r.type === type);
    if (exists) return;
    
    this.stats.recommendations.push({
      type,
      title,
      description,
      timestamp: Date.now()
    });
  }

  // ============================================================================
  // REPORTING
  // ============================================================================

  /**
   * Get comprehensive stats
   */
  getStats() {
    if (this.metrics.length === 0) {
      return { error: 'No metrics available yet' };
    }
    
    const current = this.metrics[this.metrics.length - 1];
    
    // Calculate averages
    this.stats.avgMemory = this.average(this.metrics.map(m => m.memory.heapUsed));
    this.stats.avgCPU = this.average(this.metrics.map(m => m.cpu.percent));
    
    return {
      current: current.memory,
      currentCPU: current.cpu,
      peaks: {
        memory: this.stats.peakMemory,
        cpu: this.stats.peakCPU
      },
      averages: {
        memory: Math.round(this.stats.avgMemory),
        cpu: Math.round(this.stats.avgCPU)
      },
      health: this.health,
      trends: this.trends,
      thresholds: this.thresholds,
      stats: {
        uptime: this.stats.uptime,
        gcTriggers: this.stats.gcTriggers,
        warnings: this.stats.warnings,
        criticals: this.stats.criticals,
        metricsCollected: this.stats.metricsCollected
      },
      alerts: this.stats.alerts.slice(0, 5),
      recommendations: this.stats.recommendations
    };
  }

  /**
   * Generate detailed report
   */
  generateReport() {
    const stats = this.getStats();
    
    if (stats.error) {
      console.log('[PERFORMANCE REPORT] ' + stats.error);
      return stats;
    }
    
    console.log('');
    console.log('═'.repeat(80));
    console.log('[PERFORMANCE REPORT]');
    console.log('═'.repeat(80));
    console.log(`Health: ${this.getHealthIcon()} ${stats.health.status} (${stats.health.score}/100)`);
    console.log(`Memory: ${stats.current.heapUsed}MB / ${stats.current.heapTotal}MB (${stats.current.heapPercent}%)`);
    console.log(`RSS: ${stats.current.rss}MB | External: ${stats.current.external}MB`);
    console.log(`CPU: ${stats.currentCPU.percent}%`);
    console.log(`Peaks: Memory=${stats.peaks.memory}MB | CPU=${stats.peaks.cpu}%`);
    console.log(`Averages: Memory=${stats.averages.memory}MB | CPU=${stats.averages.cpu}%`);
    console.log(`Trends: Memory=${stats.trends.memory} | CPU=${stats.trends.cpu}`);
    console.log(`Uptime: ${stats.stats.uptime} | GC: ${stats.stats.gcTriggers} | Warnings: ${stats.stats.warnings} | Criticals: ${stats.stats.criticals}`);
    
    if (stats.health.issues.length > 0) {
      console.log('Issues:');
      stats.health.issues.forEach(issue => console.log(`  - ${issue}`));
    }
    
    if (stats.recommendations.length > 0) {
      console.log('Recommendations:');
      stats.recommendations.forEach(rec => console.log(`  - ${rec.title}: ${rec.description}`));
    }
    
    console.log('═'.repeat(80));
    
    return stats;
  }

  // ============================================================================
  // UTILITY
  // ============================================================================

  average(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }

  /**
   * Cleanup old data
   */
  cleanup() {
    console.log('[PERFORMANCE] Running cleanup...');
    
    // Keep only last 60 metrics
    if (this.metrics.length > 60) {
      this.metrics = this.metrics.slice(-60);
    }
    
    // Clear old alerts
    this.stats.alerts = this.stats.alerts.slice(0, 10);
    
    // Trigger GC if available
    this.triggerGarbageCollection('cleanup');
    
    console.log('[PERFORMANCE] Cleanup complete');
  }
}

// Export singleton instance
export default new PerformanceMonitor();
