import { z } from "zod";

const scanTargetSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65_535),
  isTls: z.boolean(),
  raw: z.string().min(1),
});

export type ScanTarget = z.infer<typeof scanTargetSchema>;

export const scanSourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("Request"), requestId: z.string().min(1) }),
  z.object({ kind: z.literal("Raw"), target: scanTargetSchema }),
]);

export type ScanSource = z.infer<typeof scanSourceSchema>;

export type ScanStatus =
  "Running" | "Completed" | "Cancelled" | "TimedOut" | "Failed";

export type Scan = {
  id: number;
  url: string;
  host: string;
  port: number;
  isTls: boolean;
  status: ScanStatus;
  startedAt: number;
  sent: number;
  total: number;
};

export type ScanResult =
  | {
      kind: "Ok";
      id: number;
      templateId: string;
      requestId: string;
      statusCode: number;
      length: number;
      roundtripTime: number;
    }
  | { kind: "Error"; id: number; templateId: string; error: string };

export type ResultDetails = {
  request: string | undefined;
  response: string | undefined;
};
