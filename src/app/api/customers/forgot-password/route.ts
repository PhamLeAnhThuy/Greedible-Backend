import { NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase/client";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }

    const { data: users, error: dbError } = await supabase
      .from("customer")
      .select("customer_id, email")
      .eq("email", email)
      .limit(1);

    if (dbError) {
      throw dbError;
    }

    // Even if user is not found, return a success message to prevent email enumeration
    if (!users || users.length === 0) {
      console.log("User with email not found:", email);
      return NextResponse.json({
        success: true,
        message:
          "If your email is in our system, you will receive a password reset link shortly.",
      });
    }

    // TODO: Generate a password reset token
    // TODO: Store the token in the database with an expiration time
    // TODO: Configure and send the email using Nodemailer

    return NextResponse.json({
      success: true,
      message:
        "If your email is in our system, you will receive a password reset link shortly.",
    });
  } catch (error) {
    console.error("Error in forgot password request:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        success: false,
        message: "An error occurred while processing your request.",
        error:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
