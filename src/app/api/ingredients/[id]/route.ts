import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@/src/lib/supabase/server';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const body = await request.json();
    const { ingredient_name, quantity, unit, minimum_threshold, supplier_id, good_for } = body;

    if (!ingredient_name || quantity === undefined || unit === undefined) {
      return NextResponse.json(
        { success: false, error: 'Ingredient name, quantity, and unit are required' },
        { status: 400 }
      );
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

    if (updateError) throw updateError;
    if (!updatedData || updatedData.length === 0) {
      return NextResponse.json({ success: false, error: 'Ingredient not found' }, { status: 404 });
    }

    // update supplier_product
    await supabase.from('supplier_product').delete().eq('ingredient_id', id);

    if (supplier_id) {
      const { error: supplierError } = await supabase
        .from('supplier_product')
        .insert({ ingredient_id: id, supplier_id });

      if (supplierError) throw supplierError;
    }

    return NextResponse.json({ success: true, message: 'Ingredient updated successfully' });
  } catch (error) {
    console.error('Error updating ingredient:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { success: false, error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? msg : undefined },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const supabase = await createServerClient();

    // avoid FK issues
    await supabase.from('supplier_product').delete().eq('ingredient_id', id);

    const { error: deleteError, data: deletedData } = await supabase
      .from('ingredient')
      .delete()
      .eq('ingredient_id', id)
      .select('ingredient_id');

    if (deleteError) throw deleteError;

    if (!deletedData || deletedData.length === 0) {
      return NextResponse.json({ success: false, error: 'Ingredient not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Ingredient deleted successfully' });
  } catch (error) {
    console.error('Error deleting ingredient:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';

    if (msg.includes('foreign key') || msg.includes('referenced')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete ingredient because it is referenced by recipes, restock orders, or waste records.'
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? msg : undefined },
      { status: 500 }
    );
  }
}
