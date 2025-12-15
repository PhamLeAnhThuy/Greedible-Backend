import { NextResponse } from 'next/server';
import { supabase } from "@/src/lib/supabase/client";
import { authenticateCustomerToken } from '@/src/lib/auth/middleware';

/**
 * @swagger
 * /api/customers/update-address:
 *   put:
 *     summary: Update customer address
 *     description: Updates the address for the authenticated customer. Requires valid JWT token.
 *     tags: [Customers]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *             properties:
 *               address:
 *                 type: object
 *                 required:
 *                   - ward
 *                   - district
 *                   - street
 *                   - houseNumber
 *                 properties:
 *                   ward:
 *                     type: string
 *                     example: "Ward 5"
 *                   district:
 *                     type: string
 *                     example: "District 1"
 *                   street:
 *                     type: string
 *                     example: "Nguyen Trai"
 *                   houseNumber:
 *                     type: string
 *                     example: "123A"
 *                   buildingName:
 *                     type: string
 *                     nullable: true
 *                     example: "Sunrise Building"
 *                   block:
 *                     type: string
 *                     nullable: true
 *                     example: "Block B"
 *                   floor:
 *                     type: string
 *                     nullable: true
 *                     example: "10"
 *                   roomNumber:
 *                     type: string
 *                     nullable: true
 *                     example: "1005"
 *     responses:
 *       200:
 *         description: Address updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Address updated successfully"
 *                 address:
 *                   type: object
 *                   description: Updated address object
 *       400:
 *         description: Missing required address fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Required address fields are missing"
 *       401:
 *         description: Unauthorized - No token provided or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "No token provided"
 *       500:
 *         description: Server error during address update
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Error updating address"
 */

export async function PUT(request: Request) {
  try {
    const authResult = await authenticateCustomerToken(request);
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error.message }, { status: authResult.error.status });
    }

    const { address } = await request.json();

    if (!address || !address.ward || !address.district || !address.street || !address.houseNumber) {
      return NextResponse.json({ success: false, message: 'Required address fields are missing' }, { status: 400 });
    }

    const addressJson = JSON.stringify(address);



    const { error: updateError } = await supabase
      .from('customer')
      .update({ address: addressJson })
      .eq('customer_id', authResult.user!.customer_id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, message: 'Address updated successfully', address });
  } catch (error) {
    console.error('Error updating address:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, message: 'Error updating address', error: process.env.NODE_ENV === 'development' ? errorMessage : undefined }, { status: 500 });
  }
}
