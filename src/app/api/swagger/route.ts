import { NextResponse } from 'next/server';
import { getSwaggerSpec } from '@/src/app/api-docs/swagger';

/**
 * GET /api/swagger
 * Returns the OpenAPI/Swagger specification for the API
 */
export async function GET() {
  try {
    const spec = await getSwaggerSpec();
    // Ensure examples are properly included in the response
    return NextResponse.json(spec, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error loading Swagger spec:', error);
    return NextResponse.json(
      { error: 'Failed to load API specification', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
