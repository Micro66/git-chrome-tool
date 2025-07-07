// utils/export.js

// 检测是否为Windows系统
function isWindowsOS() {
  return navigator.userAgent.indexOf('Windows') !== -1;
}

// 默认编码设置，Windows默认使用GBK，其他系统使用UTF-8
const defaultEncoding = isWindowsOS() ? 'gbk' : 'utf-8';

// 获取用户设置的编码
async function getEncodingPreference() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['csvEncoding'], (data) => {
      resolve(data.csvEncoding || defaultEncoding);
    });
  });
}

// 检查GitLab配置是否完整
async function checkGitLabConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['defaultToken', 'defaultBaseUrl'], (data) => {
      resolve({
        isConfigured: !!(data.defaultToken && data.defaultBaseUrl),
        token: data.defaultToken || '',
        baseUrl: data.defaultBaseUrl || ''
      });
    });
  });
}

// 打开配置页面
function openOptionsPage() {
  chrome.runtime.openOptionsPage();
}

// 检查是否在contentScript环境中
function isInContentScript() {
  return typeof window !== 'undefined' && window.document &&
         document.querySelector('#gitlab-export-modal') !== null;
}

// 添加UTF-8 BOM标记
function addUtf8Bom(content) {
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  return new Blob([bom, content], { type: 'text/csv;charset=utf-8' });
}

// 创建Excel兼容的CSV (UTF-8 with BOM)
function createExcelCompatibleCsv(content, encoding) {
  if (encoding === 'gbk') {
    // 对于Windows/Excel，我们使用UTF-8 with BOM
    // 这是因为浏览器环境中直接生成GBK编码内容有限制
    // 但UTF-8 with BOM可以被Excel正确识别
    return addUtf8Bom(content);
  } else {
    // 对于其他系统，也使用UTF-8 with BOM以确保兼容性
    return addUtf8Bom(content);
  }
}

export async function exportToCSV(data, filename = 'events.csv') {
  // 检查GitLab配置，但仅在非contentScript环境中执行
  // 在contentScript环境中，配置检查由contentScript.js处理
  if (!isInContentScript()) {
    const config = await checkGitLabConfig();
    if (!config.isConfigured) {
      alert('请先配置GitLab URL和Token');
      openOptionsPage();
      return;
    }
  }

  const csvRows = [];
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  csvRows.push(headers.join(','));
  for (const row of data) {
    csvRows.push(headers.map(h => '"' + (row[h] || '').toString().replace(/"/g, '""') + '"').join(','));
  }
  
  const csvContent = csvRows.join('\n');
  const encoding = await getEncodingPreference();
  
  // 创建Excel兼容的CSV
  const blob = createExcelCompatibleCsv(csvContent, encoding);
  
  // 创建下载链接
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

export async function exportToCSVWithProgress(data, setStatus, filename = 'events.csv') {
  // 检查GitLab配置，但仅在非contentScript环境中执行
  if (!isInContentScript()) {
    const config = await checkGitLabConfig();
    if (!config.isConfigured) {
      setStatus && setStatus('');
      alert('请先配置GitLab URL和Token');
      openOptionsPage();
      return;
    }
  }

  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  const batch = 500;
  for (let i = 0; i < data.length; i += batch) {
    for (let j = i; j < Math.min(i + batch, data.length); j++) {
      const row = data[j];
      csvRows.push(headers.map(h => '"' + (row[h] || '').toString().replace(/"/g, '""') + '"').join(','));
    }
    setStatus && setStatus(`正在导出... (${Math.min(i + batch, data.length)}/${data.length})`);
    await new Promise(r => setTimeout(r, 0));
  }
  
  const csvContent = csvRows.join('\n');
  const encoding = await getEncodingPreference();
  
  // 创建Excel兼容的CSV
  const blob = createExcelCompatibleCsv(csvContent, encoding);
  
  // 创建下载链接
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

export async function exportToMarkdown(data, filename = 'events.md') {
  // 检查GitLab配置，但仅在非contentScript环境中执行
  if (!isInContentScript()) {
    const config = await checkGitLabConfig();
    if (!config.isConfigured) {
      alert('请先配置GitLab URL和Token');
      openOptionsPage();
      return;
    }
  }

  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  let md = '| ' + headers.join(' | ') + ' |\n';
  md += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
  for (const row of data) {
    md += '| ' + headers.map(h => (row[h] || '').toString().replace(/\|/g, '\\|')).join(' | ') + ' |\n';
  }
  const blob = new Blob([md], { type: 'text/markdown' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

export async function exportToMarkdownWithProgress(data, setStatus, filename = 'events.md') {
  // 检查GitLab配置，但仅在非contentScript环境中执行
  if (!isInContentScript()) {
    const config = await checkGitLabConfig();
    if (!config.isConfigured) {
      setStatus && setStatus('');
      alert('请先配置GitLab URL和Token');
      openOptionsPage();
      return;
    }
  }

  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  let md = '| ' + headers.join(' | ') + ' |\n';
  md += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
  const batch = 500;
  for (let i = 0; i < data.length; i += batch) {
    for (let j = i; j < Math.min(i + batch, data.length); j++) {
      const row = data[j];
      md += '| ' + headers.map(h => (row[h] || '').toString().replace(/\|/g, '\\|')).join(' | ') + ' |\n';
    }
    setStatus && setStatus(`正在导出... (${Math.min(i + batch, data.length)}/${data.length})`);
    await new Promise(r => setTimeout(r, 0));
  }
  const blob = new Blob([md], { type: 'text/markdown' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}