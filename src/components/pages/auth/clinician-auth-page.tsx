"use client";

import { AuthForm } from "@/components/pages/auth/auth-form";

export function ClinicianAuthPage() {
  return <AuthForm role="clinician" titleKey="auth.clinicianTitle" redirectTo="/projects/demo/protocols/tbct-br-001/canvas" />;
}
