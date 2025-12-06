# Greedible Backend

A comprehensive RESTful API backend for Greedible - a restaurant management system built with Next.js, TypeScript, and Supabase. This backend handles customer orders, recipe management, inventory tracking, payment processing, and administrative operations.

## Technologies

- **Framework**: [Next.js 16.0.3](https://nextjs.org/) (App Router)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Storage**: Supabase Storage (for recipe images)
- **Authentication**: JWT (JSON Web Tokens) with `jsonwebtoken`
- **Password Hashing**: `bcryptjs`
- **API Documentation**: Swagger/OpenAPI 3.0 (`swagger-jsdoc`)
- **Styling**: Tailwind CSS 4 (for API documentation UI)
- **CORS**: Configured for cross-origin requests

## Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Supabase account and project
- Environment variables configured (see [Environment Variables](#environment-variables))

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Greedible-Backend
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables (create a `.env.local` file):
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# JWT Configuration
JWT_SECRET=your_jwt_secret_key

# MoMo Payment Gateway
MOMO_PARTNER_CODE=your_momo_partner_code
MOMO_ACCESS_KEY=your_momo_access_key
MOMO_SECRET_KEY=your_momo_secret_key
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_RETURN_URL=your_momo_return_url
MOMO_IPN_URL=your_momo_ipn_url

# Vietcombank Payment Gateway
VCB_MERCHANT_ID=your_vcb_merchant_id
VCB_API_KEY=your_vcb_api_key
VCB_ENDPOINT=https://api.vietcombank.com.vn/payment/v1
VCB_RETURN_URL=your_vcb_return_url
VCB_CANCEL_URL=your_vcb_cancel_url
```

4. Run the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## API Documentation

The API documentation is available at:
- **Swagger UI**: `http://localhost:3000/api-docs`

To generate the OpenAPI specification:
```bash
npm run swagger:gen
```

The generated OpenAPI JSON will be available at `.generated/openapi.json`

## Project Structure

```
Greedible-Backend/
├── src/
│   ├── app/
│   │   ├── api/                    # API routes
│   │   │   ├── customers/          # Customer authentication & management
│   │   │   ├── orders/             # Order management
│   │   │   ├── recipes/            # Recipe CRUD operations
│   │   │   ├── ingredients/        # Inventory management
│   │   │   ├── payments/           # Payment processing
│   │   │   ├── sales/              # Sales & revenue tracking
│   │   │   ├── suppliers/          # Supplier management
│   │   │   ├── schedules/          # Schedule management
│   │   │   ├── restock/            # Inventory restocking
│   │   │   └── swagger/            # API documentation endpoint
│   │   └── api-docs/               # Swagger UI page
│   ├── lib/
│   │   ├── auth/                   # Authentication middleware
│   │   ├── supabase/               # Supabase client configuration
│   │   ├── services/               # Payment service
│   │   └── utils/                  # Utility functions (CORS)
│   └── scripts/
│       └── swagger/                # Swagger generation script
├── .generated/                     # Generated OpenAPI spec
├── public/                         # Static assets
└── package.json
```

## Authentication & Authorization

The API uses JWT-based authentication with role-based access control:

### Customer Authentication
- Customers authenticate via `/api/customers/signin`
- Upon successful login, a JWT token is returned
- Token expires after 24 hours
- Protected routes require `Authorization: Bearer <token>` header

### Staff Authentication
- Staff members have roles (e.g., Manager, Staff)
- Staff tokens include role information
- Role-based authorization is enforced in middleware

### Authentication Middleware
Located in `src/lib/auth/middleware.tsx`:
- `authenticateToken()` - Validates staff JWT tokens
- `authenticateCustomerToken()` - Validates customer JWT tokens
- `authenticateCustomer()` - Customer login authentication
- `authenticateStaffLogin()` - Staff login authentication
- `isManager()` - Checks if user has manager role

## 📡 API Endpoints Overview

### Customer Management (`/api/customers`)
- `POST /api/customers/register` - Register new customer
- `POST /api/customers/signin` - Customer login
- `GET /api/customers/profile` - Get customer profile (protected)
- `PUT /api/customers/update-address` - Update customer address (protected)
- `POST /api/customers/forgot-password` - Password recovery

### Orders (`/api/orders`)
- `POST /api/orders/create` - Create order (protected)
- `GET /api/orders` - Get all orders (staff only)
- `GET /api/orders/user/orders` - Get customer's orders (protected)
- `GET /api/orders/revenue` - Get revenue statistics (staff only)
- `POST /api/orders/guest` - Create guest order
- `GET /api/orders/guest/orders/:phone` - Get guest orders by phone
- `POST /api/orders/[id]/complete` - Complete an order (staff only)
- `GET /api/orders/user/favorite-meals` - Get favorite meals (protected)

### Recipes (`/api/recipes`)
- `GET /api/recipes` - Get all recipes (with filters: calories, protein)
- `POST /api/recipes` - Create new recipe with image upload (staff only)
- `GET /api/recipes/[id]` - Get recipe by ID
- `PUT /api/recipes/[id]` - Update recipe (staff only)
- `DELETE /api/recipes/[id]` - Delete recipe (staff only)

### Ingredients (`/api/ingredients`)
- `GET /api/ingredients` - Get all ingredients
- `GET /api/ingredients/[id]` - Get ingredient by ID
- `POST /api/ingredients/[id]/restocks` - Record ingredient restock
- `POST /api/ingredients/waste` - Record ingredient waste

### Payments (`/api/payments`)
- `POST /api/payments/create` - Create payment request
- `POST /api/payments/momo/callback` - MoMo payment callback
- `POST /api/payments/vietcombank/callback` - Vietcombank payment callback

### Sales (`/api/sales`)
- `GET /api/sales` - Get sales statistics (daily/monthly)

### Suppliers (`/api/suppliers`)
- `GET /api/suppliers` - Get all suppliers
- `POST /api/suppliers` - Add supplier (staff only)

### Schedules (`/api/schedules`)
- `GET /api/schedules` - Get schedules
- `POST /api/schedules` - Create schedule (staff only)
- `PUT /api/schedules/[scheduleId]` - Update schedule (staff only)
- `DELETE /api/schedules/[scheduleId]` - Delete schedule (staff only)

### Restock (`/api/restock`)
- `GET /api/restock` - Get restock orders
- `POST /api/restock` - Create restock order (staff only)
- `PUT /api/restock/[id]` - Update restock order (staff only)

## System Workflows

### Order Creation Workflow

1. **Guest Order**:
   - Customer provides phone number and delivery details
   - System creates or retrieves guest customer account
   - Order is created with status "Pending"
   - Order auto-completes after 15 seconds (configurable)

2. **Registered Customer Order**:
   - Customer authenticates and receives JWT token
   - Customer creates order with items and delivery address
   - System calculates total including delivery charges
   - Payment is processed (cash or online payment gateway)
   - Order status updates to "Completed" upon payment confirmation

### Payment Processing Workflow

1. Customer initiates payment via `/api/payments/create`
2. Payment gateway (MoMo/Vietcombank) is called
3. Customer completes payment on gateway
4. Gateway sends callback to `/api/payments/{gateway}/callback`
5. System verifies payment signature
6. Order status is updated to "Completed"

### Recipe Availability Workflow

1. When fetching recipes, system checks ingredient quantities
2. Compares required ingredient weight with available stock
3. Recipe is marked as `is_available: true/false`
4. Unavailable recipes are still returned but flagged

### Inventory Management Workflow

1. **Restocking**:
   - Staff creates restock order via `/api/restock`
   - Ingredients are tracked with quantities and dates
   - Restock records linked to suppliers

2. **Waste Tracking**:
   - Staff records ingredient waste via `/api/ingredients/waste`
   - Inventory quantities are adjusted automatically

3. **Recipe Ingredient Usage**:
   - When order is completed, ingredient quantities are deducted
   - System prevents ordering recipes with insufficient ingredients

## 🔒 Security Features

- **Password Hashing**: All passwords are hashed using bcryptjs (10 rounds)
- **JWT Tokens**: Secure token-based authentication with expiration
- **CORS Configuration**: Configured for secure cross-origin requests
- **Role-Based Access**: Manager and Staff roles for administrative functions
- **Input Validation**: Request validation on all endpoints
- **Payment Verification**: HMAC signature verification for payment callbacks

## Development Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Generate OpenAPI/Swagger documentation
npm run swagger:gen
```

## CORS Configuration

The API is configured to accept requests from any origin. CORS headers are automatically added to all API routes via Next.js configuration. For production, consider restricting allowed origins.

## Database Schema (Supabase)

The application uses the following main tables:
- `customer` - Customer information and credentials
- `staff` - Staff members and roles
- `recipe` - Recipe/meal information
- `recipe_detail` - Recipe ingredients mapping
- `ingredient` - Ingredient inventory
- `sale` - Order/sale records
- `order_detail` - Order item details
- `supplier` - Supplier information
- `restock` - Restocking orders
- `schedule` - Schedule management

## Deployment

The application can be deployed to:
- **Vercel** (recommended for Next.js)
- **Netlify**
- **Any Node.js hosting platform**

Ensure all environment variables are set in your deployment platform.

## API Documentation

Interactive API documentation is available at `/api-docs` when the server is running. The documentation is generated from JSDoc comments in the route files using Swagger/OpenAPI 3.0 specification.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## Support

For support, contact: support@greedible.com

---

