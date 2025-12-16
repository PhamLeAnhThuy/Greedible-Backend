import { NextResponse } from 'next/server';
import { supabase } from "@/src/lib/supabase/client";
import { authenticateToken } from '@/src/lib/auth/middleware';

export async function GET(request: Request) {
  try {
    const authResult = await authenticateToken(request);
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error.message }, { status: authResult.error.status });
    }



    const { data: ingredients, error } = await supabase
      .from('ingredient')
      .select(`
        ingredient_id,
        ingredient_name,
        unit,
        quantity,
        minimum_threshold,
        good_for,
        supplier_product(supplier(supplier_name))
      `)
      .order('ingredient_name', { ascending: true });

    if (error) {
      throw error;
    }

    // Format the response to match the original structure
    const formattedIngredients = ingredients?.map((ing: any) => ({
      ingredient_id: ing.ingredient_id,
      ingredient_name: ing.ingredient_name,
      unit: ing.unit,
      quantity: ing.quantity,
      minimum_threshold: ing.minimum_threshold,
      good_for: ing.good_for,
      supplier_name: ing.supplier_product && ing.supplier_product.length > 0 
        ? ing.supplier_product[0].supplier.supplier_name 
        : null
    })) || [];

    return NextResponse.json({ success: true, ingredients: formattedIngredients });
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, message: 'Internal server error', error: process.env.NODE_ENV === 'development' ? errorMessage : undefined }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ingredient_name, quantity, unit, minimum_threshold, supplier_id } = body;

    if (!ingredient_name || quantity === undefined || unit === undefined) {
      return NextResponse.json(
        { success: false, error: 'Ingredient name, quantity, and unit are required' },
        { status: 400 }
      );
    }

    // 1. Check if ingredient name already exists
    const { data: existingIngredient, error: checkError } = await supabase
      .from('ingredient')
      .select('ingredient_id')
      .eq('ingredient_name', ingredient_name)
      .maybeSingle();

    if (checkError) {
      throw checkError;
    }

    if (existingIngredient) {
      return NextResponse.json(
        { success: false, error: 'Ingredient already exists' },
        { status: 409 } // Conflict
      );
    }

    // 2. Insert new ingredient
    const { data: newIngredient, error: insertError } = await supabase
      .from('ingredient')
      .insert({
        ingredient_name,
        quantity,
        unit,
        minimum_threshold
      })
      .select('ingredient_id')
      .single();

    if (insertError) {
      throw insertError;
    }

    // 3. Link supplier if provided
    if (supplier_id && newIngredient) {
      const { error: supplierError } = await supabase
        .from('supplier_product')
        .insert({
          ingredient_id: newIngredient.ingredient_id,
          supplier_id
        });

      if (supplierError) {
        throw supplierError;
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Ingredient added successfully',
        ingredientId: newIngredient.ingredient_id
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding ingredient:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
