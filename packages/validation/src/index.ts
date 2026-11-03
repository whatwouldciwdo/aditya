import { z } from "zod";

import { DOCUMENT_STATUSES } from "@aditya/shared-types";

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
