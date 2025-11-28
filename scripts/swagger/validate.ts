import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../');
const apiDir = path.join(root, 'src/app/api');

const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(full));
    else if (e.isFile() && e.name === 'route.ts') files.push(full);
  }
  return files;
}

function routePathFromFile(file: string): string {
  // Convert src/app/api/.../route.ts to /api/... path, handling dynamic segments [id]
  const rel = path.relative(path.join(root, 'src/app'), path.dirname(file)).replace(/\\/g, '/');
  return '/' + rel; // rel already starts with api/... per structure
}

function validateFile(file: string): string[] {
  const content = fs.readFileSync(file, 'utf-8');
  const errors: string[] = [];
  const rPath = routePathFromFile(file);

  // Find exported handlers
  const handlerRegex = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS)\s*\(/g;
  const matches = [...content.matchAll(handlerRegex)];

  for (const m of matches) {
    const method = m[1];

    // Look for a swagger block immediately above (within preceding ~80 lines)
    const startIdx = m.index || 0;
    const pre = content.slice(0, startIdx);
    const lines = pre.split(/\r?\n/);
    const searchWindow = lines.slice(Math.max(0, lines.length - 120)).join('\n');

    const swaggerBlockRegex = new RegExp(`\\/\\*\\*([\\s\\S]*?)\\*\\/`, 'g');
    let hasBlock = false;
    let block: string | null = null;
    let match: RegExpExecArray | null;
    while ((match = swaggerBlockRegex.exec(searchWindow))) {
      block = match[0];
    }
    if (block) {
      // Verify path and method exist in the block
      const pathLine = new RegExp(`@swagger[\\s\\S]*?${rPath.replace(/[.*+?^${}()|[\\]\\\\]/g, r=>`\\${r}`)}:`);
      const methodLine = new RegExp(`\\n\\s*${method.toLowerCase()}:`);
      if (pathLine.test(block) && methodLine.test(block)) {
        hasBlock = true;
      }
    }

    if (!hasBlock) {
      errors.push(`${rPath} ${method}: missing @swagger block above handler in ${path.relative(root, file)}`);
    }
  }

  return errors;
}

const files = walk(apiDir);
let allErrors: string[] = [];
for (const f of files) {
  allErrors = allErrors.concat(validateFile(f));
}

if (allErrors.length) {
  console.error('Swagger documentation validation failed:\n' + allErrors.map(e => ` - ${e}`).join('\n'));
  process.exit(1);
}

console.log('Swagger documentation validation passed.');
