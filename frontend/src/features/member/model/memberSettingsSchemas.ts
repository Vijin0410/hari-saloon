import { z } from 'zod';

export const memberSettingsSchema = z.object({ pointsEnabled: z.boolean() });
export type MemberSettingsValues = z.infer<typeof memberSettingsSchema>;
