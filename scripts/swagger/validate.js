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
    else if (e.isFile() && e.name.endsWith('.ts')) files.push(full);
  }
  return files;
}

function routePathFromFile(file) {
  const rel = path.relative(path.join(root, 'src/app'), path.dirname(file)).replace(/\\/g, '/');
  return '/' + rel;
}

function collectHandlers(files) {
  const handlers = [];
  for (const file of files) {
    if (!file.endsWith('route.ts')) continue;
    const content = fs.readFileSync(file, 'utf-8');
    const rPath = routePathFromFile(file);
    const handlerRegex = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS)\s*\(/g;
    const matches = [...content.matchAll(handlerRegex)];
    for (const m of matches) {
      handlers.push({ path: rPath, method: m[1].toUpperCase(), file });
    }
  }
  return handlers;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, r => `\\${r}`);
}

function collectDocs(files) {
  const documented = new Set();
  const blockRegex = /\/\*\*([\s\S]*?)\*\//g;
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    let m;
    while ((m = blockRegex.exec(content))) {
      const block = m[0];
      if (!/@swagger/.test(block)) continue;
      // Find all paths defined in this block
      const pathMatches = [...block.matchAll(/^\s*\/(api\/[^\s:]+):/gmi)];
      for (const pm of pathMatches) {
        const p = '/' + pm[1];
        // For this path segment of the block, extract methods
        const pathSectionRegex = new RegExp(`${escapeRegex(pm[0])}([\\s\\S]*?)(^\\s*\/api\/|\n\*\/|$)`, 'mi');
        const segMatch = block.match(pathSectionRegex);
        const seg = segMatch ? segMatch[1] : '';
        const methodMatches = [...seg.matchAll(/^\s*(get|post|put|patch|delete|options):/gmi)];
        for (const mm of methodMatches) {
          documented.add(`${mm[1].toUpperCase()} ${p}`);
        }
      }
    }
  }
  return documented;
}

const allTsFiles = walk(apiDir);
const handlers = collectHandlers(allTsFiles);
const docsSet = collectDocs(allTsFiles);

const excludes = new Set([
  'GET /api/swagger', // exclude internal spec route
]);

const errors = [];
for (const h of handlers) {
  const key = `${h.method} ${h.path}`;
  if (excludes.has(key)) continue;
  if (!docsSet.has(key)) {
    errors.push(`${h.path} ${h.method}: missing @swagger docs (no block found anywhere). Handler in ${path.relative(root, h.file)}`);
  }
}

if (errors.length) {
  console.error('Swagger documentation validation failed:\n' + errors.map(e => ` - ${e}`).join('\n'));
  process.exit(1);
}

console.log('Swagger documentation validation passed.');
