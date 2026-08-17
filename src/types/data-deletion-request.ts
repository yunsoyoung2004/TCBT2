// Patient self-service data deletion requests -- see
// sql/018_data_deletion_requests.sql. A REQUEST, never an automatic
// delete -- see that migration's own doc comment for why.

export type DataDeletionRequestStatus = "pending" | "completed" | "denied";

export interface DataDeletionRequest {
  id: string;
  participantId: string;
  requestedByUserId: string;
  status: DataDeletionRequestStatus;
  reason?: string;
  createdAt: string;
  resolvedAt?: string;
}
