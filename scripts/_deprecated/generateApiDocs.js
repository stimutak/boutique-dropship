
/**
 * API Documentation Generator
 * 
 * This script generates comprehensive API documentation by analyzing
 * route files and extracting endpoint information.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ROUTES_DIR = path.join(__dirname, '..', 'routes');
const OUTPUT_FILE = path.join(__dirname, '..', 'docs', 'API_REFERENCE.md');

// Route analysis patterns
const _ROUTE_PATTERNS = {
  method: /\.(get|post|put|delete|patch)\s*\(/g,
  path: /['"`]([^'"`]+)['"`]/,
  middleware: /auth|admin|validate/g,
  description: /\/\*\*(.*?)\*\//gs
};

/**
 * Extract route information from file content
 */
function extractRoutes(filePath, content) {
  const routes = [];
  const lines = content.split('\n');
  
  const _currentRoute = null;
  let inComment = false;
  let commentBuffer = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Handle multi-line comments
    if (line.includes('/**')) {
      inComment = true;
      commentBuffer = line;
      continue;
    }
    
    if (inComment) {
      commentBuffer += '\n' + line;
      if (line.includes('*/')) {
        inComment = false;
      }
      continue;
    }
    
    // Check for route definitions
    const methodMatch = line.match(/router\.(get|post|put|delete|patch)\s*\(/);
    if (methodMatch) {
      const method = methodMatch[1].toUpperCase();
      
      // Extract path from the same line or next line
      let pathLine = line;
      if (!pathLine.includes("'") && !pathLine.includes('"')) {
        pathLine = lines[i + 1] || '';
      }
      
      const pathMatch = pathLine.match(/['"`]([^'"`]+)['"`]/);
      if (pathMatch) {
        const routePath = pathMatch[1];
        
        // Extract middleware information
        const middleware = [];
        if (line.includes('auth')) {middleware.push('auth');}
        if (line.includes('admin')) {middleware.push('admin');}
        if (line.includes('validate')) {middleware.push('validation');}
        
        // Parse comment for description
        let description = '';
        const parameters = [];
        const responses = [];
        
        if (commentBuffer) {
          const commentLines = commentBuffer.split('\n');
          let currentSection = 'description';
          
          for (const commentLine of commentLines) {
            const clean = commentLine.replace(/^\s*\*\s?/, '').trim();
            
            if (clean.startsWith('@param')) {
              currentSection = 'params';
              const paramMatch = clean.match(/@param\s+{([^}]+)}\s+(\w+)\s*-?\s*(.*)/);
              if (paramMatch) {
                parameters.push({
                  name: paramMatch[2],
                  type: paramMatch[1],
                  description: paramMatch[3]
                });
              }
            } else if (clean.startsWith('@returns') || clean.startsWith('@response')) {
              currentSection = 'responses';
              const responseMatch = clean.match(/@(?:returns|response)\s+{([^}]+)}\s*(.*)/);
              if (responseMatch) {
                responses.push({
                  type: responseMatch[1],
                  description: responseMatch[2]
                });
              }
            } else if (currentSection === 'description' && clean && !clean.startsWith('*')) {
              description += (description ? ' ' : '') + clean;
            }
          }
        }
        
        routes.push({
          method,
          path: routePath,
          middleware,
          description: description || `${method} ${routePath}`,
          parameters,
          responses,
          file: path.basename(filePath)
        });
        
        commentBuffer = '';
      }
    }
  }
  
  return routes;
}

/**
 * Analyze all route files
 */
function analyzeRoutes() {
  const allRoutes = [];
  
  try {
    const routeFiles = fs.readdirSync(ROUTES_DIR)
      .filter(file => file.endsWith('.js'))
      .sort();
    
    for (const file of routeFiles) {
      const filePath = path.join(ROUTES_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const routes = extractRoutes(filePath, content);
      
      allRoutes.push({
        file,
        routes
      });
    }
  } catch (error) {
    console.error('Error analyzing routes:', error.message);
    process.exit(1);
  }
  
  return allRoutes;
}

/**
 * Generate markdown documentation
 */
function generateMarkdown(routeData) {
  let markdown = `# API Reference

*Generated on ${new Date().toISOString()}*

This document provides a comprehensive reference for all API endpoints in the Holistic Dropship Store application.

## Base URL

\`\`\`
Development: http://localhost:3000/api
Production: https://your-domain.com/api
\`\`\`

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Response Format

All responses follow a consistent format:

### Success Response
\`\`\`json
{
  "success": true,
  "data": {
    // Response data
  }
}
\`\`\`

### Error Response
\`\`\`json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
\`\`\`

## Endpoints

`;

  // Group routes by file/category
  for (const { file, routes } of routeData) {
    if (routes.length === 0) {continue;}
    
    const category = file.replace('.js', '').replace(/([A-Z])/g, ' $1').trim();
    const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
    
    markdown += `### ${categoryTitle} (\`/api/${file.replace('.js', '')}\`)\n\n`;
    
    // Sort routes by method and path
    const sortedRoutes = routes.sort((a, b) => {
      const methodOrder = { GET: 1, POST: 2, PUT: 3, DELETE: 4, PATCH: 5 };
      if (methodOrder[a.method] !== methodOrder[b.method]) {
        return methodOrder[a.method] - methodOrder[b.method];
      }
      return a.path.localeCompare(b.path);
    });
    
    for (const route of sortedRoutes) {
      markdown += `#### ${route.method} ${route.path}\n\n`;
      
      if (route.description) {
        markdown += `${route.description}\n\n`;
      }
      
      // Authentication requirements
      if (route.middleware.length > 0) {
        markdown += `**Requirements:** ${route.middleware.join(', ')}\n\n`;
      }
      
      // Parameters
      if (route.parameters.length > 0) {
        markdown += '**Parameters:**\n\n';
        for (const param of route.parameters) {
          markdown += `- \`${param.name}\` (${param.type}): ${param.description}\n`;
        }
        markdown += '\n';
      }
      
      // Example request
      markdown += `**Example Request:**\n\`\`\`http\n${route.method} /api${route.path}\n`;
      if (route.middleware.includes('auth')) {
        markdown += 'Authorization: Bearer <token>\n';
      }
      if (['POST', 'PUT', 'PATCH'].includes(route.method)) {
        markdown += 'Content-Type: application/json\n';
      }
      markdown += '```\n\n';
      
      // Example response
      if (route.responses.length > 0) {
        markdown += '**Example Response:**\n```json\n';
        markdown += '{\n  "success": true,\n  "data": {\n    // Response data\n  }\n}\n';
        markdown += '```\n\n';
      }
      
      markdown += '---\n\n';
    }
  }
  
  // Add footer
  markdown += `## Rate Limiting

- General endpoints: 100 requests per 15 minutes
- Authentication endpoints: 5 requests per 15 minutes
- Payment endpoints: 10 requests per 15 minutes

## Error Codes

| Code | Description |
|------|-------------|
| \`VALIDATION_ERROR\` | Request validation failed |
| \`UNAUTHORIZED\` | Authentication required |
| \`FORBIDDEN\` | Insufficient permissions |
| \`NOT_FOUND\` | Resource not found |
| \`RATE_LIMIT_EXCEEDED\` | Too many requests |

## Support

For API support:
- Documentation: [Full API Documentation](./API_DOCUMENTATION.md)
- Issues: Create an issue in the repository
- Email: support@holisticstore.com

---

*This reference was automatically generated from route definitions.*
`;

  return markdown;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Analyzing route files...');
  
  const routeData = analyzeRoutes();
  const totalRoutes = routeData.reduce((sum, { routes }) => sum + routes.length, 0);
  
  console.log(`📊 Found ${totalRoutes} endpoints across ${routeData.length} files`);
  
  console.log('📝 Generating documentation...');
  const markdown = generateMarkdown(routeData);
  
  // Ensure docs directory exists
  const docsDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  
  // Write documentation
  fs.writeFileSync(OUTPUT_FILE, markdown, 'utf8');
  
  console.log(`✅ API reference generated: ${OUTPUT_FILE}`);
  console.log(`📄 ${markdown.split('\n').length} lines written`);
  
  // Generate summary
  console.log('\n📋 Summary:');
  for (const { file, routes } of routeData) {
    if (routes.length > 0) {
      console.log(`  ${file}: ${routes.length} endpoints`);
    }
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  analyzeRoutes,
  generateMarkdown,
  extractRoutes
};