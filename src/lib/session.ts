import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "session";

export type Session = {
  email: string;
  // "totp" = email OTP passed, authenticator code still required
  stage: "totp" | "full";
};

const key = () => new TextEncoder().encode(process.env.APP_SECRET);

export async function setSession(s: Session) {
  const ttl = s.stage === "totp" ? 5 * 60 : 8 * 60 * 60;
  const token = await new SignJWT({ ...s })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${ttl}s`)
    .sign(key());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ttl,
  });
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return { email: payload.email as string, stage: payload.stage as Session["stage"] };
  } catch {
    return null;
  }
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

/** Use in admin pages/actions. Redirects unless fully authenticated. */
export async function requireAdmin(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/admin/login");
  if (s.stage !== "full") redirect("/admin/verify");
  return s;
}
