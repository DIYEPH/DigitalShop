function buildReferralDeepLink(botUsername, referralCode) {
  const user = String(botUsername || '').trim();
  const code = String(referralCode || '').trim();
  if (!user || !code) return null;
  return `https://t.me/${user}?start=ref_${code}`;
}

function mapReferralErrorMessage(t, code) {
  if (code === 'referral_already_bound') return t('referral_already_bound');
  if (code === 'referral_self') return t('referral_self');
  return t('invalid_referral');
}

function formatReferralsList(t, referrals) {
  if (!referrals?.length) return '';
  return referrals
    .map((row) => {
      const mark = row.referrer_bonus_awarded ? '✅' : '⏳';
      return `${mark} ${row.display_name}`;
    })
    .join('\n');
}

module.exports = {
  buildReferralDeepLink,
  mapReferralErrorMessage,
  formatReferralsList,
};
