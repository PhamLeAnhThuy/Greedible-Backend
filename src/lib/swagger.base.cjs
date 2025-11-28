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
    { name: 'Ingredients', description: 'Ingredient CRUD operations, waste tracking, and restock history' },
    { name: 'Orders', description: 'Order creation for guests and customers, order history, and revenue tracking' },
    { name: 'Payments', description: 'Payment processing via MoMo and Vietcombank payment gateways' },
    { name: 'Recipes', description: 'Recipe CRUD operations with image uploads to Supabase Storage' },
    { name: 'Restock', description: 'Inventory restocking orders and daily import tracking' },
    { name: 'Sales', description: 'Daily and monthly sales reporting with order count aggregation' },
    { name: 'Schedules', description: 'Staff shift scheduling and management' },
    { name: 'Staff', description: 'Staff authentication, login, and profile endpoints' },
    { name: 'Suppliers', description: 'Supplier contact and information management' }
  ],
  servers: [ { url: '/', description: 'Current origin' } ]
};
