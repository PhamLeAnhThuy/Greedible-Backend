# API Documentation

This directory contains the Swagger/OpenAPI documentation for the Greedible Backend API.

## Accessing the Documentation

The API documentation is available at:
- **UI**: `http://localhost:3000/api-docs` - Interactive Swagger UI
- **JSON**: `http://localhost:3000/api/swagger` - OpenAPI specification in JSON format

## Files

### `src/lib/swagger.ts`
Contains the OpenAPI 3.0 specification definition with:
- API metadata and server information
- Security schemes (JWT Bearer authentication)
- All API tags and their descriptions
- Common paths and endpoint schemas

### `src/app/api-docs/page.tsx`
React client component that:
- Loads Swagger UI from CDN
- Displays interactive API documentation
- Loads the spec from `/api/swagger` endpoint

### `src/app/api/swagger/route.ts`
API route handler that serves the OpenAPI specification as JSON.

### `src/app/api-docs/layout.tsx`
Layout component for the documentation pages.

## Features

- **Interactive Testing**: Try out API endpoints directly from the browser
- **JWT Authentication**: Built-in support for Bearer token authentication
- **Detailed Schemas**: Request/response models for all endpoints
- **Real-time Updates**: Swagger spec updates automatically as APIs are added

## API Categories

The documentation organizes endpoints by the following tags:

- **Customers** - Authentication, registration, profiles
- **Ingredients** - Ingredient management
- **Orders** - Order creation and management
- **Payments** - Payment gateway integration
- **Recipes** - Recipe management with images
- **Restock** - Inventory restocking
- **Sales** - Sales reporting
- **Schedules** - Staff scheduling
- **Staff** - Staff authentication
- **Suppliers** - Supplier information
- **Documentation** - API specification

## Adding New Endpoints

When creating new API routes, add JSDoc comments with Swagger annotations:

```typescript
/**
 * @swagger
 * /api/example:
 *   get:
 *     summary: Brief description
 *     tags:
 *       - Category
 *     responses:
 *       200:
 *         description: Success response
 */
export async function GET(request: NextRequest) {
  // Implementation
}
```

Then update `src/lib/swagger.ts` to include the new endpoint in the paths section for full documentation.
