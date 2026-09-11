import { z } from "zod";

import { emailSchema, passwordSchema } from "./auth";

const uuid = z.string().uuid("Identificador inválido.");

export const createUserSchema = z
  .object({
    email: emailSchema,
    fullName: z.string().trim().min(2, "El nombre es obligatorio.").max(120),
    roleId: uuid,
    /** Modo de alta: contraseña asignada por el administrador o invitación por email. */
    mode: z.enum(["password", "invite"]).default("password"),
    password: passwordSchema.optional().or(z.literal("")),
    /** Obliga a cambiar la contraseña en el primer inicio de sesión. */
    requirePasswordChange: z.boolean().default(true),
  })
  .refine((v) => v.mode === "invite" || (v.password && v.password.length >= 8), {
    message: "Indica una contraseña de al menos 8 caracteres.",
    path: ["password"],
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

export const setUserPasswordSchema = z.object({
  id: uuid,
  password: passwordSchema,
  requirePasswordChange: z.boolean().default(true),
});

export const deleteUserSchema = z.object({ id: uuid });

export const setRolePermissionsSchema = z.object({
  roleId: uuid,
  permissionIds: z.array(uuid).max(100),
});

export type CreateUserInput = z.input<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type SetUserPasswordInput = z.input<typeof setUserPasswordSchema>;
