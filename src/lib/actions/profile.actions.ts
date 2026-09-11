"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { changePasswordSchema, updateProfileSchema } from "@/lib/validation/auth";
import type { ActionResult } from "@/types";

import { authorize, fail, ok, runAction, zodFail } from "./helpers";

export async function updateOwnProfile(input: { fullName: string }): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const user = await authorize();
    const parsed = updateProfileSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);

    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: parsed.data.fullName })
      .eq("id", user.id);
    if (error) throw error;

    await supabase.auth.updateUser({ data: { full_name: parsed.data.fullName } });

    revalidatePath("/", "layout");
    return ok(undefined);
  });
}

export async function changeOwnPassword(input: {
  password: string;
  confirmPassword: string;
}): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await authorize();
    const parsed = changePasswordSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);

    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) {
      return fail(
        /different/i.test(error.message)
          ? "La nueva contraseña debe ser distinta de la anterior."
          : "No se pudo actualizar la contraseña.",
      );
    }
    return ok(undefined);
  });
}
