export const DOCUMENT_STATUSES = ["DRAFT", "ARCHIVED"] as const;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export interface HealthResponse {
  status: "ok";
  service: "aditya-api";
  timestamp: string;
}
