import jwt, { JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createServerClient } from '../supabase/server';

// JWT Payload types
interface StaffJwtPayload extends JwtPayload {
  id: number;
  email: string;
  role?: string;
  type?: 'staff';
}

interface CustomerJwtPayload extends JwtPayload {
  id: number;
  email: string;
  type: 'customer';
}

/**
 * Authenticate JWT token (for staff)
 * Returns { user, error } - if error exists, return error response
 */
export async function authenticateToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return { 
      error: { 
        status: 401, 
        message: 'No token provided' 
      } 
    };
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as StaffJwtPayload;
    const supabase = await createServerClient(); 

    // Fetch staff user details from Supabase
    const { data: staff, error: dbError } = await supabase
      .from('staff')
      .select('staff_id, staff_name, staff_email, role')
      .eq('staff_id', decoded.id)
      .single();

    if (dbError || !staff) {
      console.error('Staff user not found for ID:', decoded.id);
      return { 
        error: { 
          status: 404, 
          message: 'Staff user not found' 
        } 
      };
    }

    return { user: staff, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('JWT verification failed:', errorMessage);
    return { 
      error: { 
        status: 403, 
        message: 'Invalid token' 
      } 
    };
  }
}

/**
 * Authenticate customer login (returns token and user)
 * This is used in login endpoints, not as middleware
 */
export async function authenticateCustomer(email: string, password: string) {
  try {
    const supabase = await createServerClient(); 

    // Get customer from database
    const { data: customers, error: dbError } = await supabase
      .from('customer')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (dbError) {
      throw dbError;
    }

    if (!customers || customers.length === 0) {
      return { 
        error: { 
          status: 401, 
          message: 'Invalid email or password' 
        } 
      };
    }

    const customer = customers[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, customer.password);
    if (!validPassword) {
      return { 
        error: { 
          status: 401, 
          message: 'Invalid email or password' 
        } 
      };
    }

    // Create token
    const token = jwt.sign(
      { 
        id: customer.customer_id,
        email: customer.email,
        type: 'customer'
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    return {
      token,
      user: {
        id: customer.customer_id,
        name: customer.customer_name,
        email: customer.email,
        type: 'customer'
      },
      error: null
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return { 
      error: { 
        status: 500, 
        message: 'Internal server error' 
      } 
    };
  }
}

/**
 * Authenticate staff login (returns token and user)
 * This is used in login endpoints, not as middleware
 */
export async function authenticateStaffLogin(email: string, password: string) {
  try {
    const supabase = await createServerClient(); 

    // Get staff from database
    const { data: staff, error: dbError } = await supabase
      .from('staff')
      .select('staff_id, staff_name, staff_email, password, role')
      .eq('staff_email', email)
      .limit(1);

    if (dbError) {
      throw dbError;
    }

    if (!staff || staff.length === 0) {
      return { 
        error: { 
          status: 401, 
          message: 'Invalid email or password' 
        } 
      };
    }

    const staffMember = staff[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, staffMember.password);
    if (!validPassword) {
      return { 
        error: { 
          status: 401, 
          message: 'Invalid email or password' 
        } 
      };
    }

    // Create token
    const token = jwt.sign(
      { 
        id: staffMember.staff_id,
        email: staffMember.staff_email,
        role: staffMember.role,
        type: 'staff'
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    return {
      token,
      user: {
        id: staffMember.staff_id,
        name: staffMember.staff_name,
        role: staffMember.role,
        email: staffMember.staff_email
      },
      error: null
    };
  } catch (error) {
    console.error('Staff login error:', error);
    return { 
      error: { 
        status: 500, 
        message: 'Internal server error' 
      } 
    };
  }
}

/**
 * Authenticate customer JWT token (for protected routes)
 * Returns { user, error } - if error exists, return error response
 */
export async function authenticateCustomerToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return { 
      error: { 
        status: 401, 
        message: 'No token provided' 
      } 
    };
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as CustomerJwtPayload;

    // Ensure the token is for a customer
    if (decoded.type !== 'customer') {
      console.error('Token is not for a customer:', decoded);
      return { 
        error: { 
          status: 403, 
          message: 'Access denied. Customer token required.' 
        } 
      };
    }

    const supabase = await createServerClient(); 

    // Fetch customer details from Supabase
    const { data: customers, error: dbError } = await supabase
      .from('customer')
      .select('customer_id, customer_name, email, phone, loyalty_point, address')
      .eq('customer_id', decoded.id)
      .limit(1);

    if (dbError) {
      throw dbError;
    }

    if (!customers || customers.length === 0) {
      console.error('Customer not found for ID:', decoded.id);
      return { 
        error: { 
          status: 404, 
          message: 'Customer not found' 
        } 
      };
    }

    return { user: customers[0], error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('JWT verification failed:', errorMessage);
    return { 
      error: { 
        status: 403, 
        message: 'Invalid token' 
      } 
    };
  }
}

/**
 * Check if user is staff (must be called after authenticateToken)
 */
export function isStaff(user: any) {
  return user && user.role; // Staff will have a role field
}

/**
 * Check if user is manager (must be called after authenticateToken)
 */
export function isManager(user: any) {
  return user && user.role === 'Manager';
}

// Export all functions
export default {
  authenticateToken,
  authenticateCustomer,
  authenticateStaffLogin,
  authenticateCustomerToken,
  isStaff,
  isManager
};