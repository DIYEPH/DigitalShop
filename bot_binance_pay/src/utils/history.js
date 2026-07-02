const { formatPrice, formatDateShort } = require('./helpers');
const { formatOrderPaymentHints } = require('./checkout');

function mapOrderStatusIcon(t, status) {
  const key = {
    PENDING: 'pending',
    PAID: 'paid',
    DELIVERED: 'completed',
    CANCELLED: 'cancelled',
  }[status] || 'pending';
  return t(`order_status_icons.${key}`) || '❓';
}

function formatOrderAmount(order) {
  return order.currency === 'VND'
    ? formatPrice(order.total_price, 'VNĐ')
    : formatPrice(order.total_price, 'USDT');
}

function historyGroupTitleKey(group) {
  return {
    completed: 'history_title_completed',
    pending: 'history_title_pending',
    cancelled: 'history_title_cancelled',
  }[group] || 'history_title';
}

function formatHistoryListMessage(orders, meta, t, group = null) {
  const titleKey = group ? historyGroupTitleKey(group) : 'history_title';
  const lines = [
    `📋 ${t(titleKey)}`,
    '━━━━━━━━━━━━━━━━━━━━━',
    '',
  ];

  if (!orders.length) {
    lines.push(group ? t('no_history_in_group') : t('no_history'));
    return lines.join('\n');
  }

  orders.forEach((order, idx) => {
    const icon = mapOrderStatusIcon(t, order.status);
    const amount = formatOrderAmount(order);
    const shortId = order.order_id.slice(0, 8);
    const createdAt = order.created_at ? formatDateShort(order.created_at) : '—';
    lines.push(
      `${icon} \`${shortId}…\` · ${order.first_item_name} x${order.quantity}`,
      `   ${amount} · ${order.payment_method} · ${createdAt}`,
    );
    if (idx < orders.length - 1) lines.push('');
  });

  if (meta.total_pages > 1) {
    lines.push('', t('history_page_info', { page: meta.page, total: meta.total_pages }));
  }

  lines.push('', t('history_tap_detail'));
  return lines.join('\n');
}

function buildHistoryHubKeyboard(hasPending, t) {
  return [
    [
      { text: t('history_tab_completed'), callback_data: 'history_list_completed' },
      {
        text: hasPending ? t('history_tab_pending') : t('history_tab_pending_empty'),
        callback_data: 'history_list_pending',
      },
      { text: t('history_tab_cancelled'), callback_data: 'history_list_cancelled' },
    ],
    [{ text: t('back'), callback_data: 'back_main' }],
  ];
}

function formatHistoryHubMessage(t) {
  return [
    `📋 ${t('history_hub_title')}`,
    '━━━━━━━━━━━━━━━━━━━━━',
    '',
    t('history_hub_hint'),
  ].join('\n');
}

function buildHistoryKeyboard(orders, meta, t, group) {
  const keyboard = orders.map((order) => [{
    text: `${mapOrderStatusIcon(t, order.status)} ${order.first_item_name}`.slice(0, 60),
    callback_data: `order_detail_${order.order_id}`,
  }]);

  if (meta.total_pages > 1) {
    const nav = [];
    if (meta.page > 1) {
      nav.push({ text: '◀️', callback_data: `history_page_${group}_${meta.page - 1}` });
    }
    nav.push({ text: `${meta.page}/${meta.total_pages}`, callback_data: 'history_noop' });
    if (meta.page < meta.total_pages) {
      nav.push({ text: '▶️', callback_data: `history_page_${group}_${meta.page + 1}` });
    }
    keyboard.push(nav);
  }

  keyboard.push(
    [{ text: t('history_back_hub'), callback_data: 'history_hub' }],
    [{ text: t('back'), callback_data: 'back_main' }],
  );
  return keyboard;
}

function formatOrderDetailMessage(order, t) {
  const icon = mapOrderStatusIcon(t, order.status);
  const amount = formatOrderAmount(order);
  const item = order.items?.[0];
  const lines = [
    `📦 ${t('history_order_detail_title')}`,
    '━━━━━━━━━━━━━━━━━━━━━',
    `${t('order_id')}: \`${order.order_id}\``,
    `${t('order_status')}: ${icon} ${order.status}`,
    `${t('order_total')}: ${amount}`,
    `${t('order_payment_method')}: ${order.payment_method}`,
  ];

  if (order.payment_code) {
    lines.push(`${t('order_payment_code')}: \`${order.payment_code}\``);
  }

  if (item) {
    lines.push(`📦 ${item.snapshot_variant_name} x${item.quantity}`);
  }

  if (order.created_at) {
    lines.push(`${t('order_created_at')}: ${formatDateShort(order.created_at)}`);
  }

  if (order.status === 'PENDING') {
    lines.push(...formatOrderPaymentHints(order, order.payment_method, t));
  }

  if (order.status === 'DELIVERED' && order.delivery?.lines?.length) {
    lines.push('', `🔑 ${t('accounts_title')}`);
    order.delivery.lines.forEach((line) => lines.push(`\`${line}\``));
    lines.push('', t('change_password'));
  }

  return lines.join('\n');
}

function buildOrderDetailKeyboard(order, t) {
  const rows = [];

  if (order?.status === 'PENDING') {
    const orderId = order.order_id;
    if (order.payment_method === 'BINANCE') {
      rows.push(
        [{ text: t('pending_continue_pay'), callback_data: `pending_resume_${orderId}` }],
        [{ text: t('check_payment'), callback_data: `order_check_${orderId}` }],
        [{ text: t('cancel_order'), callback_data: `order_cancel_${orderId}` }],
      );
    } else if (['BANK', 'CRYPTO'].includes(order.payment_method)) {
      rows.push(
        [{ text: t('pending_continue_pay'), callback_data: `pending_resume_${orderId}` }],
        [{ text: t('pending_cancel_order'), callback_data: `pending_cancel_${orderId}` }],
      );
    } else {
      rows.push([{ text: t('pending_continue_pay'), callback_data: `pending_resume_${orderId}` }]);
    }
  }

  rows.push(
    [{ text: t('history_back_hub'), callback_data: 'history_hub' }],
    [{ text: t('back'), callback_data: 'back_main' }],
  );
  return rows;
}

function parseHistoryPageCallback(data) {
  const match = data.match(/^history_page_(completed|pending|cancelled)_(\d+)$/);
  if (!match) return null;
  const page = parseInt(match[2], 10);
  if (!page || page < 1) return null;
  return { group: match[1], page };
}

function parseHistoryListCallback(data) {
  const match = data.match(/^history_list_(completed|pending|cancelled)$/);
  return match ? match[1] : null;
}

module.exports = {
  mapOrderStatusIcon,
  formatHistoryListMessage,
  formatHistoryHubMessage,
  buildHistoryHubKeyboard,
  buildHistoryKeyboard,
  formatOrderDetailMessage,
  buildOrderDetailKeyboard,
  parseHistoryPageCallback,
  parseHistoryListCallback,
  historyGroupTitleKey,
};
