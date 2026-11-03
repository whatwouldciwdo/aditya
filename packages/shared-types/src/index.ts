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

export const OPERATION_MODES = ["OPEN", "COMBINED"] as const;

export type OperationMode = (typeof OPERATION_MODES)[number];

export interface EvaluationInput {
  operationDate: string;
  mode: OperationMode;
  loadMw: number;
  fgcCount: number;
  predictedGasBbtud: number;
  actualGasBbtud: number;
  predictedPheBbtud?: number | undefined;
  actualPheBbtud?: number | undefined;
  predictedPgnBbtud?: number | undefined;
  actualPgnBbtud?: number | undefined;
  predictedNetMw?: number | undefined;
  actualNetMw?: number | undefined;
  predictionSource?:
    | {
        type: "GAS_MIX" | "MANUAL";
        formulaVersion?: string | undefined;
      }
    | undefined;
}

export interface EvaluationResult {
  input: EvaluationInput;
  absoluteErrorBbtud: number;
  deviationPercent: number;
  accuracyPercent: number;
  correctionFactor: number;
  signedBiasPercent: number;
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
