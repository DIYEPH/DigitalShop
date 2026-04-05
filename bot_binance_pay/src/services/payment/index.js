async function createDeposit() {
  throw new Error('bank_topup_not_implemented');
}

async function checkPendingDeposits() {
  return [];
}

async function checkDeposit() {
  return null;
}

async function cancelDeposit() {
  return false;
}

async function loadPendingDeposits() {
  return;
}

module.exports = {
  createDeposit,
  checkPendingDeposits,
  checkDeposit,
  cancelDeposit,
  loadPendingDeposits,
};
