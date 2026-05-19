import { z } from 'zod';

export const signupSchema = z
  .object({
    email: z.string().email().max(255).transform((s) => s.toLowerCase()),
    password: z
      .string()
      .min(10, 'Password must be at least 10 characters')
      .max(128, 'Password too long'),
    name: z.string().min(1).max(120),
    studioName: z.string().min(1).max(120).optional(),
  })
  .strict();

export type SignupInput = z.infer<typeof signupSchema>;

export const signupResponseSchema = z.object({
  userId: z.string(),
  tenantId: z.string(),
  email: z.string(),
});
export type SignupResponse = z.infer<typeof signupResponseSchema>;
