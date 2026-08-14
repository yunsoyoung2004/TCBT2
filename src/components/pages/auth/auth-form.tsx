"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Field, inputClass } from "@/components/ui/primitives";
import { useT } from "@/lib/i18n/context";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AppRole } from "@/lib/auth/auth-context";

// Shared by clinician-auth-page.tsx and patient-auth-page.tsx -- the two
// pages are identical apart from which role they sign up as and where a
// successful login lands, so that's all this component takes as props.
export function AuthForm({ role, titleKey, redirectTo }: { role: AppRole; titleKey: string; redirectTo: string }) {
  const { t } = useT();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);
  // Set only when signInWithPassword succeeded but the account has a
  // verified TOTP factor (see mfa-settings.tsx) -- login isn't complete
  // until the challenge below is verified too.
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    try {
      if (mode === "signup") {
        const { error: signupError } = await supabase.auth.signUp({
          email,
          password,
          // Without this, the confirmation email's final redirect falls
          // back to the Supabase project's dashboard-configured "Site URL"
          // -- which defaults to http://localhost:3000 and was never
          // updated for production, so every confirmation link dead-ends
          // with ERR_CONNECTION_REFUSED once it leaves Supabase's own
          // verification step. window.location.origin always matches
          // wherever the signup actually happened (production or local
          // dev), so this is correct in both. Still requires that origin
          // to be on the project's Auth > URL Configuration redirect
          // allow-list, or Supabase silently ignores this and falls back
          // to Site URL anyway.
          options: { data: { role }, emailRedirectTo: `${window.location.origin}${redirectTo}` },
        });
        if (signupError) throw signupError;
        setConfirmSent(true);
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;
        // Password alone only gets the session to aal1. If the account has
        // a verified TOTP factor, nextLevel comes back aal2 and login
        // isn't actually complete yet -- pause here for the code instead
        // of navigating away with a session the app would otherwise treat
        // as fully authenticated.
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal && aal.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
          const { data: factors } = await supabase.auth.mfa.listFactors();
          const totpFactor = factors?.totp.find((factor: { status: string; id: string }) => factor.status === "verified");
          if (totpFactor) {
            setMfaFactorId(totpFactor.id);
            return;
          }
        }
        router.push(redirectTo);
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message.toLowerCase() : "";
      if (message.includes("email not confirmed")) setError(t("auth.errors.emailNotConfirmed"));
      else if (message.includes("invalid login credentials")) setError(t("auth.errors.invalidCredentials"));
      else setError(mode === "signup" ? t("auth.errors.genericSignup") : t("auth.errors.genericLogin"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleMfaSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!mfaFactorId) return;
    setSubmitting(true);
    setMfaError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: challenge.id, code: mfaCode.trim() });
      if (verifyError) throw verifyError;
      router.push(redirectTo);
    } catch {
      setMfaError(t("mfa.challengeFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (mfaFactorId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-subtle p-4">
        <Card className="w-full max-w-sm p-6">
          <h1 className="text-base font-semibold text-text-primary">{t("mfa.challengeTitle")}</h1>
          <form className="mt-5 grid gap-4" onSubmit={handleMfaSubmit}>
            <Field label={t("mfa.codeLabel")}>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                className={inputClass}
                placeholder={t("mfa.challengePlaceholder")}
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value)}
              />
            </Field>
            {mfaError && <p className="text-xs text-critical">{mfaError}</p>}
            <Button type="submit" loading={submitting} disabled={!mfaCode.trim()} className="w-full justify-center">
              {t("mfa.challengeSubmit")}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  if (confirmSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-subtle p-4">
        <Card className="w-full max-w-sm p-6 text-center">
          <h1 className="text-base font-semibold text-text-primary">{t("auth.confirmEmailTitle")}</h1>
          <p className="mt-2 text-sm text-text-secondary">{t("auth.confirmEmailBody", { email })}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle p-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-base font-semibold text-text-primary">{t(titleKey)}</h1>
        <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
          <Field label={t("auth.email")}>
            <input
              type="email"
              required
              autoComplete="email"
              className={inputClass}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field label={t("auth.password")}>
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className={inputClass}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          {error && <p className="text-xs text-critical">{error}</p>}
          <Button type="submit" loading={submitting} className="w-full justify-center">
            {mode === "signup" ? t("auth.submitSignup") : t("auth.submitLogin")}
          </Button>
        </form>
        <button
          type="button"
          className="mt-4 w-full text-center text-xs text-clinical-blue hover:underline"
          onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(null); }}
        >
          {mode === "signup" ? t("auth.switchToLogin") : t("auth.switchToSignup")}
        </button>
        <Link href="/crisis" target="_blank" rel="noopener noreferrer" className="mt-2 block w-full text-center text-xs text-critical hover:underline">
          {t("patientShell.crisisHelp")}
        </Link>
      </Card>
    </div>
  );
}
