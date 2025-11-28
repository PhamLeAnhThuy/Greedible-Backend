import base from './swagger.base';
import fs from 'fs';
import path from 'path';

export const getSwaggerSpec = async () => {
  // Prefer generated spec if available; fallback to base-only spec
  const generatedPath = path.resolve(process.cwd(), '.generated/openapi.json');
  try {
    if (fs.existsSync(generatedPath)) {
      const content = fs.readFileSync(generatedPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch {
    // ignore and fallback
  }

  return {
    openapi: '3.0.0',
    info: base.info,
    components: base.components,
    tags: base.tags,
    servers: base.servers,
    paths: {},
  } as const;
};
