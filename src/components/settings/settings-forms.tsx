"use client";

import { KeyRound, Monitor, Moon, Save, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { changeOwnPassword, updateOwnProfile } from "@/lib/actions/profile.actions";
import { cn } from "@/lib/utils/cn";
import type { CurrentUser } from "@/types";

import { useTheme, type Theme } from "../providers/theme-provider";
import { useToast } from "../providers/toast-provider";
import { Avatar } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import { Field, FormError } from "../ui/field";
import { Input } from "../ui/input";

const THEMES: { value: Theme; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

export function SettingsForms({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const toast = useToast();
  const { theme, setTheme } = useTheme();
  const [fullName, setFullName] = useState(user.fullName);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingProfile, startProfile] = useTransition();
  const [savingPassword, startPassword] = useTransition();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setProfileError(null);
            startProfile(async () => {
              const result = await updateOwnProfile({ fullName });
              if (!result.ok) {
                setProfileError(result.error);
                return;
              }
              toast.success("Perfil actualizado");
              router.refresh();
            });
          }}
        >
          <Card>
            <CardHeader title="Perfil" description="Nombre visible para el resto de usuarios en documentos y actividad." />
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar name={fullName || user.email} src={user.avatarUrl} size="lg" />
                <div>
                  <p className="text-sm font-medium text-fg">{user.email}</p>
                  <Badge tone="primary" size="sm" className="mt-1">{user.role.name}</Badge>
                </div>
              </div>
              <Field label="Nombre completo" htmlFor="fullName" required>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={savingProfile} />
              </Field>
              <FormError message={profileError} />
            </CardContent>
            <CardFooter>
              <Button type="submit" loading={savingProfile} leftIcon={<Save className="size-4" />}>Guardar</Button>
            </CardFooter>
          </Card>
        </form>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPasswordError(null);
            startPassword(async () => {
              const result = await changeOwnPassword({ password, confirmPassword: confirm });
              if (!result.ok) {
                setPasswordError(result.error);
                return;
              }
              setPassword("");
              setConfirm("");
              toast.success("Contraseña actualizada");
            });
          }}
        >
          <Card>
            <CardHeader title="Seguridad" description="Cambia tu contraseña. Mínimo 8 caracteres." />
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Nueva contraseña" htmlFor="newPassword" required>
                <Input id="newPassword" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={savingPassword} minLength={8} />
              </Field>
              <Field label="Confirmar contraseña" htmlFor="confirmPassword" required>
                <Input id="confirmPassword" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={savingPassword} minLength={8} />
              </Field>
              <div className="sm:col-span-2"><FormError message={passwordError} /></div>
            </CardContent>
            <CardFooter>
              <Button type="submit" variant="outline" loading={savingPassword} disabled={!password || !confirm} leftIcon={<KeyRound className="size-4" />}>Actualizar contraseña</Button>
            </CardFooter>
          </Card>
        </form>
      </div>

      <aside className="space-y-6">
        <Card>
          <CardHeader title="Apariencia" description="Preferencia guardada en este dispositivo." />
          <CardContent>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tema">
              {THEMES.map((t) => {
                const Icon = t.icon;
                const active = theme === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTheme(t.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-colors",
                      active ? "border-primary bg-primary-soft text-primary" : "border-border text-fg-muted hover:border-border-strong hover:text-fg",
                    )}
                  >
                    <Icon className="size-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Permisos de tu rol" />
          <CardContent>
            <ul className="flex flex-wrap gap-1.5">
              {user.permissions.map((p) => (
                <li key={p}><Badge tone="outline" size="sm" className="font-mono">{p}</Badge></li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
