import { NextResponse } from 'next/server';
import { supabase } from "@/src/lib/supabase/client";
import { authenticateToken } from '@/src/lib/auth/middleware';
import { handleCorsOptions } from '@/src/lib/utils/cors';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      items,
      delivery_address,
      delivery_distance,
      delivery_charge,
      payment_method,
      phone_number
    } = body;

    // Validation
    if (!items || !delivery_address || !delivery_distance || !phone_number) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields'
      }, { status: 400 });
    }



    // Check if guest customer exists
    const { data: existingGuest } = await supabase
      .from('customer')
      .select('customer_id')
      .eq('phone', phone_number)
      .ilike('customer_name', 'Guest_%')
      .limit(1);

    let customerId;

    if (existingGuest && existingGuest.length > 0) {
      customerId = existingGuest[0].customer_id;
      console.log('Using existing guest customer ID:', customerId);
    } else {
      // Create new guest customer
      const guestName = `Guest_${phone_number}`;
      const { data: newCustomer, error: customerError } = await supabase
        .from('customer')
        .insert({
          customer_name: guestName,
          phone: phone_number,
          password: 'guest_password',
          loyalty_point: 0,
          email: `guest_${phone_number}@temp.com`,
          address: delivery_address
        })
        .select('customer_id')
        .single();

      if (customerError) throw customerError;
      customerId = newCustomer.customer_id;
      console.log('Created new guest customer with ID:', customerId);
    }

    // Calculate total amount
    const totalAmount = items.reduce((total: number, item: any) => total + (item.price * item.quantity), 0);
    const normalizedPaymentMethod = payment_method === 'momo wallet' ? 'momo' : payment_method || 'cash';

    // Create sale record
    const { data: newSale, error: saleError } = await supabase
      .from('sale')
      .insert({
        total_amount: totalAmount,
        payment_method: normalizedPaymentMethod,
        status: 'Pending',
        customer_id: customerId,
        delivery_address,
        delivery_distance,
        delivery_charge
      })
      .select('sale_id')
      .single();

    if (saleError) throw saleError;

    const saleId = newSale.sale_id;
    console.log('Guest sale inserted with ID:', saleId);

    // Insert order details
    for (const item of items) {
      const { error: detailError } = await supabase
        .from('order_detail')
        .insert({
          sale_id: saleId,
          recipe_id: item.id,
          quantity: item.quantity
        });

      if (detailError) throw detailError;
    }

    // Auto-complete after 15 seconds
    setTimeout(async () => {
      try {
        await supabase
          .from('sale')
          .update({ status: 'Completed', completion_time: new Date().toISOString() })
          .eq('sale_id', saleId)
          .eq('status', 'Pending');

        console.log(`Order ${saleId} auto-completed`);
      } catch (err) {
        console.error('Auto-complete error:', err);
      }
    }, 15000);

    return NextResponse.json({
      success: true,
      message: 'Guest order created successfully',
      orderId: saleId,
      customerId
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating guest order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      message: 'Error creating guest order',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const authResult = await authenticateToken(request);
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error.message }, { status: authResult.error.status });
    }

    const { searchParams } = new URL(request.url);
    let sortBy = searchParams.get('sortBy') || 'time';
    let sortOrder = searchParams.get('sortOrder') || 'desc';

    // Validate inputs
    if (!['time', 'total_price'].includes(sortBy)) sortBy = 'time';
    if (!['asc', 'desc'].includes(sortOrder.toLowerCase())) sortOrder = 'desc';



    const orderBy = sortBy === 'total_price' ? 'total_amount' : 'sale_time';

    const { data: orders, error } = await supabase
      .from('sale')
      .select(`
        sale_id,
        sale_time,
        status,
        delivery_address,
        total_amount,
        customer:customer_id(customer_name, phone),
        order_detail(recipe:recipe_id(recipe_name), quantity)
      `)
      .order(orderBy, { ascending: sortOrder === 'asc' });

    if (error) throw error;

    // Format orders
    const formattedOrders = orders?.map((order: any) => ({
      order_id: order.sale_id,
      time: order.sale_time,
      status: order.status,
      delivery_address: order.delivery_address,
      total_price: order.total_amount,
      customer_name: order.customer.customer_name,
      phone: order.customer.phone,
      order_details: order.order_detail.map((od: any) => ({
        recipe_name: od.recipe.recipe_name,
        quantity: od.quantity
      }))
    })) || [];

    return NextResponse.json({ success: true, orders: formattedOrders });
  } catch (error) {
    console.error('Error fetching all orders:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      message: 'Error fetching all orders',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return handleCorsOptions();
}
