const { mapCheckoutError } = require('./checkout');
const { mapTopupError } = require('./deposit');
const { mapReferralErrorMessage } = require('./referral-ui');

function resolveApiErrorMessage(t, code, context = {}) {
  if (!code) {
    return t('error');
  }
  if (context.domain === 'referral') {
    return mapReferralErrorMessage(t, code);
  }
  if (context.domain === 'topup') {
    return mapTopupError(t, code, context.method);
  }
  return mapCheckoutError(t, code);
}

module.exports = { resolveApiErrorMessage };
