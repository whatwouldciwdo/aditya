import {
  Body,
  Controller,
  Post,
  UnprocessableEntityException,
} from "@nestjs/common";
import {
  calculateLegacyGasMix,
  calculateLegacyEvaluation,
  calculateLegacyTank,
  LEGACY_FORMULA_VERSION,
  type FgcCount,
} from "@aditya/calculation-engine";
import type {
  ApiErrorResponse,
  EvaluationResult,
  GasMixResult,
  TankCalculationResult,
} from "@aditya/shared-types";
import {
  evaluationInputSchema,
  gasMixInputSchema,
  tankCalculationInputSchema,
} from "@aditya/validation";

@Controller("calculations")
export class CalculationsController {
  @Post("tank")
  calculateTank(@Body() body: unknown): TankCalculationResult {
    const parsed = tankCalculationInputSchema.safeParse(body);
    if (!parsed.success) {
      const response: ApiErrorResponse = {
        code: "VALIDATION_ERROR",
        message: "Input kalkulator tanki tidak valid.",
        fieldErrors: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      };
      throw new UnprocessableEntityException(response);
    }
    return calculateLegacyTank(parsed.data);
  }

  @Post("evaluation")
  calculateEvaluation(@Body() body: unknown): EvaluationResult {
    const parsed = evaluationInputSchema.safeParse(body);

    if (!parsed.success) {
      const response: ApiErrorResponse = {
        code: "VALIDATION_ERROR",
        message: "Input Evaluasi tidak valid.",
        fieldErrors: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      };
      throw new UnprocessableEntityException(response);
    }

    return calculateLegacyEvaluation(parsed.data);
  }

  @Post("gas-mix")
  calculateGasMix(@Body() body: unknown): GasMixResult {
    const parsed = gasMixInputSchema.safeParse(body);

    if (!parsed.success) {
      const response: ApiErrorResponse = {
        code: "VALIDATION_ERROR",
        message: "Input Gas Mix tidak valid.",
        fieldErrors: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      };
      throw new UnprocessableEntityException(response);
    }

    return {
      input: parsed.data,
      ...calculateLegacyGasMix(
        parsed.data.loadMw,
        parsed.data.fgcCount as FgcCount,
      ),
      formulaVersion: LEGACY_FORMULA_VERSION,
    };
  }
}
