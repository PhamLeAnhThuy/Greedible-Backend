import { NextResponse } from 'next/server';
import { supabase } from "@/src/lib/supabase/client";

/**
 * @swagger
 * /api/recipes/{id}:
 *   get:
 *     summary: Get recipe details
 *     description: Retrieve detailed information for a specific recipe including ingredients.
 *     tags: [Recipes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Recipe details with ingredients
 *       404:
 *         description: Recipe not found
 *       500:
 *         description: Server error
 *   put:
 *     summary: Update a recipe
 *     description: Update recipe details and ingredients.
 *     tags: [Recipes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               recipe_name:
 *                 type: string
 *               category:
 *                 type: string
 *               calories:
 *                 type: number
 *               protein:
 *                 type: number
 *               fat:
 *                 type: number
 *               carbohydrate:
 *                 type: number
 *               fiber:
 *                 type: number
 *               price:
 *                 type: number
 *               image_url:
 *                 type: string
 *               ingredients:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     ingredient_id:
 *                       type: number
 *                     weight:
 *                       type: number
 *     responses:
 *       200:
 *         description: Recipe updated successfully
 *       404:
 *         description: Recipe not found
 *       500:
 *         description: Server error
 *   delete:
 *     summary: Delete a recipe
 *     description: Delete a recipe and its associated ingredients and image.
 *     tags: [Recipes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Recipe deleted successfully
 *       404:
 *         description: Recipe not found
 *       500:
 *         description: Server error
 */

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: recipeId } = await params;

    // Get recipe details
    const { data: recipe, error: recipeError } = await supabase
      .from('recipe')
      .select('*')
      .eq('recipe_id', recipeId)
      .single();

    if (recipeError || !recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    // Get ingredients
    const { data: ingredientRows, error: ingredientError } = await supabase
      .from('recipe_detail')
      .select(`
        ingredient_id,
        weight,
        ingredient:ingredient_id(ingredient_name)
      `)
      .eq('recipe_id', recipeId);

    if (ingredientError) throw ingredientError;

    const ingredients = ingredientRows?.map((row: any) => ({
      ingredient_id: row.ingredient_id,
      ingredient: row.ingredient.ingredient_name,
      amount: row.weight
    })) || [];

    const response = {
      recipe_id: recipe.recipe_id,
      recipe_name: recipe.recipe_name,
      category: recipe.category,
      calories: recipe.calories,
      protein: recipe.protein,
      fat: recipe.fat,
      carbohydrate: recipe.carbohydrate,
      fiber: recipe.fiber,
      price: recipe.price,
      image_url: recipe.image_url,
      ingredients
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching recipe details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: recipeId } = await params;
    const body = await request.json();
    const { 
      recipe_name, 
      category, 
      calories, 
      protein, 
      fat, 
      carbohydrate, 
      fiber, 
      price, 
      image_url, 
      ingredients 
    } = body;



    // Update recipe
    const { error: updateError } = await supabase
      .from('recipe')
      .update({
        recipe_name,
        category,
        calories,
        protein,
        fat,
        carbohydrate,
        fiber,
        price,
        image_url
      })
      .eq('recipe_id', recipeId);

    if (updateError) throw updateError;

    // Delete existing ingredients
    const { error: deleteError } = await supabase
      .from('recipe_detail')
      .delete()
      .eq('recipe_id', recipeId);

    if (deleteError) throw deleteError;

    // Insert new ingredients
    if (ingredients && ingredients.length > 0) {
      const recipeDetails = ingredients.map((ing: any) => ({
        recipe_id: recipeId,
        ingredient_id: ing.ingredient_id,
        weight: parseFloat(ing.weight) || 0
      }));

      const { error: insertError } = await supabase
        .from('recipe_detail')
        .insert(recipeDetails);

      if (insertError) throw insertError;
    }

    return NextResponse.json({ message: 'Recipe updated successfully' });
  } catch (error) {
    console.error('Error updating recipe:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: recipeId } = await params;



    // Get recipe to retrieve image URL
    const { data: recipe, error: getError } = await supabase
      .from('recipe')
      .select('image_url')
      .eq('recipe_id', recipeId)
      .single();

    if (getError || !recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    // Delete from order_detail (foreign key)
    await supabase
      .from('order_detail')
      .delete()
      .eq('recipe_id', recipeId);

    // Delete from recipe_detail
    await supabase
      .from('recipe_detail')
      .delete()
      .eq('recipe_id', recipeId);

    // Delete recipe
    const { error: deleteError } = await supabase
      .from('recipe')
      .delete()
      .eq('recipe_id', recipeId);

    if (deleteError) throw deleteError;

    // Try to delete image from storage if it exists
    if (recipe.image_url) {
      try {
        const fileName = recipe.image_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('recipe-images')
            .remove([`recipes/${fileName}`]);
        }
      } catch (storageError) {
        console.error('Error deleting image file:', storageError);
        // Continue even if image deletion fails
      }
    }

    return NextResponse.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}
