export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Greedible API',
    version: '1.0.0',
    description: 'Comprehensive API documentation for Greedible Backend - Restaurant Management System',
    contact: {
      name: 'Greedible Support',
      email: 'support@greedible.com'
    }
  },
  servers: [
    {
      url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
      description: 'API Server'
    }
  ],
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
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'object' }
        }
      }
    }
  },
  tags: [
    {
      name: 'Customers',
      description: 'Customer authentication, registration, profile management, and loyalty points'
    },
    {
      name: 'Ingredients',
      description: 'Ingredient CRUD operations, waste tracking, and restock history'
    },
    {
      name: 'Orders',
      description: 'Order creation for guests and customers, order history, and revenue tracking'
    },
    {
      name: 'Payments',
      description: 'Payment processing via MoMo and Vietcombank payment gateways'
    },
    {
      name: 'Recipes',
      description: 'Recipe CRUD operations with image uploads to Supabase Storage'
    },
    {
      name: 'Restock',
      description: 'Inventory restocking orders and daily import tracking'
    },
    {
      name: 'Sales',
      description: 'Daily and monthly sales reporting with order count aggregation'
    },
    {
      name: 'Schedules',
      description: 'Staff shift scheduling and management'
    },
    {
      name: 'Staff',
      description: 'Staff authentication, login, and profile endpoints'
    },
    {
      name: 'Suppliers',
      description: 'Supplier contact and information management'
    }
  ],
  paths: {
    '/api/customers/register': {
      post: {
        tags: ['Customers'],
        summary: 'Register a new customer',
        description: 'Creates a new customer account with email and phone validation',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  customer_name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string', pattern: '^[0-9]{10}$' },
                  password: { type: 'string', minLength: 6 }
                },
                required: ['customer_name', 'email', 'phone', 'password']
              }
            }
          }
        },
        responses: {
          201: { description: 'Customer registered successfully' },
          400: { description: 'Validation error or duplicate email/phone' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/customers/signin': {
      post: {
        tags: ['Customers'],
        summary: 'Sign in a customer',
        description: 'Authenticate with email and password, returns JWT token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' }
                },
                required: ['email', 'password']
              }
            }
          }
        },
        responses: {
          200: { description: 'Login successful, returns token and user info' },
          401: { description: 'Invalid credentials' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/ingredients': {
      get: {
        tags: ['Ingredients'],
        summary: 'Get all ingredients',
        description: 'Retrieves all ingredients with supplier information',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'List of ingredients' },
          401: { description: 'Unauthorized' },
          500: { description: 'Server error' }
        }
      },
      post: {
        tags: ['Ingredients'],
        summary: 'Create a new ingredient',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  ingredient_name: { type: 'string' },
                  quantity: { type: 'number' },
                  unit: { type: 'string' },
                  ingredient_price: { type: 'number' }
                },
                required: ['ingredient_name', 'quantity', 'unit', 'ingredient_price']
              }
            }
          }
        },
        responses: {
          201: { description: 'Ingredient created' },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/orders': {
      get: {
        tags: ['Orders'],
        summary: 'Get all orders',
        description: 'Retrieves all orders (staff auth required)',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'sort',
            in: 'query',
            description: 'Sort field (date or total_amount)',
            schema: { type: 'string' }
          }
        ],
        responses: {
          200: { description: 'List of orders' },
          401: { description: 'Unauthorized' },
          500: { description: 'Server error' }
        }
      },
      post: {
        tags: ['Orders'],
        summary: 'Create a guest order',
        description: 'Creates an order for a guest customer',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  customer_phone: { type: 'string' },
                  recipes: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        recipe_id: { type: 'number' },
                        quantity: { type: 'number' }
                      }
                    }
                  }
                },
                required: ['customer_phone', 'recipes']
              }
            }
          }
        },
        responses: {
          201: { description: 'Order created' },
          400: { description: 'Validation error' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/recipes': {
      get: {
        tags: ['Recipes'],
        summary: 'Get all recipes',
        description: 'Retrieves recipes with optional filtering by calories and availability',
        parameters: [
          {
            name: 'calories',
            in: 'query',
            schema: { type: 'string', enum: ['low', 'medium', 'high'] }
          }
        ],
        responses: {
          200: { description: 'List of recipes' },
          500: { description: 'Server error' }
        }
      },
      post: {
        tags: ['Recipes'],
        summary: 'Create a new recipe',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  recipe_name: { type: 'string' },
                  description: { type: 'string' },
                  price: { type: 'number' },
                  calories: { type: 'number' },
                  image: { type: 'string', format: 'binary' },
                  category: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Recipe created' },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/sales/daily': {
      get: {
        tags: ['Sales'],
        summary: 'Get daily sales data',
        description: 'Retrieves order count by day for a specific month and year',
        parameters: [
          {
            name: 'year',
            in: 'query',
            required: true,
            schema: { type: 'number' }
          },
          {
            name: 'month',
            in: 'query',
            required: true,
            schema: { type: 'number', minimum: 1, maximum: 12 }
          }
        ],
        responses: {
          200: { description: 'Daily sales data' },
          400: { description: 'Invalid parameters' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/schedules': {
      get: {
        tags: ['Schedules'],
        summary: 'Get weekly shifts',
        description: 'Retrieves all shifts for a specific week',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'startDate',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'date' }
          }
        ],
        responses: {
          200: { description: 'Weekly shifts' },
          400: { description: 'Missing startDate' },
          401: { description: 'Unauthorized' },
          500: { description: 'Server error' }
        }
      },
      post: {
        tags: ['Schedules'],
        summary: 'Create shift or assign staff',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  shift_date: { type: 'string', format: 'date' },
                  shift: { type: 'string', enum: ['Morning', 'Evening'] },
                  staff_id: { type: 'number', nullable: true }
                },
                required: ['shift_date', 'shift']
              }
            }
          }
        },
        responses: {
          201: { description: 'Shift created or staff assigned' },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/suppliers': {
      get: {
        tags: ['Suppliers'],
        summary: 'Get all suppliers',
        description: 'Retrieves a list of all suppliers',
        responses: {
          200: { description: 'List of suppliers' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/swagger': {
      get: {
        tags: ['Documentation'],
        summary: 'Get API specification',
        description: 'Returns the OpenAPI specification for this API',
        responses: {
          200: { description: 'OpenAPI specification' }
        }
      }
    }
  }
};

export const getSwaggerSpec = () => swaggerSpec;
