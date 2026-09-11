import { z } from "zod";

import { emailSchema, passwordSchema } from "./auth";

const uuid = z.string().uuid("Identificador inválido.");

export const createUserSchema = z.object({
  email: emailSchema,
  fullName: z.string().trim().min(2, "El nombre es obligatorio.").max(120),
  roleId: uuid,
  password: passwordSchema.optional().or(z.literal("")),
  sendInvite: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  id: uuid,
  fullName: z.string().trim().min(2, "El nombre es obligatorio.").max(120),
  roleId: uuid,
});

export const setUserActiveSchema = z.object({
  id: uuid,
  isActive: z.boolean(),
});

export const setRolePermissionsSchema = z.object({
  roleId: uuid,
  permissionIds: z.array(uuid).max(100),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
