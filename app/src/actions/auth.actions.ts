"use server";

import { db } from "@/src/prisma/db";
import bcrypt from "bcryptjs";
import { logEvent } from "../utils/sentry";
import { signAuthToken, setAuthCookie } from "../lib/auth";

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
