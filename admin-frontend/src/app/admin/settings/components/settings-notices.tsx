"use client";

import { Alert, Button } from "@/components/ui";

type Props = {
  error: string | null;
  success: string | null;
  clearError: () => void;
  clearSuccess: () => void;
};

export function SettingsNotices({ error, success, clearError, clearSuccess }: Props) {
  return (
    <>
      {error ? (
        <div className="grid gap-2">
          <Alert variant="danger">{error}</Alert>
          <Button type="button" variant="ghost" size="sm" onClick={clearError}>
            Dismiss
          </Button>
        </div>
      ) : null}
      {success ? (
        <div className="grid gap-2">
          <Alert variant="success">{success}</Alert>
          <Button type="button" variant="ghost" size="sm" onClick={clearSuccess}>
            Dismiss
          </Button>
        </div>
      ) : null}
    </>
  );
}
