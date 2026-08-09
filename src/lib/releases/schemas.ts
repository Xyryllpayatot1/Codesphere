import { z } from "zod";
import { RELEASE_CHANGE_TYPES } from "@/lib/constants";

export const releaseChangeSchema = z.object({
  type: z.enum([RELEASE_CHANGE_TYPES.NEW, RELEASE_CHANGE_TYPES.IMPROVEMENT, RELEASE_CHANGE_TYPES.FIX]),
  title: z.string().trim().min(1, "Change title is required").max(100),
  description: z.string().trim().max(500).default(""),
});

export const releaseInputSchema = z.object({
  version: z.string().trim().min(1, "Version is required").max(30),
  title: z.string().trim().min(1, "Title is required").max(100),
  summary: z.string().trim().max(300).default(""),
  description: z.string().trim().max(20000).default(""),
  releaseDate: z
    .string()
    .optional()
    .refine((v) => v === undefined || !Number.isNaN(Date.parse(v)), "Invalid release date"),
  changes: z.array(releaseChangeSchema).max(50).default([]),
});

export type ReleaseInput = z.infer<typeof releaseInputSchema>;
export type ReleaseChangeInput = z.infer<typeof releaseChangeSchema>;
