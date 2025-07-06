// options/options.js

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['defaultToken', 'defaultBaseUrl'], (data) => {
    document.getElementById('defaultToken').value = data.defaultToken || '';
    document.getElementById('defaultBaseUrl').value = data.defaultBaseUrl || '';
  });
});

document.getElementById('saveBtn').addEventListener('click', () => {
  const defaultToken = document.getElementById('defaultToken').value;
  const defaultBaseUrl = document.getElementById('defaultBaseUrl').value;
  chrome.storage.sync.set({ defaultToken, defaultBaseUrl }, () => {
    document.getElementById('saveMsg').textContent = '保存成功！';
    setTimeout(() => document.getElementById('saveMsg').textContent = '', 1500);
  });
}); 