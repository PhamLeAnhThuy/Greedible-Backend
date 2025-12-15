import { NextRequest, NextResponse } from 'next/server';
import { supabase } from "@/src/lib/supabase/client";

export async function GET(request: NextRequest) {
  try {


    const { data: suppliers, error } = await supabase
      .from('supplier')
      .select('supplier_id, supplier_name, phone, address');

    if (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch suppliers';
      return NextResponse.json(
        {
          success: false,
          message: 'Error fetching suppliers',
          error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: suppliers || [],
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
