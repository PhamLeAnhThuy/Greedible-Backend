import { NextResponse } from 'next/server';
import { getSwaggerSpec } from '@/src/lib/swagger';

/**
 * GET /api/swagger
 * Returns the OpenAPI/Swagger specification for the API
 */
export async function GET() {
  const spec = await getSwaggerSpec();
  return NextResponse.json(spec);
}
