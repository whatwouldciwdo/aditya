export const DOCUMENT_STATUSES = ["DRAFT", "ARCHIVED"] as const;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export interface HealthResponse {
  status: "ok";
  service: "aditya-api";
  timestamp: string;
}

export interface GasMixInput {
  loadMw: number;
  fgcCount: number;
}

export interface GasMixResult {
  input: GasMixInput;
  totalGasBbtud: number;
  pheBbtud: number;
  pgnBbtud: number;
  gtNetMw: number;
  stNetMw: number;
  totalNetMw: number;
  formulaVersion: string;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  fieldErrors: ApiFieldError[];
}
