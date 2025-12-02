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
fs.writeFileSync(outFile, JSON.stringify(spec, null, 2));

console.log(`OpenAPI spec generated at ${outFile}`);
