import { NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase/server';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { ingredient_name, quantity, unit, minimum_threshold, supplier_id, good_for } = body;

    if (!ingredient_name || quantity === undefined || unit === undefined) {
      return NextResponse.json({ success: false, error: 'Ingredient name, quantity, and unit are required' }, { status: 400 });
    }

    const supabase = await createServerClient();

    const { error: updateError, data: updatedData } = await supabase
      .from('ingredient')
      .update({
        ingredient_name,
        quantity,
        unit,
        minimum_threshold,
        good_for
      })
      .eq('ingredient_id', id)
      .select('ingredient_id');

    if (updateError) {
      throw updateError;
    }

    if (!updatedData || updatedData.length === 0) {
      return NextResponse.json({ success: false, error: 'Ingredient not found' }, { status: 404 });
    }

    // Handle supplier_product table update
    await supabase
      .from('supplier_product')
      .delete()
      .eq('ingredient_id', id);

    if (supplier_id) {
      const { error: supplierError } = await supabase
        .from('supplier_product')
        .insert({
          ingredient_id: id,
          supplier_id
        });

      if (supplierError) {
        throw supplierError;
      }
    }

    return NextResponse.json({ success: true, message: 'Ingredient updated successfully' });
  } catch (error) {
    console.error('Error updating ingredient:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? errorMessage : undefined }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const supabase = await createServerClient();

    // First, delete from supplier_product to avoid foreign key constraint issues
    await supabase
      .from('supplier_product')
      .delete()
      .eq('ingredient_id', id);

    const { error: deleteError, data: deletedData } = await supabase
      .from('ingredient')
      .delete()
      .eq('ingredient_id', id)
      .select('ingredient_id');

    if (deleteError) {
      throw deleteError;
    }

    if (!deletedData || deletedData.length === 0) {
      return NextResponse.json({ success: false, error: 'Ingredient not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Ingredient deleted successfully' });
  } catch (error) {
    console.error('Error deleting ingredient:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check for foreign key constraint errors
    if (errorMessage.includes('foreign key') || errorMessage.includes('referenced')) {
      return NextResponse.json({ success: false, error: 'Cannot delete ingredient because it is referenced by recipes, restock orders, or waste records.' }, { status: 409 });
    }

    return NextResponse.json({ success: false, error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? errorMessage : undefined }, { status: 500 });
  }
}
