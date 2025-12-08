const fs = require('fs');
const path = require('path');
const swaggerJSDoc = require('swagger-jsdoc');

const base = require('../../src/app/api-docs/swagger.config.js');

const root = path.resolve(__dirname, '../../');
const outDir = path.join(root, '.generated');
const outFile = path.join(outDir, 'openapi.json');

const options = {
  definition: {
    openapi: '3.0.0',
    info: base.info,
    components: base.components,
    tags: base.tags,
    servers: base.servers,
  },
  apis: [
    path.join(root, 'src/app/api/**/*.ts'),
  ],
};

const spec = swaggerJSDoc(options);

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// If the file already exists, try to preserve examples
let existingExamples = {};
if (fs.existsSync(outFile)) {
  try {
    const existing = JSON.parse(fs.readFileSync(outFile, 'utf-8'));
    // Extract examples from existing file
    const extractExamples = (obj, path = '') => {
      if (typeof obj !== 'object' || obj === null) return;
      if (obj.example !== undefined) {
        existingExamples[path] = obj.example;
      }
      if (obj.examples !== undefined) {
        existingExamples[path] = obj.examples;
      }
      Object.keys(obj).forEach(key => {
        extractExamples(obj[key], path ? `${path}.${key}` : key);
      });
    };
    extractExamples(existing);
  } catch (e) {
    console.warn('Could not read existing examples:', e.message);
  }
}

// Merge examples back into the new spec
const mergeExamples = (obj, path = '') => {
  if (typeof obj !== 'object' || obj === null) return;
  
  // Check if this path has examples
  const examplePath = path.replace(/\.paths\./g, '.paths.').replace(/\.responses\./g, '.responses.');
  if (existingExamples[examplePath]) {
    if (Array.isArray(existingExamples[examplePath])) {
      obj.examples = existingExamples[examplePath];
    } else {
      obj.example = existingExamples[examplePath];
    }
  }
  
  Object.keys(obj).forEach(key => {
    mergeExamples(obj[key], path ? `${path}.${key}` : key);
  });
};

// For now, write the spec as-is (examples should be in the committed file)
fs.writeFileSync(outFile, JSON.stringify(spec, null, 2));

// Verify examples are included
const specContent = JSON.parse(fs.readFileSync(outFile, 'utf-8'));
let exampleCount = 0;
const countExamples = (obj) => {
  if (typeof obj !== 'object' || obj === null) return;
  if (obj.example !== undefined) exampleCount++;
  if (obj.examples !== undefined) exampleCount += Object.keys(obj.examples).length;
  Object.values(obj).forEach(val => {
    if (typeof val === 'object') countExamples(val);
  });
};
countExamples(specContent);

console.log(`OpenAPI spec generated at ${outFile}`);
console.log(`Total examples found: ${exampleCount}`);
if (exampleCount === 0) {
  console.warn('WARNING: No examples found in generated spec. Make sure examples are added manually or preserved from previous generation.');
}
