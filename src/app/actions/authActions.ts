"use server";

import { prisma } from "@/lib/prisma";
import { setSessionUser, clearSessionUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function switchUserAction(formData: FormData) {
  const userId = formData.get("userId") as string;
  if (!userId) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      boatOwner: true,
      buyer: true,
    },
  });

  if (!user) return;

  await setSessionUser({
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role as "OPERATOR" | "BOAT_OWNER" | "BUYER",
    boatOwnerId: user.boatOwnerId,
    buyerId: user.buyerId,
    boatName: user.boatOwner?.boatName || null,
    companyName: user.buyer?.businessName || user.buyer?.contactName || null,
  });

  revalidatePath("/", "layout");

  if (user.role === "BOAT_OWNER") {
    redirect("/boat-owner");
  } else if (user.role === "BUYER") {
    redirect("/buyer");
  } else {
    redirect("/contacts");
  }
}

export async function loginAction(formData: FormData) {
  const phone = formData.get("phone") as string;
  const pin = formData.get("pin") as string;

  if (!phone || !pin) {
    redirect("/login?error=Please%20enter%20both%20phone%20number%20and%20PIN");
  }

  const user = await prisma.user.findUnique({
    where: { phone: phone.trim() },
    include: {
      boatOwner: true,
      buyer: true,
    },
  });

  if (!user || user.pin !== pin.trim()) {
    redirect("/login?error=Invalid%20mobile%20number%20or%20PIN");
  }

  await setSessionUser({
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role as "OPERATOR" | "BOAT_OWNER" | "BUYER",
    boatOwnerId: user.boatOwnerId,
    buyerId: user.buyerId,
    boatName: user.boatOwner?.boatName || null,
    companyName: user.buyer?.businessName || user.buyer?.contactName || null,
  });

  revalidatePath("/", "layout");

  if (user.role === "BOAT_OWNER") {
    redirect("/boat-owner");
  } else if (user.role === "BUYER") {
    redirect("/buyer");
  } else {
    redirect("/contacts");
  }
}

export async function logoutAction() {
  await clearSessionUser();
  revalidatePath("/", "layout");
  redirect("/login");
}
