import { z } from "zod";

import {
  DOCUMENT_STATUSES,
  OPERATION_MODES,
  TANK_CODES,
  TANK_INPUT_TYPES,
} from "@aditya/shared-types";

export const documentStatusSchema = z.enum(DOCUMENT_STATUSES);

export const gasMixInputSchema = z.object({
  loadMw: z
    .number({ error: "Load turbin harus berupa angka." })
    .finite("Load turbin harus berupa angka finite.")
    .nonnegative("Load turbin tidak boleh negatif."),
  fgcCount: z
    .number({ error: "Jumlah FGC harus berupa angka." })
    .int("Jumlah FGC harus berupa bilangan bulat.")
    .min(0, "Jumlah FGC minimal 0 unit.")
    .max(4, "Jumlah FGC maksimal 4 unit."),
});

export type GasMixInput = z.infer<typeof gasMixInputSchema>;

export const tankCalculationInputSchema = z.object({
  tankCode: z.enum(TANK_CODES, { error: "Jenis tanki tidak valid." }),
  inputType: z.enum(TANK_INPUT_TYPES, { error: "Jenis input tidak valid." }),
  value: z
    .number({ error: "Nilai harus berupa angka." })
    .finite("Nilai harus berupa angka finite.")
    .nonnegative("Nilai tidak boleh negatif."),
}) satisfies z.ZodType<import("@aditya/shared-types").TankCalculationInput>;

export type TankCalculationInput = z.infer<typeof tankCalculationInputSchema>;

const optionalNonnegativeNumber = z
  .number({ error: "Nilai harus berupa angka." })
  .finite("Nilai harus berupa angka finite.")
  .nonnegative("Nilai tidak boleh negatif.")
  .optional();

export const evaluationInputSchema = z.object({
  operationDate: z
    .string({ error: "Tanggal operasi wajib diisi." })
    .date("Tanggal operasi tidak valid."),
  mode: z.enum(OPERATION_MODES, { error: "Mode operasi tidak valid." }),
  loadMw: gasMixInputSchema.shape.loadMw,
  fgcCount: gasMixInputSchema.shape.fgcCount,
  predictedGasBbtud: z
    .number({ error: "Prediksi total gas harus berupa angka." })
    .finite("Prediksi total gas harus berupa angka finite.")
    .positive("Prediksi total gas harus lebih dari nol."),
  actualGasBbtud: z
    .number({ error: "Realisasi total gas harus berupa angka." })
    .finite("Realisasi total gas harus berupa angka finite.")
    .positive("Realisasi total gas harus lebih dari nol."),
  predictedPheBbtud: optionalNonnegativeNumber,
  actualPheBbtud: optionalNonnegativeNumber,
  predictedPgnBbtud: optionalNonnegativeNumber,
  actualPgnBbtud: optionalNonnegativeNumber,
  predictedNetMw: optionalNonnegativeNumber,
  actualNetMw: optionalNonnegativeNumber,
  predictionSource: z
    .object({
      type: z.enum(["GAS_MIX", "MANUAL"]),
      formulaVersion: z.string().min(1).optional(),
    })
    .optional(),
}) satisfies z.ZodType<import("@aditya/shared-types").EvaluationInput>;

export type EvaluationInput = z.infer<typeof evaluationInputSchema>;
