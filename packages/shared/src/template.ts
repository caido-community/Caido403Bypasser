import { z } from "zod";

export const templateSchema = z.object({
  id: z
    .string()
    .regex(
      /^[a-zA-Z0-9-]{1,100}$/,
      "Template ID must be 1-100 letters, digits or dashes",
    ),
  description: z.string().default(""),
  enabled: z.boolean(),
  modificationScript: z.string(),
});

export type Template = z.infer<typeof templateSchema>;
