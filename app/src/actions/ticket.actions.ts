"use server";

import { db } from "@/src/prisma/db";
import { revalidatePath } from "next/cache";
import { logEvent } from "../utils/sentry";
import { getCurrentUser } from "../lib/current-user";

export async function createTicket(
  prevState: { success: boolean; message: string },
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      logEvent("Unauthorized ticket creation attempt", "ticket", {}, "warning");

      return {
        success: false,
        message: "You must be logged in to create tickets",
      };
    }

    const subject = formData.get("subject") as string;
    const description = formData.get("description") as string;
    const priority = formData.get("priority") as string;

    if (!subject || !description || !priority) {
      logEvent(
        "Validation Error: Missing ticket fields",
        "ticket",
        {
          subject,
          description,
          priority,
        },
        "warning",
      );

      return { success: false, message: "All fields are required" };
    }

    const ticket = await db.orm.public.Ticket.create({
      subject,
      description,
      priority,
      userId: user.id,
    });

    logEvent(
      `Ticket was created successfully: ${ticket.id}`,
      "ticket",
      { ticketId: ticket.id },
      "info",
    );

    revalidatePath("/tickets");

    return { success: true, message: "Ticket created successfully" };
  } catch (error) {
    logEvent(
      "An error occured while creating the ticket",
      "ticket",
      {
        formData: Object.fromEntries(formData.entries()),
      },
      "error",
      error,
    );

    return {
      success: false,
      message: "An error occured while creating the ticket",
    };
  }
}

export async function getTickets() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      logEvent("Unauthorized ticket access attempt", "ticket", {}, "warning");

      return [];
    }

    const tickets = await db.orm.public.Ticket.where((u) =>
      u.userId.eq(user.id),
    )
      .orderBy((t) => t.createdAt.desc())
      .include("user")
      .all();

    logEvent(
      "Fetched tickets list",
      "tickets",
      { count: tickets.length },
      "info",
    );

    return tickets;
  } catch (error) {
    logEvent("Error fetching tickets", "tickets", {}, "error", error);

    return [];
  }
}

export async function getTicketById(id: string) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      logEvent(
        "Unauthorized ticket access attempt",
        "ticket",
        { ticketId: id },
        "warning",
      );

      return null;
    }

    const ticket = await db.orm.public.Ticket.where((t) => t.id.eq(Number(id)))
      .where((t) => t.userId.eq(user.id))
      .first();

    if (!ticket) {
      logEvent("Ticket not found", "ticket", { ticketId: id }, "warning");
    }

    return ticket;
  } catch (error) {
    logEvent(
      "Error fetching ticket details",
      "ticket",
      { ticketId: id },
      "error",
      error,
    );

    return null;
  }
}

export async function closeTicket(
  prevState: { success: boolean; message: string },
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      logEvent("Could not retrieve User ID", "ticket", {}, "warning");

      return { success: false, message: "User must be logged in" };
    }

    const ticketId = Number(formData.get("ticketId"));

    if (!ticketId) {
      logEvent("Could not retrieve Ticket ID", "ticket", {}, "warning");

      return { success: false, message: "Ticket ID is required" };
    }

    const ticket = await db.orm.public.Ticket.where((t) =>
      t.id.eq(ticketId),
    ).first();

    if (!ticket || ticket.userId !== user.id) {
      logEvent(
        "Unauthorized ticket close attempt",
        "ticket",
        { ticketId, userId: user.id },
        "warning",
      );

      return {
        success: false,
        message: "You are not authorized to close this ticket",
      };
    }

    await db.orm.public.Ticket.where({ id: ticketId }).update({
      status: "Closed",
    });

    revalidatePath("/tickets");
    revalidatePath(`/tickets/${ticketId}`);

    return { success: true, message: "Ticket closed successfully" };
  } catch (error) {
    logEvent(
      "Error fetching ticket details",
      "ticket",
      { formData: Object.fromEntries(formData.entries()) },
      "error",
      error,
    );

    return { success: false, message: "Error closing the ticket" };
  }
}
