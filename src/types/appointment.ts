// Real appointment scheduling -- see sql/020_appointments.sql.

export type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show";

export interface Appointment {
  id: string;
  participantId: string;
  clinicianUserId: string;
  scheduledAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  notes?: string;
  reminderSentAt?: string;
  createdAt: string;
  updatedAt: string;
}
