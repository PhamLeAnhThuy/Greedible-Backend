import { NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase/client';
import { authenticateCustomerToken } from '@/src/lib/auth/middleware';

export async function POST(request: Request) {
  try {
    const authResult = await authenticateCustomerToken(request);
    if (authResult.error) {
      return NextResponse.json(
        { success: false, message: authResult.error.message },
        { status: authResult.error.status }
      );
    }

    const body = await request.json();
    const {
      items,
      delivery_address,
      delivery_distance,
      delivery_charge,
      payment_method
    } = body;

    if (!items || !delivery_address || delivery_distance === undefined) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate total amount
    const totalAmount = items.reduce(
      (total: number, item: any) => total + item.price * item.quantity,
      0
    );

    const normalizedPaymentMethod =
      payment_method === 'momo wallet' ? 'momo' : payment_method || 'cash';

    const payment_status =
      normalizedPaymentMethod === 'vietcombank' ||
      normalizedPaymentMethod === 'momo'
        ? 'Paid'
        : 'Unpaid';

    // Create sale record
    const { data: newSale, error: saleError } = await supabase
      .from('sale')
      .insert({
        total_amount: totalAmount,
        payment_method: normalizedPaymentMethod,
        payment_status,
        status: 'Confirmed',
        customer_id: authResult.user!.customer_id,
        delivery_address,
        delivery_distance,
        delivery_charge
      })
      .select('sale_id')
      .single();

    if (saleError) throw saleError;

    const saleId = newSale.sale_id;

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

    return NextResponse.json(
      {
        success: true,
        message: 'Order created successfully',
        orderId: saleId
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating order:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        message: 'Error creating order',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
