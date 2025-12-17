
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipe_id } = body;

    // Validate input
    if (!recipe_id || isNaN(Number(recipe_id))) {
      return NextResponse.json(
        { success: false, message: 'Invalid or missing recipe_id' },
        { status: 400 }
      );
    }

    // Update recipe status to 'unavailable'
    const { data, error } = await supabase
      .from('recipe')
      .update({ status: 'available' })
      .eq('recipe_id', recipe_id)
      .select()
      .single();

    if (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update recipe status';
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to update recipe status',
          error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, message: 'Recipe not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Recipe status updated to available',
      data,
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
