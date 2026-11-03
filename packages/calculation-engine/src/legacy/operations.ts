import type {
  EvaluationHistoryRecord,
  LearningResult,
  NominationInput,
  NominationResult,
  OperationMode,
  RohInput,
  RohResult,
  SimulationInput,
  SimulationResult,
} from "@aditya/shared-types";

import { calculateLegacyGasMix } from "./gas.js";

export const OPERATION_SLOTS = Array.from(
  { length: 24 },
  (_, index) => `${String((index + 1) % 24).padStart(2, "0")}:00`,
);

export const NOMINATION_SLOTS = Array.from(
  { length: 24 },
  (_, index) => `${String(index).padStart(2, "0")}:00`,
);

function round(value: number, digits = 6) {
  return Number(value.toFixed(digits));
}

function pgnEnergy(fgcCount: number) {
  return [0, 14.67, 28.118, 41.938, 53.874][fgcCount] ?? 0;
}

export function calculateSimulation(input: SimulationInput): SimulationResult {
  let previousLinepack = input.initialLinepack;
  let previousFlowPhe = 0;
  const rows = input.rows.map((row, index) => {
    const active = row.loadMw > 0;
    const gas = active ? calculateLegacyGasMix(row.loadMw, row.fgcCount) : null;
    const gtNetMw = active ? row.loadMw - (input.mode === "OPEN" ? 1 : 8) : 0;
    const stNetMw =
      active && input.mode === "COMBINED" ? 0.4639 * row.loadMw + 10.283 : 0;
    const totalNetMw = gtNetMw + stNetMw;
    const totalGasBbtud = gas?.totalGasBbtud ?? 0;
    const pgnBbtud = active ? pgnEnergy(row.fgcCount) : 0;
    const pheBbtud = active ? totalGasBbtud - pgnBbtud : 0;
    const flowPhe = (pheBbtud * 1000) / 1184.74;
    const flowPgn = (pgnBbtud * 1000) / 1080.15;
    const linepack =
      index === 0
        ? previousLinepack
        : previousLinepack - previousFlowPhe + input.flowInPhe;
    previousLinepack = linepack;
    previousFlowPhe = flowPhe;
    return {
      slot: OPERATION_SLOTS[index] ?? `${index + 1}`,
      ...row,
      gtNetMw: round(gtNetMw),
      stNetMw: round(stNetMw),
      totalNetMw: round(totalNetMw),
      pheBbtud: round(pheBbtud),
      pgnBbtud: round(pgnBbtud),
      totalGasBbtud: round(totalGasBbtud),
      linepack: round(linepack),
      flowPhe: round(flowPhe),
      flowPgn: round(flowPgn),
    };
  });
  const average = (key: "pheBbtud" | "pgnBbtud" | "totalGasBbtud") =>
    rows.reduce((sum, row) => sum + row[key], 0) / rows.length;
  return {
    input,
    rows,
    averagePheBbtud: round(average("pheBbtud")),
    averagePgnBbtud: round(average("pgnBbtud")),
    averageTotalGasBbtud: round(average("totalGasBbtud")),
    totalProductionMw: round(
      rows.reduce((sum, row) => sum + row.totalNetMw, 0),
    ),
    nominationWarnings: {
      phe:
        input.nominationPheBbtud != null &&
        average("pheBbtud") > input.nominationPheBbtud,
      pgn:
        input.nominationPgnBbtud != null &&
        average("pgnBbtud") > input.nominationPgnBbtud,
    },
  };
}

