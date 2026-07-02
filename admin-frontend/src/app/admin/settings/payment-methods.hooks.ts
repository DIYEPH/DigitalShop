"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api/client";
import {
  listPaymentCredentials,
  reorderPaymentCredentials,
  upsertPaymentCredential,
  type PaymentCredential,
  type ShopPaymentMethod,
} from "@/lib/api/shops";
import { useAdminToken } from "@/lib/auth/use-admin-token";
import { getActiveShopId } from "@/lib/shop-context";
import {
  CRYPTO_NETWORKS,
  DEFAULT_METHOD_ORDER,
  METHOD_PROVIDER,
  type CryptoNetwork,
} from "./payment-methods.constants";
import type { Translator } from "./settings.types";

export type CryptoNetworkRow = {
  network: CryptoNetwork;
  wallet_address: string;
};

export type CryptoForm = {
  enabled: boolean;
  networks: CryptoNetworkRow[];
};

export type BinanceForm = {
  enabled: boolean;
  pay_id: string;
  qr_url: string;
  api_key: string;
  api_secret: string;
  hasSecret: boolean;
};

export type BankForm = {
  enabled: boolean;
  bank_name: string;
  bank_bin: string;
  account_number: string;
  account_holder: string;
  api_key: string;
  hasSecret: boolean;
};

export type PaymentForms = {
  CRYPTO: CryptoForm;
  BINANCE: BinanceForm;
  BANK: BankForm;
};

