import { z } from "zod";

export const settingsSchema = z.object({
  templatesDelay: z.number().int().min(0).max(60_000),
  scanTimeout: z.number().int().min(1_000).max(3_600_000),
});

export type Settings = z.infer<typeof settingsSchema>;
