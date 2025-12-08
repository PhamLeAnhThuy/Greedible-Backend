module.exports = {
  info: {
    title: 'Greedible API',
    version: '1.0.0',
    description: 'Comprehensive API documentation for Greedible Backend - Restaurant Management System',
    contact: { name: 'Greedible Support', email: 'support@greedible.com' }
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Authorization header using the Bearer scheme. Use "Bearer {token}" format.'
      }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          error: { type: 'string', nullable: true }
        }
      },
      Success: {
        type: 'object',
        properties: { success: { type: 'boolean', example: true }, data: { type: 'object' } }
      }
    }
  },
  tags: [
    { name: 'Customers', description: 'Customer authentication, registration, profile management, and loyalty points' },
    { name: 'Orders', description: 'Order creation for guests and customers, order history, and revenue tracking' },
    { name: 'Recipes', description: 'Recipe CRUD operations with image uploads to Supabase Storage' },
  ],
  servers: [ { url: '/', description: 'Current origin' } ]
};
