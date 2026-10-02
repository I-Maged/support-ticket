"use server";

import { db } from "@/src/prisma/db";
import { revalidatePath } from "next/cache";
import { logEvent } from "../utils/sentry";
import { OrderByItem } from "@prisma/orm-postgres/relational-core";
import { count } from "console";

export async function createTicket(
  prevState: { success: boolean; message: string },
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  try {
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
    const tickets = await db.orm.public.Ticket.orderBy((t) =>
      t.createdAt.desc(),
    )
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
    const ticket = await db.orm.public.Ticket.where((u) =>
      u.id.eq(Number(id)),
    ).first();

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
