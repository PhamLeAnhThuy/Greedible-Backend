import { NextResponse } from 'next/server';
import { supabase } from "@/src/lib/supabase/client";

/**
 * @swagger
 * /api/recipes:
 *   get:
 *     summary: Get all recipes
 *     description: Retrieve all recipes grouped by category with optional filters.
 *     tags: [Recipes]
 *     parameters:
 *       - in: query
 *         name: calories
 *         schema:
 *           type: string
 *           enum: ['< 300', '300 - 500', '> 500']
 *       - in: query
 *         name: protein
 *         schema:
 *           type: string
 *           enum: [Salmon, Tuna, Chicken, Shrimp, Scallop, Tofu]
 *     responses:
 *       200:
 *         description: List of recipes grouped by category
 *       500:
 *         description: Server error
 *   post:
 *     summary: Add a new recipe
 *     description: Create a new recipe with ingredients. Accepts multipart form with optional image upload.
 *     tags: [Recipes]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - recipe_name
 *               - category
 *               - price
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
 *               ingredients:
 *                 type: string
 *                 description: JSON array of ingredients with ingredient_id and weight
 *               image:
 *                 type: string
 *                 format: binary
 *               image_url:
 *                 type: string
 *                 description: Fallback image URL if no file uploaded
 *     responses:
 *       201:
 *         description: Recipe created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const calories = searchParams.get('calories');
    const protein = searchParams.get('protein');



    let query = supabase
      .from('recipe')
      .select('*');

    // Apply calories filter
    if (calories) {
      switch (calories) {
        case '< 300':
          query = query.lt('calories', 300);
          break;
        case '300 - 500':
          query = query.gte('calories', 300).lte('calories', 500);
          break;
        case '> 500':
          query = query.gt('calories', 500);
          break;
      }
    }

    const { data: recipes, error } = await query.order('category', { ascending: true }).order('recipe_name', { ascending: true });

    if (error) throw error;

    // For protein filter, we need to check ingredients
    let filteredRecipes = recipes || [];
    if (protein) {
      const proteinMap: Record<string, string[]> = {
        'Salmon': ['Salmon Fillet'],
        'Tuna': ['Cans tuna'],
        'Chicken': ['Chicken Breast Fillet', 'Chicken Thigh'],
        'Shrimp': ['Shrimp'],
        'Scallop': ['Scallop'],
        'Tofu': ['Tofu']
      };

      const targetIngredients = proteinMap[protein] || [];

      // Get recipe details with ingredients for protein filtering
      const { data: recipeDetails, error: detailError } = await supabase
        .from('recipe_detail')
        .select('recipe_id, ingredient:ingredient_id(ingredient_name)');

      if (!detailError && recipeDetails) {
        const recipeIdsWithProtein = new Set<number>();
        recipeDetails.forEach((rd: any) => {
          if (targetIngredients.includes(rd.ingredient.ingredient_name)) {
            recipeIdsWithProtein.add(rd.recipe_id);
          }
        });

        filteredRecipes = filteredRecipes.filter((r: any) => recipeIdsWithProtein.has(r.recipe_id));
      }
    }

    // Check availability for each recipe
    const enrichedRecipes = await Promise.all(
      filteredRecipes.map(async (recipe: any) => {
        const { data: ingredients } = await supabase
          .from('recipe_detail')
          .select('ingredient:ingredient_id(quantity), weight')
          .eq('recipe_id', recipe.recipe_id);

        const isAvailable = ingredients?.every((ing: any) => 
          (ing.ingredient?.quantity || 0) >= (ing.weight || 0)
        ) ?? true;

        return {
          id: recipe.recipe_id,
          name: recipe.recipe_name,
          price: recipe.price,
          rating: 5,
          image: recipe.image_url,
          calories: recipe.calories,
          protein: recipe.protein,
          fat: recipe.fat,
          fiber: recipe.fiber,
          carb: recipe.carbohydrate,
          is_available: isAvailable,
          status: recipe.status,
          category: recipe.category
          
        };
      })
    );

    // Group by category
    const categories = enrichedRecipes.reduce((acc: Record<string, any[]>, recipe: any) => {
      const category = recipe.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(recipe);
      return acc;
    }, {});

    const categoriesArray = Object.entries(categories).map(([name, items], index) => ({
      id: index + 1,
      name,
      items
    }));

    return NextResponse.json(categoriesArray);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const recipe_name = formData.get('recipe_name') as string;
    const category = formData.get('category') as string;
    const calories = formData.get('calories') as string;
    const protein = formData.get('protein') as string;
    const fat = formData.get('fat') as string;
    const carbohydrate = formData.get('carbohydrate') as string;
    const fiber = formData.get('fiber') as string;
    const price = formData.get('price') as string;
    const ingredientsJson = formData.get('ingredients') as string;
    const placeholderImageUrl = formData.get('image_url') as string;
    const imageFile = formData.get('image') as File;

    if (!recipe_name) {
      return NextResponse.json({ error: 'Recipe name is required' }, { status: 400 });
    }



    let imageUrl: string | null = placeholderImageUrl || null;

    // Parse ingredients
    let ingredients = [];
    if (ingredientsJson) {
      try {
        ingredients = JSON.parse(ingredientsJson);
      } catch (parseError) {
        return NextResponse.json({ error: 'Invalid ingredients data format' }, { status: 400 });
      }
    }

    // Insert recipe
    const { data: newRecipe, error: insertError } = await supabase
      .from('recipe')
      .insert({
        recipe_name,
        category,
        calories: parseFloat(calories) || 0,
        protein: parseFloat(protein) || 0,
        fat: parseFloat(fat) || 0,
        carbohydrate: parseFloat(carbohydrate) || 0,
        fiber: parseFloat(fiber) || 0,
        price: parseFloat(price) || 0,
        image_url: imageUrl
      })
      .select('recipe_id')
      .single();

    if (insertError) throw insertError;

    const recipeId = newRecipe.recipe_id;

    // Handle image upload to Supabase Storage
    if (imageFile && imageFile.size > 0) {
      try {
        const fileExtension = imageFile.name.split('.').pop() || 'png';
        const fileName = `RCP-${String(recipeId).padStart(3, '0')}.${fileExtension}`;
        const filePath = `recipes/${fileName}`;

        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { error: uploadError } = await supabase.storage
          .from('recipe-images')
          .upload(filePath, buffer, { upsert: true });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('recipe-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;

        // Update recipe with image URL
        await supabase
          .from('recipe')
          .update({ image_url: imageUrl })
          .eq('recipe_id', recipeId);
      } catch (uploadError) {
        console.error('Error uploading image:', uploadError);
        // Continue without image
      }
    }

    // Insert recipe details (ingredients)
    if (ingredients.length > 0) {
      const recipeDetails = ingredients.map((ing: any) => ({
        recipe_id: recipeId,
        ingredient_id: ing.ingredient_id,
        weight: parseFloat(ing.weight) || 0
      }));

      const { error: detailError } = await supabase
        .from('recipe_detail')
        .insert(recipeDetails);

      if (detailError) throw detailError;
    }

    return NextResponse.json({ 
      message: 'Recipe added successfully', 
      recipeId, 
      image_url: imageUrl 
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding recipe:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}