function emptyForms(): PaymentForms {
  return {
    CRYPTO: {
      enabled: false,
      networks: [{ network: "TRC20", wallet_address: "" }],
    },
    BINANCE: {
      enabled: false,
      pay_id: "",
      qr_url: "",
      api_key: "",
      api_secret: "",
      hasSecret: false,
    },
    BANK: {
      enabled: false,
      bank_name: "",
      bank_bin: "",
      account_number: "",
      account_holder: "",
      api_key: "",
      hasSecret: false,
    },
  };
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function seedForms(credentials: PaymentCredential[]): PaymentForms {
  const forms = emptyForms();
  for (const cred of credentials) {
    const pub = cred.public_payload ?? {};
    const enabled = cred.status === "ACTIVE";
    if (cred.payment_method === "CRYPTO") {
      const rawNetworks = Array.isArray(pub.networks)
        ? (pub.networks as Array<Record<string, unknown>>)
        : [];
      const networks: CryptoNetworkRow[] = rawNetworks
        .map((n) => ({
          network: (CRYPTO_NETWORKS.includes(str(n.network) as CryptoNetwork)
            ? str(n.network)
            : "TRC20") as CryptoNetwork,
          wallet_address: str(n.wallet_address),
        }))
        .filter((n) => n.wallet_address.length > 0);
      forms.CRYPTO = {
        enabled,
        networks:
          networks.length > 0
            ? networks
            : [{ network: "TRC20", wallet_address: "" }],
      };
    } else if (cred.payment_method === "BINANCE") {
      forms.BINANCE = {
        enabled,
        pay_id: str(pub.pay_id),
        qr_url: str(pub.qr_url),
        api_key: "",
        api_secret: "",
        hasSecret: cred.has_secret,
      };
    } else if (cred.payment_method === "BANK") {
      forms.BANK = {
        enabled,
        bank_name: str(pub.bank_name),
        bank_bin: str(pub.bank_bin),
        account_number: str(pub.account_number),
        account_holder: str(pub.account_holder),
        api_key: "",
        hasSecret: cred.has_secret,
      };
    }
  }
  return forms;
}

function seedOrder(credentials: PaymentCredential[]): ShopPaymentMethod[] {
  const known = [...credentials]
    .sort((a, b) => a.priority - b.priority)
    .map((c) => c.payment_method);
  const seen = new Set<ShopPaymentMethod>();
  const order: ShopPaymentMethod[] = [];
  for (const method of [...known, ...DEFAULT_METHOD_ORDER]) {
    if (!seen.has(method)) {
      seen.add(method);
      order.push(method);
    }
  }
  return order;
}

function buildPublicPayload(
  method: ShopPaymentMethod,
  forms: PaymentForms,
): Record<string, unknown> {
  if (method === "CRYPTO") {
    return {
      networks: forms.CRYPTO.networks
        .filter((n) => n.wallet_address.trim().length > 0)
        .map((n) => ({
          network: n.network,
          wallet_address: n.wallet_address.trim(),
        })),
    };
  }
  if (method === "BINANCE") {
    return {
      pay_id: forms.BINANCE.pay_id.trim(),
      qr_url: forms.BINANCE.qr_url.trim(),
    };
  }
  return {
    bank_name: forms.BANK.bank_name.trim(),
    bank_bin: forms.BANK.bank_bin.trim(),
    account_number: forms.BANK.account_number.trim(),
    account_holder: forms.BANK.account_holder.trim(),
  };
}

function buildSecretPayload(
  method: ShopPaymentMethod,
  forms: PaymentForms,
): Record<string, unknown> | undefined {
  const secret: Record<string, unknown> = {};
  if (method === "BINANCE") {
    if (forms.BINANCE.api_key.trim()) secret.api_key = forms.BINANCE.api_key.trim();
    if (forms.BINANCE.api_secret.trim())
      secret.api_secret = forms.BINANCE.api_secret.trim();
  } else if (method === "BANK") {
    if (forms.BANK.api_key.trim()) secret.api_key = forms.BANK.api_key.trim();
  }
  return Object.keys(secret).length > 0 ? secret : undefined;
}

export function usePaymentMethods(t: Translator) {
  const token = useAdminToken();
  const [shopId, setShopId] = useState<string | null>(null);
  const [order, setOrder] = useState<ShopPaymentMethod[]>(DEFAULT_METHOD_ORDER);
  const [forms, setForms] = useState<PaymentForms>(emptyForms());
  const [loading, setLoading] = useState(false);
  const [savingMethod, setSavingMethod] = useState<ShopPaymentMethod | null>(
    null,
  );
  const [reordering, setReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const id = getActiveShopId();
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setShopId(id);
      if (id) setLoading(true);
    });
    if (!id) {
      return () => {
        cancelled = true;
      };
    }

    listPaymentCredentials(token, id)
      .then((res) => {
        if (cancelled) return;
        setForms(seedForms(res.credentials));
        setOrder(seedOrder(res.credentials));
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

  const updateCrypto = (patch: Partial<CryptoForm>) =>
    setForms((prev) => ({ ...prev, CRYPTO: { ...prev.CRYPTO, ...patch } }));
  const updateBinance = (patch: Partial<BinanceForm>) =>
    setForms((prev) => ({ ...prev, BINANCE: { ...prev.BINANCE, ...patch } }));
  const updateBank = (patch: Partial<BankForm>) =>
    setForms((prev) => ({ ...prev, BANK: { ...prev.BANK, ...patch } }));

  const setNetwork = (index: number, patch: Partial<CryptoNetworkRow>) =>
    setForms((prev) => {
      const networks = prev.CRYPTO.networks.map((n, i) =>
        i === index ? { ...n, ...patch } : n,
      );
      return { ...prev, CRYPTO: { ...prev.CRYPTO, networks } };
    });
  const addNetwork = () =>
    setForms((prev) => ({
      ...prev,
      CRYPTO: {
        ...prev.CRYPTO,
        networks: [
          ...prev.CRYPTO.networks,
          { network: "TRC20", wallet_address: "" },
        ],
      },
    }));
  const removeNetwork = (index: number) =>
    setForms((prev) => {
      const networks = prev.CRYPTO.networks.filter((_, i) => i !== index);
      return {
        ...prev,
        CRYPTO: {
          ...prev.CRYPTO,
          networks:
            networks.length > 0
              ? networks
              : [{ network: "TRC20", wallet_address: "" }],
        },
      };
    });

  const persist = async (
    method: ShopPaymentMethod,
    overrides?: { enabled?: boolean },
  ) => {
    if (!token || !shopId) return;
    const enabled = overrides?.enabled ?? forms[method].enabled;
    setSavingMethod(method);
    setError(null);
    setSuccess(null);
    try {
      await upsertPaymentCredential(token, shopId, {
        payment_method: method,
        provider: METHOD_PROVIDER[method],
        enabled,
        priority: Math.max(order.indexOf(method), 0),
        public_payload: buildPublicPayload(method, forms),
        payload: buildSecretPayload(method, forms),
      });
      const refreshed = await listPaymentCredentials(token, shopId);
      setForms(seedForms(refreshed.credentials));
      setOrder(seedOrder(refreshed.credentials));
      setSuccess(t("settings.savedCredential"));
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setSavingMethod(null);
    }
  };

  const save = (method: ShopPaymentMethod) => persist(method);

  const toggle = (method: ShopPaymentMethod, enabled: boolean) => {
    updateEnabled(method, enabled);
    void persist(method, { enabled });
  };

  const updateEnabled = (method: ShopPaymentMethod, enabled: boolean) => {
    if (method === "CRYPTO") updateCrypto({ enabled });
    else if (method === "BINANCE") updateBinance({ enabled });
    else updateBank({ enabled });
  };

  const applyOrder = async (next: ShopPaymentMethod[]) => {
    if (!token || !shopId) return;
    setOrder(next);
    setReordering(true);
    setError(null);
    try {
      await reorderPaymentCredentials(token, shopId, next);
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setReordering(false);
    }
  };

  const move = (method: ShopPaymentMethod, direction: -1 | 1) => {
    const index = order.indexOf(method);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    void applyOrder(next);
  };

  const reorderByDrag = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || to >= order.length) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    void applyOrder(next);
  };

  const notices = useMemo(
    () => ({
      error,
      success,
      clearError: () => setError(null),
      clearSuccess: () => setSuccess(null),
    }),
    [error, success],
  );

  return {
    shopId,
    order,
    forms,
    loading,
    savingMethod,
    reordering,
    notices,
    updateCrypto,
    updateBinance,
    updateBank,
    setNetwork,
    addNetwork,
    removeNetwork,
    save,
    toggle,
    move,
    reorderByDrag,
  };
}

function messageFromError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : "Request failed.";
}
