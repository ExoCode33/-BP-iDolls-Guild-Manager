#!/usr/bin/env node

/**
 * Discord Bot Comprehensive Audit Script
 * 
 * This script will:
 * 1. Scan your entire bot directory structure
 * 2. Analyze all JavaScript files
 * 3. Check for unused files
 * 4. Detect duplicate code
 * 5. Find missing dependencies
 * 6. Identify optimization opportunities
 * 7. Check for security issues
 * 8. Generate a comprehensive report
 */

const fs = require('fs');
const path = require('path');

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

class BotAuditor {
  constructor(rootPath) {
    this.rootPath = rootPath;
    this.report = {
      timestamp: new Date().toISOString(),
      files: [],
      issues: {
        critical: [],
        high: [],
        medium: [],
        low: []
      },
      stats: {
        totalFiles: 0,
        totalLines: 0,
        jsFiles: 0,
        jsonFiles: 0,
        unusedFiles: [],
        duplicateCode: [],
        missingDependencies: [],
        largeFunctions: [],
        deepNesting: []
      },
      recommendations: []
    };
  }

  // Main audit function
  async audit() {
    console.log(`${colors.bold}${colors.cyan}
╔═══════════════════════════════════════════════════════════╗
║           DISCORD BOT COMPREHENSIVE AUDIT                 ║
║                    Starting Analysis...                   ║
╚═══════════════════════════════════════════════════════════╝
${colors.reset}`);

    try {
      // Step 1: Scan directory structure
      console.log(`${colors.blue}[1/8]${colors.reset} Scanning directory structure...`);
      await this.scanDirectory(this.rootPath);

      // Step 2: Analyze JavaScript files
      console.log(`${colors.blue}[2/8]${colors.reset} Analyzing JavaScript files...`);
      await this.analyzeJavaScriptFiles();

      // Step 3: Check for unused imports/exports
      console.log(`${colors.blue}[3/8]${colors.reset} Checking for unused code...`);
      await this.checkUnusedCode();

      // Step 4: Check dependencies
      console.log(`${colors.blue}[4/8]${colors.reset} Validating dependencies...`);
      await this.checkDependencies();

      // Step 5: Check for duplicate code
      console.log(`${colors.blue}[5/8]${colors.reset} Detecting duplicate code...`);
      await this.checkDuplicateCode();

      // Step 6: Performance analysis
      console.log(`${colors.blue}[6/8]${colors.reset} Analyzing performance patterns...`);
      await this.analyzePerformance();

      // Step 7: Security audit
      console.log(`${colors.blue}[7/8]${colors.reset} Running security checks...`);
      await this.securityAudit();

      // Step 8: Generate recommendations
      console.log(`${colors.blue}[8/8]${colors.reset} Generating recommendations...`);
      await this.generateRecommendations();

      // Print report
      this.printReport();

      // Save report to file
      this.saveReport();

    } catch (error) {
      console.error(`${colors.red}Error during audit:${colors.reset}`, error);
    }
  }

