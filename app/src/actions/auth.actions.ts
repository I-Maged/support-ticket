"use server";

import { db } from "@/src/prisma/db";
import bcrypt from "bcryptjs";
import { logEvent } from "../utils/sentry";
import { signAuthToken, setAuthCookie, removeAuthCookie } from "../lib/auth";
import { redirect } from "next/navigation";

type ResponseResult = {
  success: boolean;
  message: string;
};

export async function registerUser(
  prevState: ResponseResult,
  formData: FormData,
): Promise<ResponseResult> {
  try {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!name || !email || !password) {
      logEvent(
        "Validation error: Missing register fields",
        "auth",
        { name, email },
        "warning",
      );

      return { success: false, message: "All fields are required" };
    }

    const existingUser = await db.orm.public.User.where((u) =>
      u.email.eq(email),
    ).first();

    if (existingUser) {
      logEvent(
        `Registeration error: User already exists ${email}`,
        "auth",
        { name, email },
        "warning",
      );

      return { success: false, message: "User already exists" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await db.orm.public.User.create({
      name,
      email,
      password: hashedPassword,
    });

    const token = await signAuthToken({ userId: user.id });

    await setAuthCookie(token);

    logEvent(
      `Successful Registeration: ${email}`,
      "auth",
      { userId: user.id, email },
      "info",
    );

    return { success: true, message: "User registered successfully" };
  } catch (error) {
    logEvent("Registeration failed", "auth", {}, "error", error);

    return {
      success: false,
      message: "Something went wrong, please try again",
    };
  }
}

export async function logoutUser(): Promise<{
  success: boolean;
  message: string;
} | void> {
  try {
    await removeAuthCookie();
    logEvent("User logged out successfully", "auth", {}, "info");
  } catch (error) {
    logEvent("Unexpected error logging out", "auth", {}, "error", error);
    return { success: false, message: "Logout failed. Please try again" };
  }

  redirect("/login");
}

export async function loginUser(
  prevState: ResponseResult,
  formData: FormData,
): Promise<ResponseResult> {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      logEvent("Failed login attempt", "auth", { email }, "warning");

      return { success: false, message: "All fields are required" };
    }

    const user = await db.orm.public.User.where((u) =>
      u.email.eq(email),
    ).first();

    if (!user || !user.password) {
      logEvent("Could not find user email", "auth", { email }, "warning");

      return { success: false, message: "Invalid credentials" };
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      logEvent("Wrong password", "auth", { email }, "warning");

      return { success: false, message: "Invalid credentials" };
    }

    const token = await signAuthToken({ userId: user.id });
    await setAuthCookie(token);

    return { success: true, message: "Logged in successfully" };
  } catch (error) {
    logEvent("Unexpected error during login", "auth", {}, "error", error);

    return { success: false, message: "Error during log in" };
  }
}
