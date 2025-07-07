// options/options.js

// 检测是否为Windows系统
function isWindowsOS() {
  return navigator.userAgent.indexOf('Windows') !== -1;
}

// 默认编码设置，Windows默认使用GBK，其他系统使用UTF-8
const defaultEncoding = isWindowsOS() ? 'gbk' : 'utf-8';

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['defaultToken', 'defaultBaseUrl', 'csvEncoding'], (data) => {
    document.getElementById('defaultToken').value = data.defaultToken || '';
    document.getElementById('defaultBaseUrl').value = data.defaultBaseUrl || '';
    
    // 设置CSV编码选项
    const encodingSelect = document.getElementById('csvEncoding');
    encodingSelect.value = data.csvEncoding || defaultEncoding;
    
    // 如果是Windows系统，默认选择GBK
    if (!data.csvEncoding && isWindowsOS()) {
      encodingSelect.value = 'gbk';
    }
  });
});

document.getElementById('saveBtn').addEventListener('click', () => {
  const defaultToken = document.getElementById('defaultToken').value;
  const defaultBaseUrl = document.getElementById('defaultBaseUrl').value;
  const csvEncoding = document.getElementById('csvEncoding').value;
  
  chrome.storage.sync.set({
    defaultToken,
    defaultBaseUrl,
    csvEncoding
  }, () => {
    document.getElementById('saveMsg').textContent = '保存成功！';
    setTimeout(() => document.getElementById('saveMsg').textContent = '', 1500);
  });
});