  // Recursively scan directory
  scanDirectory(dir, level = 0) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      // Skip node_modules, .git, etc.
      if (file === 'node_modules' || file === '.git' || file === '.env' || file.startsWith('.')) {
        return;
      }

      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        this.scanDirectory(filePath, level + 1);
      } else {
        const ext = path.extname(file);
        const relPath = path.relative(this.rootPath, filePath);
        
        this.report.files.push({
          path: relPath,
          name: file,
          ext: ext,
          size: stat.size,
          lines: 0,
          modified: stat.mtime
        });

        this.report.stats.totalFiles++;
        
        if (ext === '.js') {
          this.report.stats.jsFiles++;
        } else if (ext === '.json') {
          this.report.stats.jsonFiles++;
        }
      }
    });
  }

  // Analyze JavaScript files
  analyzeJavaScriptFiles() {
    this.report.files.forEach(file => {
      if (file.ext !== '.js') return;

      const fullPath = path.join(this.rootPath, file.path);
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      
      file.lines = lines.length;
      this.report.stats.totalLines += lines.length;

      // Check for large files (> 500 lines)
      if (lines.length > 500) {
        this.report.issues.medium.push({
          type: 'Large File',
          file: file.path,
          message: `File has ${lines.length} lines. Consider splitting into smaller modules.`
        });
      }

      // Check for very large functions
      this.checkFunctionSize(content, file.path);

      // Check for deep nesting
      this.checkNesting(content, file.path);

      // Check for TODO/FIXME comments
      this.checkComments(content, file.path);

      // Check for console.log in production code
      this.checkDebugCode(content, file.path);
    });
  }

  // Check function sizes
  checkFunctionSize(content, filePath) {
    const functionRegex = /function\s+\w+\s*\([^)]*\)\s*\{/g;
    const arrowFunctionRegex = /\([^)]*\)\s*=>\s*\{/g;
    
    let match;
    const functions = [];
    
    while ((match = functionRegex.exec(content)) !== null) {
      functions.push({ start: match.index, type: 'function' });
    }
    
    while ((match = arrowFunctionRegex.exec(content)) !== null) {
      functions.push({ start: match.index, type: 'arrow' });
    }

    // Simple heuristic: count lines between function start and next function
    functions.forEach((func, i) => {
      if (i < functions.length - 1) {
        const lines = content.substring(func.start, functions[i + 1].start).split('\n').length;
        if (lines > 100) {
          this.report.stats.largeFunctions.push({
            file: filePath,
            lines: lines,
            type: func.type
          });
        }
      }
    });
  }

  // Check nesting depth
  checkNesting(content, filePath) {
    const lines = content.split('\n');
    let maxDepth = 0;
    let currentDepth = 0;

    lines.forEach((line, i) => {
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      currentDepth += openBraces - closeBraces;
      
      if (currentDepth > maxDepth) {
        maxDepth = currentDepth;
      }

      if (currentDepth > 5) {
        this.report.stats.deepNesting.push({
          file: filePath,
          line: i + 1,
          depth: currentDepth
        });
      }
    });
  }

  // Check for TODO/FIXME
  checkComments(content, filePath) {
    const todoRegex = /\/\/\s*(TODO|FIXME|HACK|XXX):\s*(.+)/gi;
    let match;

    while ((match = todoRegex.exec(content)) !== null) {
      this.report.issues.low.push({
        type: 'TODO Comment',
        file: filePath,
        message: `${match[1]}: ${match[2]}`
      });
    }
  }

  // Check for debug code
  checkDebugCode(content, filePath) {
    if (content.includes('console.log') && !filePath.includes('logger.js')) {
      const count = (content.match(/console\.log/g) || []).length;
      this.report.issues.medium.push({
        type: 'Debug Code',
        file: filePath,
        message: `Found ${count} console.log statements. Consider using logger instead.`
      });
    }
  }

  // Check for unused code
  checkUnusedCode() {
    // Check for files that aren't imported anywhere
    const importMap = new Map();
    
    this.report.files.forEach(file => {
      if (file.ext !== '.js') return;
      
      const fullPath = path.join(this.rootPath, file.path);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Find all imports
      const importRegex = /import\s+.*\s+from\s+['"](.+)['"]/g;
      let match;
      
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        importMap.set(importPath, (importMap.get(importPath) || 0) + 1);
      }
    });

    // Check which files are never imported
    this.report.files.forEach(file => {
      if (file.ext !== '.js') return;
      if (file.name === 'index.js') return; // Entry points
      if (file.name === 'deploy.js') return;
      
      const normalized = file.path.replace(/\\/g, '/').replace('.js', '');
      const isImported = Array.from(importMap.keys()).some(imp => 
        imp.includes(file.name.replace('.js', ''))
      );

      if (!isImported) {
        this.report.stats.unusedFiles.push(file.path);
      }
    });
  }

  // Check dependencies
  checkDependencies() {
    const packageJsonPath = path.join(this.rootPath, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      this.report.issues.critical.push({
        type: 'Missing File',
        message: 'package.json not found'
      });
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = new Set([
      ...Object.keys(packageJson.dependencies || {}),
      ...Object.keys(packageJson.devDependencies || {})
    ]);

    // Check if all imported packages are in dependencies
    const usedPackages = new Set();
    
    this.report.files.forEach(file => {
      if (file.ext !== '.js') return;
      
      const fullPath = path.join(this.rootPath, file.path);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
      const importRegex = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;
      
      let match;
      while ((match = requireRegex.exec(content)) !== null) {
        const pkg = match[1].split('/')[0];
        if (!pkg.startsWith('.')) usedPackages.add(pkg);
      }
      
      while ((match = importRegex.exec(content)) !== null) {
        const pkg = match[1].split('/')[0];
        if (!pkg.startsWith('.')) usedPackages.add(pkg);
      }
    });

    // Find missing dependencies
    usedPackages.forEach(pkg => {
      if (!dependencies.has(pkg) && !this.isBuiltIn(pkg)) {
        this.report.stats.missingDependencies.push(pkg);
      }
    });
  }

  // Check if package is built-in Node.js module
  isBuiltIn(pkg) {
    const builtIns = ['fs', 'path', 'http', 'https', 'crypto', 'util', 'events', 'stream', 'os', 'process'];
    return builtIns.includes(pkg);
  }

  // Check for duplicate code (simplified)
  checkDuplicateCode() {
    const codeBlocks = new Map();
    
    this.report.files.forEach(file => {
      if (file.ext !== '.js') return;
      
      const fullPath = path.join(this.rootPath, file.path);
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      
      // Check for repeated blocks of 5+ lines
      for (let i = 0; i < lines.length - 5; i++) {
        const block = lines.slice(i, i + 5).join('\n').trim();
        if (block.length < 50) continue; // Skip small blocks
        
        if (codeBlocks.has(block)) {
          const existing = codeBlocks.get(block);
          if (existing.file !== file.path) {
            this.report.stats.duplicateCode.push({
              block: block.substring(0, 100) + '...',
              files: [existing.file, file.path]
            });
          }
        } else {
          codeBlocks.set(block, { file: file.path, line: i + 1 });
        }
      }
    });
  }

  // Analyze performance patterns
  analyzePerformance() {
    this.report.files.forEach(file => {
      if (file.ext !== '.js') return;
      
      const fullPath = path.join(this.rootPath, file.path);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Check for synchronous operations in potentially async code
      if (content.includes('readFileSync') || content.includes('writeFileSync')) {
        this.report.issues.medium.push({
          type: 'Performance',
          file: file.path,
          message: 'Using synchronous file operations. Consider using async versions.'
        });
      }

      // Check for missing error handling in async functions
      if (content.includes('async function') && !content.includes('try') && !content.includes('catch')) {
        this.report.issues.high.push({
          type: 'Error Handling',
          file: file.path,
          message: 'Async function without try-catch blocks'
        });
      }
    });
  }

  // Security audit
  securityAudit() {
    this.report.files.forEach(file => {
      if (file.ext !== '.js') return;
      
      const fullPath = path.join(this.rootPath, file.path);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Check for hardcoded credentials
      if (/password\s*=\s*['"][^'"]+['"]/.test(content) || /token\s*=\s*['"][^'"]+['"]/.test(content)) {
        this.report.issues.critical.push({
          type: 'Security',
          file: file.path,
          message: 'Potential hardcoded credentials detected'
        });
      }

      // Check for eval usage
      if (content.includes('eval(')) {
        this.report.issues.critical.push({
          type: 'Security',
          file: file.path,
          message: 'Usage of eval() detected - security risk'
        });
      }

      // Check for SQL injection risks
      if (content.includes('`INSERT INTO') || content.includes('`SELECT * FROM')) {
        this.report.issues.high.push({
          type: 'Security',
          file: file.path,
          message: 'Potential SQL injection vulnerability'
        });
      }
    });
  }

  // Generate recommendations
  generateRecommendations() {
    // Code organization
    if (this.report.stats.jsFiles > 50) {
      this.report.recommendations.push({
        priority: 'Medium',
        category: 'Organization',
        message: `Large codebase (${this.report.stats.jsFiles} files). Consider modularization and better organization.`
      });
    }

    // Large functions
    if (this.report.stats.largeFunctions.length > 0) {
      this.report.recommendations.push({
        priority: 'Medium',
        category: 'Code Quality',
        message: `Found ${this.report.stats.largeFunctions.length} large functions. Break them into smaller, testable units.`
      });
    }

    // Unused files
    if (this.report.stats.unusedFiles.length > 0) {
      this.report.recommendations.push({
        priority: 'Low',
        category: 'Cleanup',
        message: `${this.report.stats.unusedFiles.length} potentially unused files detected. Consider removing them.`
      });
    }

    // Missing dependencies
    if (this.report.stats.missingDependencies.length > 0) {
      this.report.recommendations.push({
        priority: 'High',
        category: 'Dependencies',
        message: `${this.report.stats.missingDependencies.length} packages used but not in package.json: ${this.report.stats.missingDependencies.join(', ')}`
      });
    }

    // Deep nesting
    if (this.report.stats.deepNesting.length > 5) {
      this.report.recommendations.push({
        priority: 'Medium',
        category: 'Code Quality',
        message: 'Multiple instances of deep nesting detected. Refactor for better readability.'
      });
    }
  }

  // Print report to console
  printReport() {
    console.log(`\n${colors.bold}${colors.cyan}
╔═══════════════════════════════════════════════════════════╗
║                  AUDIT REPORT SUMMARY                     ║
╚═══════════════════════════════════════════════════════════╝${colors.reset}`);

    // Statistics
    console.log(`\n${colors.bold}📊 Statistics:${colors.reset}`);
    console.log(`   Total Files: ${colors.green}${this.report.stats.totalFiles}${colors.reset}`);
    console.log(`   JavaScript Files: ${colors.green}${this.report.stats.jsFiles}${colors.reset}`);
    console.log(`   Total Lines of Code: ${colors.green}${this.report.stats.totalLines}${colors.reset}`);
    console.log(`   Unused Files: ${colors.yellow}${this.report.stats.unusedFiles.length}${colors.reset}`);
    console.log(`   Large Functions: ${colors.yellow}${this.report.stats.largeFunctions.length}${colors.reset}`);
    console.log(`   Duplicate Code Blocks: ${colors.yellow}${this.report.stats.duplicateCode.length}${colors.reset}`);

    // Issues
    console.log(`\n${colors.bold}🚨 Issues Found:${colors.reset}`);
    console.log(`   ${colors.red}Critical: ${this.report.issues.critical.length}${colors.reset}`);
    console.log(`   ${colors.yellow}High: ${this.report.issues.high.length}${colors.reset}`);
    console.log(`   ${colors.cyan}Medium: ${this.report.issues.medium.length}${colors.reset}`);
    console.log(`   ${colors.white}Low: ${this.report.issues.low.length}${colors.reset}`);

    // Print critical issues
    if (this.report.issues.critical.length > 0) {
      console.log(`\n${colors.bold}${colors.red}🔴 Critical Issues:${colors.reset}`);
      this.report.issues.critical.forEach((issue, i) => {
        console.log(`   ${i + 1}. [${issue.type}] ${issue.file || 'N/A'}`);
        console.log(`      ${issue.message}`);
      });
    }

    // Print high priority issues
    if (this.report.issues.high.length > 0) {
      console.log(`\n${colors.bold}${colors.yellow}⚠️  High Priority Issues:${colors.reset}`);
      this.report.issues.high.slice(0, 5).forEach((issue, i) => {
        console.log(`   ${i + 1}. [${issue.type}] ${issue.file}`);
        console.log(`      ${issue.message}`);
      });
      if (this.report.issues.high.length > 5) {
        console.log(`   ... and ${this.report.issues.high.length - 5} more`);
      }
    }

    // Print unused files
    if (this.report.stats.unusedFiles.length > 0) {
      console.log(`\n${colors.bold}📦 Potentially Unused Files:${colors.reset}`);
      this.report.stats.unusedFiles.slice(0, 10).forEach((file, i) => {
        console.log(`   ${i + 1}. ${file}`);
      });
      if (this.report.stats.unusedFiles.length > 10) {
        console.log(`   ... and ${this.report.stats.unusedFiles.length - 10} more`);
      }
    }

    // Print recommendations
    if (this.report.recommendations.length > 0) {
      console.log(`\n${colors.bold}💡 Recommendations:${colors.reset}`);
      this.report.recommendations.forEach((rec, i) => {
        const color = rec.priority === 'High' ? colors.red : rec.priority === 'Medium' ? colors.yellow : colors.white;
        console.log(`   ${i + 1}. [${color}${rec.priority}${colors.reset}] ${rec.category}: ${rec.message}`);
      });
    }

    console.log(`\n${colors.green}✅ Audit complete! Full report saved to audit-report.json${colors.reset}\n`);
  }

  // Save report to JSON file
  saveReport() {
    const reportPath = path.join(this.rootPath, 'audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.report, null, 2));
    
    // Also create a markdown report
    this.saveMarkdownReport();
  }

  // Save markdown report
  saveMarkdownReport() {
    let md = `# Bot Audit Report\n\n`;
    md += `**Generated:** ${this.report.timestamp}\n\n`;
    
    md += `## 📊 Statistics\n\n`;
    md += `- Total Files: ${this.report.stats.totalFiles}\n`;
    md += `- JavaScript Files: ${this.report.stats.jsFiles}\n`;
    md += `- Total Lines: ${this.report.stats.totalLines}\n`;
    md += `- Unused Files: ${this.report.stats.unusedFiles.length}\n`;
    md += `- Large Functions: ${this.report.stats.largeFunctions.length}\n`;
    md += `- Duplicate Code: ${this.report.stats.duplicateCode.length}\n\n`;
    
    md += `## 🚨 Issues Summary\n\n`;
    md += `- Critical: ${this.report.issues.critical.length}\n`;
    md += `- High: ${this.report.issues.high.length}\n`;
    md += `- Medium: ${this.report.issues.medium.length}\n`;
    md += `- Low: ${this.report.issues.low.length}\n\n`;
    
    if (this.report.issues.critical.length > 0) {
      md += `## 🔴 Critical Issues\n\n`;
      this.report.issues.critical.forEach((issue, i) => {
        md += `${i + 1}. **[${issue.type}]** ${issue.file || 'N/A'}\n`;
        md += `   - ${issue.message}\n\n`;
      });
    }
    
    if (this.report.stats.unusedFiles.length > 0) {
      md += `## 📦 Unused Files\n\n`;
      this.report.stats.unusedFiles.forEach((file, i) => {
        md += `${i + 1}. \`${file}\`\n`;
      });
      md += `\n`;
    }
    
    if (this.report.recommendations.length > 0) {
      md += `## 💡 Recommendations\n\n`;
      this.report.recommendations.forEach((rec, i) => {
        md += `${i + 1}. **[${rec.priority}]** ${rec.category}\n`;
        md += `   - ${rec.message}\n\n`;
      });
    }
    
    const mdPath = path.join(this.rootPath, 'audit-report.md');
    fs.writeFileSync(mdPath, md);
  }
}

// Run audit
const args = process.argv.slice(2);
const botPath = args[0] || process.cwd();

console.log(`${colors.cyan}Auditing bot at: ${botPath}${colors.reset}\n`);

const auditor = new BotAuditor(botPath);
auditor.audit();
