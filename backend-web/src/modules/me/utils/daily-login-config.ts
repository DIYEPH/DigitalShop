export type DailyLoginConfig = {
  timezone: string;
  claimDate: string;
  pointsReward: number;
};

function formatDateInTimezone(timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

export function resolveDailyLoginConfig(env: {
  timezone?: string;
  pointsReward?: string;
}): DailyLoginConfig {
  const timezone = env.timezone?.trim() || 'Asia/Ho_Chi_Minh';
  const rewardRaw = Number(env.pointsReward ?? '5');
  const pointsReward = Number.isInteger(rewardRaw) && rewardRaw > 0 ? rewardRaw : 5;

  return {
    timezone,
    claimDate: formatDateInTimezone(timezone),
    pointsReward,
  };
}
