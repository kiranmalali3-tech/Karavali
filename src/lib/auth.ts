import { cookies } from "next/headers";
import { prisma } from "./prisma";

export interface SessionUser {
  id: string;
  name: string;
  phone: string;
  role: "OPERATOR" | "BOAT_OWNER" | "BUYER";
  boatOwnerId?: string | null;
  buyerId?: string | null;
  boatName?: string | null;
  companyName?: string | null;
}

const COOKIE_NAME = "karavali_session";

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);

  if (sessionCookie?.value) {
    try {
      const data = JSON.parse(sessionCookie.value) as SessionUser;
      return data;
    } catch {
      return null;
    }
  }

  return null;
}

export async function setSessionUser(user: SessionUser) {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, JSON.stringify(user), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSessionUser() {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getAllProfiles() {
  const users = await prisma.user.findMany({
    include: {
      boatOwner: true,
      buyer: true,
    },
    orderBy: { name: "asc" },
  });

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    phone: u.phone,
    role: u.role as "OPERATOR" | "BOAT_OWNER" | "BUYER",
    boatOwnerId: u.boatOwnerId,
    buyerId: u.buyerId,
    boatName: u.boatOwner?.boatName || null,
    companyName: u.buyer?.businessName || u.buyer?.contactName || null,
  }));
}
