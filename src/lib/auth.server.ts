import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const ADMIN_EMAIL = "admin@fitnesscoach.app";
export const ADMIN_PASSWORD = "fitnesscoach@123";

function isDuplicateEmailError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "email_exists") return true;
  const msg = (error.message ?? "").toLowerCase();
  return msg.includes("already registered") || msg.includes("already been registered") || msg.includes("already exists");
}

/**
 * Creates a pre-confirmed auth user if one doesn't already exist for this email — no email
 * verification link is ever sent. Idempotent: calling this again for an existing email is a no-op.
 */
export async function ensureConfirmedUser(
  email: string,
  password: string,
  metadata: { role: "admin" | "client"; full_name: string },
): Promise<{ created: boolean }> {
  const { error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (!error) return { created: true };
  if (isDuplicateEmailError(error)) return { created: false };
  throw new Error(error.message);
}
