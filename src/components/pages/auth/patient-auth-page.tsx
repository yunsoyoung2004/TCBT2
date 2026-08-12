"use client";

import { AuthForm } from "@/components/pages/auth/auth-form";

export function PatientAuthPage() {
  return <AuthForm role="patient" titleKey="auth.patientTitle" redirectTo="/projects/demo/patient" />;
}
