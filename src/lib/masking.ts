/**
 * Masking and Privacy Utilities for KARAVALI Platform.
 * Ensures sensitive personal data (names, mobile numbers) are masked on the server
 * and never sent unmasked to unauthorized clients.
 */

export function maskName(name?: string | null, isOperator: boolean = false): string {
  if (!name) return "";
  if (isOperator) return name;

  const parts = name.trim().split(/\s+/);
  return parts
    .map((part) => {
      if (part.length <= 1) return part;
      // Show first letter followed by bullets
      return part[0] + "•".repeat(Math.max(4, part.length - 1));
    })
    .join(" ");
}

export function maskPhone(phone?: string | null, isOperator: boolean = false): string {
  if (!phone) return "";
  if (isOperator) return phone;

  const clean = phone.trim();
  if (clean.length <= 4) return "••••";
  const lastFour = clean.slice(-4);
  return "******" + lastFour;
}

export function maskBusiness(name?: string | null): string {
  if (!name) return "";
  // Business names like "Coastal Sea Products Ltd" can be shared for verified transactions,
  // but if needed can be trimmed
  return name.trim();
}
