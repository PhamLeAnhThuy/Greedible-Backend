import fs from 'fs';
import path from 'path';

export const getSwaggerSpec = async () => {
  const generatedPath = path.resolve(process.cwd(), '.generated/openapi.json');
  
  if (!fs.existsSync(generatedPath)) {
    throw new Error('OpenAPI spec not found. Run "npm run swagger:gen" to generate it.');
  }
  
  const content = fs.readFileSync(generatedPath, 'utf-8');
  return JSON.parse(content);
};
