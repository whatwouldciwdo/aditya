import {
  Body,
  Controller,
  Post,
  UnprocessableEntityException,
} from "@nestjs/common";
import {
  calculateLegacyGasMix,
  LEGACY_FORMULA_VERSION,
  type FgcCount,
} from "@aditya/calculation-engine";
import type { ApiErrorResponse, GasMixResult } from "@aditya/shared-types";
import { gasMixInputSchema } from "@aditya/validation";

@Controller("calculations")
export class CalculationsController {
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
