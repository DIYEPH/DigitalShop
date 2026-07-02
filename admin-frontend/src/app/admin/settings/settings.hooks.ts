"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdminToken } from "@/lib/auth/use-admin-token";
import { getActiveShopId } from "@/lib/shop-context";
import { settingsService } from "./settings.service";
import type {
  SellerShop,
  TelegramBotSettings,
  Translator,
} from "./settings.types";

export function useShopSettings(t: Translator) {
  const token = useAdminToken();
  const [shop, setShop] = useState<SellerShop | null>(null);
  const [bot, setBot] = useState<TelegramBotSettings | null>(null);
  const [loading, setLoading] = useState(false);

  const [shopName, setShopName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [supportUrl, setSupportUrl] = useState("");
  const [savingShop, setSavingShop] = useState(false);

  const [botToken, setBotToken] = useState("");
  const [botUsername, setBotUsername] = useState("");
  const [savingBot, setSavingBot] = useState(false);
  const [togglingBot, setTogglingBot] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const shopId = getActiveShopId();
    if (!shopId) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });

    Promise.all([
      settingsService.listShops(token),
      settingsService.getBot(token, shopId),
    ])
      .then(([shopResult, botResult]) => {
        if (cancelled) return;
        const selected =
          shopResult.shops.find((item) => item.id === shopId) ?? null;
        setShop(selected);
        setShopName(selected?.name ?? "");
        setLogoUrl(selected?.logo_url ?? "");
        setSupportUrl(selected?.support_url ?? "");
        setBot(botResult);
        setBotUsername(botResult.bot_username ?? "");
      })
      .catch((err) => {
        if (!cancelled) setError(messageFromError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const canSavePassword = useMemo(
    () =>
      currentPassword.length >= 6 &&
      newPassword.length >= 6 &&
      confirmPassword.length >= 6 &&
      newPassword === confirmPassword,
    [currentPassword, newPassword, confirmPassword],
  );

  const runAction = async (
    setBusy: (value: boolean) => void,
    action: () => Promise<void>,
  ) => {
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setBusy(false);
    }
  };

  const saveShop = async () => {
    if (!token || !shop) return;
    runAction(setSavingShop, async () => {
      const updated = await settingsService.updateShop(token, shop.id, {
        name: shopName,
        logo_url: logoUrl || undefined,
        support_url: supportUrl || undefined,
      });
      setShop(updated);
      setSuccess(t("settings.savedShop"));
    });
  };

  const saveBot = async () => {
    if (!token || !shop) return;
    runAction(setSavingBot, async () => {
      const updated = await settingsService.updateBot(token, shop.id, {
        bot_token: botToken,
        bot_username: botUsername || undefined,
      });
      setBot(updated);
      setBotToken("");
      setSuccess(updated.internal_secret ?? t("settings.savedBot"));
    });
  };

  const toggleBotStatus = async () => {
    if (!token || !shop || !bot?.configured) return;
    const nextStatus = bot.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    runAction(setTogglingBot, async () => {
      const updated = await settingsService.setBotStatus(token, shop.id, nextStatus);
      setBot(updated);
      setSuccess(
        nextStatus === "ACTIVE" ? t("settings.botEnabled") : t("settings.botDisabled"),
      );
    });
  };

  const savePassword = async () => {
    if (!token) {
      setError(t("errors.sessionExpired"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("errors.passwordMismatch"));
      return;
    }
    if (currentPassword === newPassword) {
      setError(t("errors.passwordSame"));
      return;
    }

    runAction(setSavingPassword, async () => {
      await settingsService.changePassword(token, currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(t("settings.changedPassword"));
    });
  };

  return {
    shop,
    bot,
    loading,
    notices: {
      error,
      success,
      clearError: () => setError(null),
      clearSuccess: () => setSuccess(null),
    },
    shopForm: {
      shopName,
      setShopName,
      logoUrl,
      setLogoUrl,
      supportUrl,
      setSupportUrl,
      savingShop,
      saveShop,
    },
    botForm: {
      botToken,
      setBotToken,
      botUsername,
      setBotUsername,
      savingBot,
      saveBot,
      togglingBot,
      toggleBotStatus,
    },
    passwordForm: {
      currentPassword,
      setCurrentPassword,
      newPassword,
      setNewPassword,
      confirmPassword,
      setConfirmPassword,
      savingPassword,
      canSavePassword,
      savePassword,
    },
  };
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : "Request failed.";
}
