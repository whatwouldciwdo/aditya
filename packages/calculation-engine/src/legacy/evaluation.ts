import type { EvaluationInput, EvaluationResult } from "@aditya/shared-types";

export const LEGACY_EVALUATION_FORMULA_VERSION =
  "legacy-evaluation-characterization-v1" as const;

export function calculateLegacyEvaluation(
  input: EvaluationInput,
): EvaluationResult {
  const absoluteErrorBbtud = Math.abs(
    input.actualGasBbtud - input.predictedGasBbtud,
  );
  const deviationPercent =
    (absoluteErrorBbtud / Math.abs(input.actualGasBbtud)) * 100;

  return {
    input,
    absoluteErrorBbtud,
    deviationPercent,
    accuracyPercent: Math.max(0, 100 - deviationPercent),
    correctionFactor: input.actualGasBbtud / input.predictedGasBbtud,
    signedBiasPercent:
      ((input.actualGasBbtud - input.predictedGasBbtud) /
        input.predictedGasBbtud) *
      100,
    formulaVersion: LEGACY_EVALUATION_FORMULA_VERSION,
  };
}
