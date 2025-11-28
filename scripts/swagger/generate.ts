import fs from 'fs';
import path from 'path';
import swaggerJSDoc from 'swagger-jsdoc';

// Load the base spec (info, components, tags) from the existing module without paths
import base from '../../src/lib/swagger.base';

const root = path.resolve(__dirname, '../../');
const outDir = path.join(root, '.generated');
const outFile = path.join(outDir, 'openapi.json');

const options: swaggerJSDoc.Options = {
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
