class Logger {
  log(message) {
    console.log(`[LOG] ${new Date().toISOString()} - ${message}`);
  }

  error(message) {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
  }

  warn(message) {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`);
  }

  success(message) {
    console.log(`[SUCCESS] ${new Date().toISOString()} - ${message}`);
  }

  debug(message) {
    console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`);
  }
}

export default new Logger();
