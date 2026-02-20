/** Ngày claim (DATE) theo timezone cửa hàng — dùng `en-CA` để có YYYY-MM-DD. */
export function claimDateInTimezone(timezone: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
