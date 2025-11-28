const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../');
const apiDir = path.join(root, 'src/app/api');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(full));
    else if (e.isFile() && e.name === 'route.ts') files.push(full);
  }
  return files;
}

function routePathFromFile(file) {
  const rel = path.relative(path.join(root, 'src/app'), path.dirname(file)).replace(/\\/g, '/');
  return '/' + rel;
}

function validateFile(file) {
  const content = fs.readFileSync(file, 'utf-8');
  const errors = [];
  const rPath = routePathFromFile(file);
  const handlerRegex = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS)\s*\(/g;
  const matches = [...content.matchAll(handlerRegex)];

  for (const m of matches) {
    const method = m[1];
    const startIdx = m.index || 0;
    const pre = content.slice(0, startIdx);
    const lines = pre.split(/\r?\n/);
    const searchWindow = lines.slice(Math.max(0, lines.length - 120)).join('\n');

    const swaggerBlockRegex = new RegExp(`/\\*\\*([\\s\\S]*?)\\*/`, 'g');
    let block = null;
    let match;
    while ((match = swaggerBlockRegex.exec(searchWindow))) {
      block = match[0];
    }
    let hasBlock = false;
    if (block) {
      const pathLine = new RegExp(`@swagger[\\s\\S]*?${rPath.replace(/[.*+?^${}()|[\\]\\\\]/g, r => `\\${r}`)}:`);
      const methodLine = new RegExp(`\n\\s*${method.toLowerCase()}:`);
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
let allErrors = [];
for (const f of files) {
  allErrors = allErrors.concat(validateFile(f));
}

if (allErrors.length) {
  console.error('Swagger documentation validation failed:\n' + allErrors.map(e => ` - ${e}`).join('\n'));
  process.exit(1);
}

console.log('Swagger documentation validation passed.');
