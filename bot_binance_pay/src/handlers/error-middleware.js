const i18n = require('../locales');
const { resolveApiErrorMessage } = require('../utils/api-error-message');

function extractBackendApiError(err) {
  const error = err?.response?.data?.error;
  if (!error || typeof error !== 'object') return null;
  return error;
}

function extractErrorMessage(err, userId) {
  const t = i18n.getTranslator(userId);
  const apiError = extractBackendApiError(err);
  return resolveApiErrorMessage(t, apiError?.code);
}

module.exports = { extractErrorMessage, extractBackendApiError };
