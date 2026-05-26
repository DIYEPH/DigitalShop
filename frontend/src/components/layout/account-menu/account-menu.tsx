"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "../store-header/store-header.module.scss";
import { Button } from "@/components/ui";
import { useAccountMenu } from "./account-menu.hooks";
import type { AccountMenuProps } from "./account-menu.types";

export function AccountMenu({ lang, dict }: AccountMenuProps) {
  const { open, close, toggle, logout } = useAccountMenu(lang);

  return (
    <div className={styles.accountMenu}>
      <Button
        type="button"
        image
        className={styles.avatarWrap}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
      >
        <span className={styles.avatar} aria-hidden>
          <Image src="/default-avatar.svg" alt="" width={32} height={32} className={styles.avatarImage} />
        </span>
        <span className={styles.caret} aria-hidden>
          ▾
        </span>
        <span className="sr-only">
          {dict.layout.openAccountMenu}
        </span>
      </Button>
      {open ? (
        <div className={styles.accountDropdown} role="menu">
          <Link href={`/${lang}/account/profile`} className={styles.accountItem} role="menuitem" onClick={close}>
            {dict.layout.updateProfile}
          </Link>
          <Link href={`/${lang}/account/password`} className={styles.accountItem} role="menuitem" onClick={close}>
            {dict.layout.changePassword}
          </Link>
          <Button type="button" image className={styles.accountItem} role="menuitem" onClick={logout}>
            {dict.layout.logout}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
