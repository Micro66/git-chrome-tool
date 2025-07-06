// popup/popup.js
// 只管理配置

// 保存配置
function saveSettings() {
  const token = document.getElementById('token').value;
  const baseUrl = document.getElementById('baseUrl').value;
  chrome.storage.sync.set({ defaultToken: token, defaultBaseUrl: baseUrl }, () => {
    const status = document.getElementById('saveStatus');
    if (status) {
      status.textContent = '配置已保存';
      clearTimeout(window._saveStatusTimer);
      window._saveStatusTimer = setTimeout(() => {
        status.textContent = '';
      }, 2000);
    }
  });
}
document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);

// 自动填充设置页
window.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['defaultToken', 'defaultBaseUrl'], (data) => {
    document.getElementById('token').value = data.defaultToken || '';
    document.getElementById('baseUrl').value = data.defaultBaseUrl || '';
  });
}); 