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

export const TANK_CODES = ["RWT", "MWT"] as const;
export const TANK_INPUT_TYPES = ["LEVEL", "VOLUME"] as const;
export const TANK_STATUSES = [
  "NORMAL",
  "NWL",
  "HIGH",
  "WARNING",
  "CRITICAL",
] as const;

export type TankCode = (typeof TANK_CODES)[number];
export type TankInputType = (typeof TANK_INPUT_TYPES)[number];
export type TankStatus = (typeof TANK_STATUSES)[number];

export interface TankCalculationInput {
  tankCode: TankCode;
  inputType: TankInputType;
  value: number;
}

export interface TankDefinition {
  tankCode: TankCode;
  name: string;
  nwlM: number;
  hwiM: number;
  oflM: number;
  capacityNwlM3: number;
  factorM3PerM: number;
  nwlToleranceM: number;
  parameterVersion: string;
}

export interface TankCalculationResult {
  input: TankCalculationInput;
  definition: TankDefinition;
  levelM: number;
  levelMm: number;
  volumeM3: number;
  volumeLiter: number;
  capacityPercent: number;
  oflPercent: number;
  status: TankStatus;
  overflowWarning: boolean;
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

export interface SimulationInput {
  mode: OperationMode;
  nominationPheBbtud?: number;
  nominationPgnBbtud?: number;
  initialLinepack: number;
  flowInPhe: number;
  rows: Array<{ loadMw: number; fgcCount: 0 | 1 | 2 | 3 | 4 }>;
}
export interface SimulationResult {
  input: SimulationInput;
  rows: Array<
    SimulationInput["rows"][number] & {
      slot: string;
      gtNetMw: number;
      stNetMw: number;
      totalNetMw: number;
      pheBbtud: number;
      pgnBbtud: number;
      totalGasBbtud: number;
      linepack: number;
      flowPhe: number;
      flowPgn: number;
    }
  >;
  averagePheBbtud: number;
  averagePgnBbtud: number;
  averageTotalGasBbtud: number;
  totalProductionMw: number;
  nominationWarnings: { phe: boolean; pgn: boolean };
}
export interface RohInput {
  ownUseUnit: "GT11" | "GT12";
  nominationPheBbtud?: number;
  nominationPgnBbtud?: number;
  rows: Array<{
    gt11OpenMw: number;
    gt12OpenMw: number;
    gt11CombinedMw: number;
    gt12CombinedMw: number;
    fgcCount: 0 | 1 | 2 | 3 | 4;
  }>;
}
export interface RohResult {
  input: RohInput;
  rows: Array<
    RohInput["rows"][number] & {
      slot: string;
      gt11OpenNetMw: number;
      gt12OpenNetMw: number;
      stNetMw: number;
      gt11CombinedNetMw: number;
      gt12CombinedNetMw: number;
      totalLoadMw: number;
      pheBbtud: number;
      pgnBbtud: number;
      totalGasBbtud: number;
    }
  >;
  averagePheBbtud: number;
  averagePgnBbtud: number;
  averageTotalGasBbtud: number;
  nominationWarnings: { phe: boolean; pgn: boolean };
}
export interface NominationInput {
  submissionDate: string;
  effectiveDate: string;
  deliveryPoint: string;
  receiptPoint: string;
  dailySwapBbtud: number;
  dailyStockBbtud: number;
  rows: Array<{ swapBbtud: number; stockBbtud: number }>;
}
export interface NominationResult {
  input: NominationInput;
  rows: Array<
    NominationInput["rows"][number] & { slot: string; totalBbtud: number }
  >;
  dailyTotalBbtud: number;
  averageSwapBbtud: number;
  averageStockBbtud: number;
  averageTotalBbtud: number;
}
export interface EvaluationHistoryRecord {
  id: string;
  createdAt: string;
  input: EvaluationInput;
  result: EvaluationResult;
}
export interface LearningResult {
  sampleCount: number;
  averageDeviationPercent: number | null;
  learningFactor: number | null;
  recommendedGasBbtud: number | null;
  confidence: "NONE" | "LOW" | "MEDIUM" | "HIGH";
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
