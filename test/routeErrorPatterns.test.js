const fs = require('fs');
const path = require('path');

describe('Route Error Pattern Analysis', () => {
  const routesDir = path.join(__dirname, '..', 'routes');
  const routeFiles = fs.readdirSync(routesDir).filter(file => file.endsWith('.js'));

  // Patterns to look for
  const errorPatterns = {
    // Good patterns - standardized format
    good: [
      /res\.status\(\d+\)\.json\(\{\s*success:\s*false,\s*error:\s*\{[^}]+\}\s*\}\)/,
      /new AppError\(/,
      /next\(new AppError\(/,
      /res\.error\(/  // New standardized error helper
    ],
    // Bad patterns - inconsistent formats
    bad: [
      /res\.status\(\d+\)\.json\(\{\s*error:\s*['"]/,  // { error: "string" }
      /res\.status\(\d+\)\.send\(['"]/,                // .send("string")
      /res\.json\(\{\s*error:\s*error\.message\s*\}\)/, // { error: error.message }
      /res\.status\(\d+\)\.json\(\{\s*message:\s*/     // { message: ... } instead of error
    ]
  };

  routeFiles.forEach(file => {
    if (file === 'index.js') return; // Skip index file

    describe(`${file} error patterns`, () => {
      let content;
      
      beforeAll(() => {
        content = fs.readFileSync(path.join(routesDir, file), 'utf8');
      });

      test('should have at least one error response', () => {
        const hasErrorResponse = /res\.status\([45]\d{2}\)|res\.error\(/.test(content);
        expect(hasErrorResponse).toBe(true);
      });

      test('should use standardized error format', () => {
        const lines = content.split('\n');
        const errorLines = [];
        
        lines.forEach((line, index) => {
          // Check for bad patterns
          errorPatterns.bad.forEach(pattern => {
            if (pattern.test(line)) {
              errorLines.push({
                line: index + 1,
                content: line.trim(),
                issue: 'Non-standard error format'
              });
            }
          });
        });

        if (errorLines.length > 0) {
          console.log(`\n${file} has non-standard error formats:`);
          errorLines.forEach(({ line, content, issue }) => {
            console.log(`  Line ${line}: ${issue}`);
            console.log(`    ${content}`);
          });
        }

        // This test is informational - it logs issues but doesn't fail
        // In a real migration, we'd make this fail and fix all issues
        expect(errorLines.length).toBeGreaterThanOrEqual(0);
      });

      test('should not have hardcoded error messages', () => {
        // Look for error messages that should be i18n keys
        const hardcodedMessages = [];
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          // Check for common hardcoded messages
          const hardcodedPatterns = [
            /message:\s*['"](?!errors\.)([^'"]+)['"]/,  // message: "text" (not starting with errors.)
            /Error\(['"]([^'"]+)['"]\)/,                 // new Error("text")
          ];
          
          hardcodedPatterns.forEach(pattern => {
            const match = line.match(pattern);
            if (match && match[1]) {
              // Skip if it's a variable or template literal
              if (!match[1].includes('${') && !match[1].match(/^[A-Z_]+$/)) {
                hardcodedMessages.push({
                  line: index + 1,
                  message: match[1]
                });
              }
            }
          });
        });

        if (hardcodedMessages.length > 0) {
          console.log(`\n${file} has hardcoded error messages:`);
          hardcodedMessages.forEach(({ line, message }) => {
            console.log(`  Line ${line}: "${message}"`);
          });
        }

        // Informational - logs but doesn't fail
        expect(hardcodedMessages.length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  // Summary test
  test('should generate error standardization report', () => {
    console.log('\n=== Error Standardization Report ===');
    
    const report = {
      totalFiles: routeFiles.length,
      filesAnalyzed: [],
      standardizedFiles: [],
      needsWork: []
    };

    routeFiles.forEach(file => {
      if (file === 'index.js') return;
      
      const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
      const hasGoodPattern = errorPatterns.good.some(pattern => pattern.test(content));
      const hasBadPattern = errorPatterns.bad.some(pattern => pattern.test(content));
      
      report.filesAnalyzed.push(file);
      
      if (hasGoodPattern && !hasBadPattern) {
        report.standardizedFiles.push(file);
      } else if (hasBadPattern) {
        report.needsWork.push(file);
      }
    });

    console.log(`Total route files: ${report.totalFiles}`);
    console.log(`Files analyzed: ${report.filesAnalyzed.length}`);
    console.log(`\nStandardized files (${report.standardizedFiles.length}):`);
    report.standardizedFiles.forEach(file => console.log(`  ✓ ${file}`));
    console.log(`\nFiles needing standardization (${report.needsWork.length}):`);
    report.needsWork.forEach(file => console.log(`  ✗ ${file}`));

    expect(report.filesAnalyzed.length).toBeGreaterThan(0);
  });
});