import { z } from "zod";

import { DOCUMENT_STATUSES } from "@aditya/shared-types";

export const documentStatusSchema = z.enum(DOCUMENT_STATUSES);
