"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui";
import type { Translator } from "../settings.types";
import {
  settingsFieldStyle,
  settingsSectionClassName,
  settingsSectionStyle,
} from "./settings-ui";

type Props = {
  t: Translator;
  form: {
    currentPassword: string;
    setCurrentPassword: (value: string) => void;
    newPassword: string;
    setNewPassword: (value: string) => void;
    confirmPassword: string;
    setConfirmPassword: (value: string) => void;
    savingPassword: boolean;
    canSavePassword: boolean;
    savePassword: () => Promise<void>;
  };
};

export function PasswordCard({ t, form }: Props) {
  return (
    <Card
      variant="flat"
      padding="none"
      className={settingsSectionClassName}
      style={settingsSectionStyle}
    >
      <CardHeader className="border-b border-black/10 px-0 pb-3">
        <CardTitle className="text-base">{t("settings.password")}</CardTitle>
        <CardDescription>{t("settings.passwordHint")}</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pt-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void form.savePassword();
          }}
          className="grid max-w-md gap-3"
        >
          <label className="grid gap-1.5" htmlFor="current-password">
            <span className="text-xs font-black uppercase">{t("settings.currentPassword")}</span>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={(event) => form.setCurrentPassword(event.target.value)}
              style={settingsFieldStyle}
            />
          </label>
          <label className="grid gap-1.5" htmlFor="new-password">
            <span className="text-xs font-black uppercase">{t("settings.newPassword")}</span>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={form.newPassword}
              onChange={(event) => form.setNewPassword(event.target.value)}
              style={settingsFieldStyle}
            />
          </label>
          <label className="grid gap-1.5" htmlFor="confirm-password">
            <span className="text-xs font-black uppercase">{t("settings.confirmPassword")}</span>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(event) => form.setConfirmPassword(event.target.value)}
              style={settingsFieldStyle}
            />
          </label>
          <Button
            type="submit"
            variant="primary"
            loading={form.savingPassword}
            disabled={!form.canSavePassword}
            className="justify-self-start"
          >
            {t("settings.savePassword")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
