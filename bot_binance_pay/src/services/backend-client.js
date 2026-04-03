const axios = require('axios');
const config = require('../config');

function isBackendEnabled() {
  return Boolean(config.BACKEND_API_BASE_URL && config.BACKEND_BOT_SECRET);
}

function createBackendClient() {
  return axios.create({
    baseURL: config.BACKEND_API_BASE_URL,
    timeout: config.BACKEND_REQUEST_TIMEOUT_MS,
    headers: {
      'x-bot-secret': config.BACKEND_BOT_SECRET,
      'content-type': 'application/json',
    },
  });
}

module.exports = {
  isBackendEnabled,
  createBackendClient,
};

