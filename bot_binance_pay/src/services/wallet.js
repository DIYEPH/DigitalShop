const BackendAuth = require('./backend-auth');

async function getWallet(userId) {
  const me = await BackendAuth.getMe(userId);
  const user = me?.user;
  if (!user) return null;

  return {
    balance: user.balanceUsdt ?? 0,
    balancePoint: user.balancePoint ?? 0,
    total: (user.balanceUsdt ?? 0) + (user.balancePoint ?? 0),
    balanceSpent: user.balanceSpentUsdt ?? 0,
    pointSpent: user.creditsSpentCoin ?? 0,
  };
}

module.exports = { getWallet };
