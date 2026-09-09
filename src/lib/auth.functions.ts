import { createServerFn } from "@tanstack/react-start";
import { ADMIN_EMAIL, ADMIN_PASSWORD, ensureConfirmedUser } from "./auth.server";

type BootstrapResult = { ok: boolean; message?: string };

/**
 * Idempotently makes sure the single fixed coach account exists and is pre-confirmed.
 * Takes no meaningful input — it only ever provisions the one fixed admin identity, so it's
 * safe to call from an unauthenticated screen.
 */
export const bootstrapAdminAccount = createServerFn({ method: "POST" }).handler(
  async (): Promise<BootstrapResult> => {
    try {
      await ensureConfirmedUser(ADMIN_EMAIL, ADMIN_PASSWORD, { role: "admin", full_name: "Coach" });
      return { ok: true };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Could not set up the coach account." };
    }
  },
);

type ClientSignUpInput = { name: string; email: string; password: string };
type ClientSignUpResult = { ok: true } | { ok: false; message: string };

export const signUpClient = createServerFn({ method: "POST" })
  .validator((input: ClientSignUpInput) => input)
  .handler(async ({ data }): Promise<ClientSignUpResult> => {
    const name = data.name.trim().slice(0, 120);
    const email = data.email.trim().toLowerCase();
    const password = data.password;
    if (!name) return { ok: false, message: "Please enter your name." };
    if (!email || !email.includes("@")) return { ok: false, message: "Please enter a valid email." };
    if (password.length < 6) return { ok: false, message: "Password must be at least 6 characters." };
    try {
      const result = await ensureConfirmedUser(email, password, { role: "client", full_name: name });
      if (!result.created) return { ok: false, message: "This email is already registered. Try logging in instead." };
      return { ok: true };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Could not create this account." };
    }
  });
