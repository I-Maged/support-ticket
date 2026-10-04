import { verifyAuthToken, getAuthCookie } from "./auth";
import { db } from "@/src/prisma/db";

type AuthPayload = {
  userId: string;
};

export async function getCurrentUser() {
  try {
    const token = await getAuthCookie();

    if (!token) return null;

    const payload = (await verifyAuthToken(token)) as AuthPayload;

    if (!payload?.userId) return null;

    const user = await db.orm.public.User.where((u) => u.id.eq(payload.userId))
      .select("id", "email", "name")
      .first();

    return user;
  } catch (error) {
    console.log("Error getting the current user", error);
    return null;
  }
}
