"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdminToken } from "@/lib/auth/use-admin-token";
import { getActiveShopId } from "@/lib/shop-context";
import { DEFAULT_JSON, defaultProviderFor } from "./settings.constants";
import { settingsService } from "./settings.service";
import type {
  PaymentCredential,
  PaymentMethod,
  PaymentProvider,
  SellerShop,
  TelegramBotSettings,
  Translator,
} from "./settings.types";

export function useShopSettings(t: Translator) {
  const token = useAdminToken();
  const [shop, setShop] = useState<SellerShop | null>(null);
  const [bot, setBot] = useState<TelegramBotSettings | null>(null);
  const [credentials, setCredentials] = useState<PaymentCredential[]>([]);
  const [loading, setLoading] = useState(false);

  const [shopName, setShopName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [supportUrl, setSupportUrl] = useState("");
  const [savingShop, setSavingShop] = useState(false);

  const [botToken, setBotToken] = useState("");
  const [botUsername, setBotUsername] = useState("");
  const [savingBot, setSavingBot] = useState(false);

  const [paymentMethod, setPaymentMethodState] =
    useState<PaymentMethod>("BINANCE");
  const [provider, setProvider] = useState<PaymentProvider>("BINANCE");
  const [credentialName, setCredentialName] = useState("");
  const [publicPayload, setPublicPayload] = useState(DEFAULT_JSON);
  const [secretPayload, setSecretPayload] = useState(DEFAULT_JSON);
  const [savingCredential, setSavingCredential] = useState(false);

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
      settingsService.listCredentials(token, shopId),
    ])
      .then(([shopResult, botResult, credentialResult]) => {
        if (cancelled) return;
        const selected =
          shopResult.shops.find((item) => item.id === shopId) ?? null;
        setShop(selected);
        setShopName(selected?.name ?? "");
        setLogoUrl(selected?.logo_url ?? "");
        setSupportUrl(selected?.support_url ?? "");
        setBot(botResult);
        setBotUsername(botResult.bot_username ?? "");
        setCredentials(credentialResult.credentials);
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

  const setPaymentMethod = (method: PaymentMethod) => {
    setPaymentMethodState(method);
    setProvider(defaultProviderFor(method));
  };

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

  const saveCredential = async () => {
    if (!token || !shop) return;
    runAction(setSavingCredential, async () => {
      await settingsService.upsertCredential(token, shop.id, {
        payment_method: paymentMethod,
        provider,
        display_name: credentialName,
        public_payload: parseJsonObject(publicPayload, t),
        payload: parseJsonObject(secretPayload, t),
      });
      const refreshed = await settingsService.listCredentials(token, shop.id);
      setCredentials(refreshed.credentials);
      setCredentialName("");
      setPublicPayload(DEFAULT_JSON);
      setSecretPayload(DEFAULT_JSON);
      setSuccess(t("settings.savedCredential"));
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
    credentials,
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
    },
    credentialForm: {
      paymentMethod,
      setPaymentMethod,
      provider,
      setProvider,
      credentialName,
      setCredentialName,
      publicPayload,
      setPublicPayload,
      secretPayload,
      setSecretPayload,
      savingCredential,
      saveCredential,
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

function parseJsonObject(
  value: string,
  t: Translator,
): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(t("errors.invalidJson"));
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error(t("errors.invalidJson"));
  }
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : "Request failed.";
}
