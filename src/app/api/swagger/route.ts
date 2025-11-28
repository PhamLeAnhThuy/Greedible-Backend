import { NextResponse } from 'next/server';
import { swaggerSpec } from '@/src/lib/swagger';

/**
 * GET /api/swagger
 * Returns the OpenAPI/Swagger specification for the API
 */
export async function GET() {
  return NextResponse.json(swaggerSpec);
}
