import { z } from "zod";

const agentTriggerSchema = z.object({
  event: z.string().regex(/^[a-z_]+\.[a-z_]+$/, "Must be 'event_name.action' format"),
  label: z.string().optional(),
});

const agentActionSchema = z.object({
  moveTo: z.string().optional(),
  comment: z.boolean().optional(),
});

const agentConfigSchema = z.object({
  name: z.string().min(1),
  trigger: agentTriggerSchema,
  prompt: z.string().min(1),
  onSuccess: agentActionSchema.optional(),
  onFailure: agentActionSchema.optional(),
  onComplete: agentActionSchema.optional(),
});

export const configSchema = z.object({
  github: z.object({
    webhookSecret: z.string().min(1),
    repos: z.array(z.string()).min(1),
  }),
  agents: z.record(z.string(), agentConfigSchema).refine(
    (agents) => Object.keys(agents).length > 0,
    { message: "At least one agent must be configured" },
  ),
  board: z.object({
    columns: z.array(z.string()).min(2),
  }),
});

export type ValidatedConfig = z.infer<typeof configSchema>;