export function calculateRoh(input: RohInput): RohResult {
  const rows = input.rows.map((row, index) => {
    const ownUse = input.ownUseUnit;
    const oc11 = Math.max(0, row.gt11OpenMw - (ownUse === "GT11" ? 8 : 1));
    const oc12 = Math.max(0, row.gt12OpenMw - (ownUse === "GT12" ? 8 : 1));
    const st = row.stMw > 0 ? row.stMw - 2 : 0;
    const both = row.gt11CombinedMw > 0 && row.gt12CombinedMw > 0;
    const cc11 = Math.max(
      0,
      row.gt11CombinedMw - (ownUse === "GT11" ? (both ? 10 : 8) : 1),
    );
    const cc12 = Math.max(
      0,
      row.gt12CombinedMw - (ownUse === "GT12" ? (both ? 10 : 8) : 1),
    );
    const totalLoadMw = oc11 + oc12 + st + cc11 + cc12;
    const load11 = row.gt11OpenMw || row.gt11CombinedMw;
    const load12 = row.gt12OpenMw || row.gt12CombinedMw;
    const totalGasBbtud =
      (load11 > 0 ? calculateLegacyGasMix(load11, 0).totalGasBbtud : 0) +
      (load12 > 0 ? calculateLegacyGasMix(load12, 0).totalGasBbtud : 0);
    const pgnBbtud = pgnEnergy(row.fgcCount);
    return {
      slot: OPERATION_SLOTS[index] ?? `${index + 1}`,
      ...row,
      totalLoadMw: round(totalLoadMw),
      pheBbtud: round(totalGasBbtud - pgnBbtud),
      pgnBbtud: round(pgnBbtud),
      totalGasBbtud: round(totalGasBbtud),
    };
  });
  const avg = (key: "pheBbtud" | "pgnBbtud" | "totalGasBbtud") =>
    round(rows.reduce((s, r) => s + r[key], 0) / rows.length);
  return {
    input,
    rows,
    averagePheBbtud: avg("pheBbtud"),
    averagePgnBbtud: avg("pgnBbtud"),
    averageTotalGasBbtud: avg("totalGasBbtud"),
  };
}

export function calculateNomination(input: NominationInput): NominationResult {
  const rows = input.rows.map((row, index) => ({
    slot: NOMINATION_SLOTS[index] ?? `${index}`,
    ...row,
    totalBbtud: round(row.swapBbtud + row.stockBbtud),
  }));
  const average = (key: "swapBbtud" | "stockBbtud" | "totalBbtud") =>
    round(rows.reduce((s, r) => s + r[key], 0) / rows.length);
  return {
    input,
    rows,
    dailyTotalBbtud: round(input.dailySwapBbtud + input.dailyStockBbtud),
    averageSwapBbtud: average("swapBbtud"),
    averageStockBbtud: average("stockBbtud"),
    averageTotalBbtud: average("totalBbtud"),
  };
}

export function calculateLearning(
  history: EvaluationHistoryRecord[],
  current: {
    mode: OperationMode;
    loadMw: number;
    fgcCount: number;
    predictedGasBbtud: number;
  },
  toleranceMw = 10,
): LearningResult {
  const byMode = history.filter((item) => item.input.mode === current.mode);
  const byConfig = byMode.filter(
    (item) => item.input.fgcCount === current.fgcCount,
  );
  const similar = byConfig.filter(
    (item) => Math.abs(item.input.loadMw - current.loadMw) <= toleranceMw,
  );
  const samples = similar.length
    ? similar
    : byConfig.length
      ? byConfig
      : byMode.length
        ? byMode
        : history;
  const factor = samples.length
    ? samples.reduce((sum, item) => sum + item.result.correctionFactor, 0) /
      samples.length
    : null;
  const deviation = samples.length
    ? samples.reduce((sum, item) => sum + item.result.deviationPercent, 0) /
      samples.length
    : null;
  return {
    sampleCount: samples.length,
    averageDeviationPercent: deviation == null ? null : round(deviation),
    learningFactor: factor == null ? null : round(factor),
    recommendedGasBbtud:
      factor == null ? null : round(current.predictedGasBbtud * factor),
    confidence:
      samples.length >= 10
        ? "HIGH"
        : samples.length >= 5
          ? "MEDIUM"
          : samples.length
            ? "LOW"
            : "NONE",
  };
}
