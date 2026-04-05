const BackendReferral = require('./backend-referral');

async function processReferral(userId, code) {
  const data = await BackendReferral.bind(userId, code);
  if (!data) {
    const err = new Error('referral_bind_failed');
    err.code = 'referral_bind_failed';
    throw err;
  }
  return {
    success: true,
    bonus: data.referee_bonus_points,
    referrer: { first_name: data.referrer_display_name },
  };
}

async function getReferralInfo(userId) {
  const me = await BackendReferral.getMe(userId);
  if (!me) return null;
  return {
    referralCode: me.referral_code,
    totalReferrals: me.total_referrals,
    totalEarned: me.total_earned_points,
    canBind: me.can_bind === true,
    referrals: me.referrals || [],
    config: {
      bonus_type: 'point',
      referrer_bonus: me.referrer_bonus_points,
      referee_bonus: me.referee_bonus_points,
    },
  };
}

module.exports = {
  processReferral,
  getReferralInfo,
};
