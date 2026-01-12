import { z } from "zod";

export const meetingSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
  duration: z.string().optional(),
  code: z.string().optional(),
  audioUrl: z.string().min(1, "Audio reference is required").optional(),
});

export const meetingIdSchema = z.object({
  id: z.string().cuid("Invalid meeting ID"),
});

export const updateMeetingTitleSchema = z.object({
  id: z.string().cuid("Invalid meeting ID"),
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
});

export const updateMeetingCodeSchema = z.object({
  id: z.string().cuid("Invalid meeting ID"),
  code: z.string().min(1, "Code is required"),
});

export const apiKeyUpdateSchema = z.object({
  apiKeys: z.record(z.string(), z.string()).optional(),
  apiKey: z.string().optional(),
  preferredProvider: z.string().optional(),
  preferredModel: z.string().optional(),
  allowedIps: z.string().optional(),
  defaultLanguage: z.string().optional(),
  summaryLength: z.string().optional(),
  summaryPersona: z.string().optional(),
  autoProcess: z.boolean().optional(),
});

export type MeetingInput = z.infer<typeof meetingSchema>;
export type UpdateMeetingTitleInput = z.infer<typeof updateMeetingTitleSchema>;
export type UpdateMeetingCodeInput = z.infer<typeof updateMeetingCodeSchema>;
export type ApiKeyUpdateInput = z.infer<typeof apiKeyUpdateSchema>;
