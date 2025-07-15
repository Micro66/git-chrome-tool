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

// Tab switching
const tabGitlab = document.getElementById('tab-gitlab');
const tabLlm = document.getElementById('tab-llm');
const panelGitlab = document.getElementById('panel-gitlab');
const panelLlm = document.getElementById('panel-llm');

tabGitlab.addEventListener('click', () => {
  tabGitlab.classList.add('active');
  tabLlm.classList.remove('active');
  panelGitlab.style.display = '';
  panelLlm.style.display = 'none';
});
tabLlm.addEventListener('click', () => {
  tabLlm.classList.add('active');
  tabGitlab.classList.remove('active');
  panelLlm.style.display = '';
  panelGitlab.style.display = 'none';
});

// LLM config management
let llmConfigs = [];
let editingIndex = null;

function renderLlmList() {
  const listDiv = document.getElementById('llm-list');
  listDiv.innerHTML = '';
  if (!llmConfigs.length) {
    listDiv.innerHTML = '<div style="color:#888;font-size:14px;">暂无配置</div>';
    return;
  }
  llmConfigs.forEach((cfg, idx) => {
    const div = document.createElement('div');
    div.className = 'form-group';
    div.style.borderBottom = '1px solid #eee';
    div.style.padding = '6px 0';
    div.innerHTML = `
      <input type="radio" name="llmDefault" ${cfg.isDefault ? 'checked' : ''} data-idx="${idx}" style="margin-right:8px;"/>
      <span style="font-size:14px;">[${cfg.model}] ${cfg.baseURL}</span>
      <button data-edit="${idx}" style="margin-left:10px;">编辑</button>
      <button data-del="${idx}" style="margin-left:4px;color:#e53e3e;">删除</button>
    `;
    // 事件绑定
    div.querySelector('input[type=radio]').addEventListener('change', () => setDefaultLlm(idx));
    div.querySelector('button[data-edit]').addEventListener('click', () => fillLlmForm(idx));
    div.querySelector('button[data-del]').addEventListener('click', () => deleteLlmConfig(idx));
    listDiv.appendChild(div);
  });
}

function fillLlmForm(idx) {
  const cfg = llmConfigs[idx];
  document.getElementById('llm-baseUrl').value = cfg.baseURL || '';
  document.getElementById('llm-apiKey').value = cfg.apiKey || '';
  document.getElementById('llm-defaultHeaders').value = cfg.defaultHeaders ? JSON.stringify(cfg.defaultHeaders) : '';
  document.getElementById('llm-model').value = cfg.model || '';
  editingIndex = idx;
}

function clearLlmForm() {
  document.getElementById('llm-baseUrl').value = '';
  document.getElementById('llm-apiKey').value = '';
  document.getElementById('llm-defaultHeaders').value = '';
  document.getElementById('llm-model').value = '';
  editingIndex = null;
}

document.getElementById('clearLlmFormBtn').addEventListener('click', clearLlmForm);

document.getElementById('addLlmConfigBtn').addEventListener('click', () => {
  const baseURL = document.getElementById('llm-baseUrl').value.trim();
  const apiKey = document.getElementById('llm-apiKey').value.trim();
  let defaultHeaders = document.getElementById('llm-defaultHeaders').value.trim();
  const model = document.getElementById('llm-model').value.trim();
  try {
    defaultHeaders = defaultHeaders ? JSON.parse(defaultHeaders) : {};
  } catch {
    alert('defaultHeaders 需为合法 JSON');
    return;
  }
  if (!baseURL || !apiKey || !model) {
    alert('baseURL、apiKey、model 必填');
    return;
  }
  const config = { baseURL, apiKey, defaultHeaders, model, isDefault: false };
  if (editingIndex !== null) {
    // 更新
    llmConfigs[editingIndex] = { ...config, isDefault: llmConfigs[editingIndex].isDefault };
  } else {
    llmConfigs.push(config);
  }
  clearLlmForm();
  renderLlmList();
});

document.getElementById('saveLlmConfigsBtn').addEventListener('click', () => {
  chrome.storage.sync.set({ llmConfigs }, () => {
    const status = document.getElementById('llmSaveStatus');
    status.textContent = '已保存';
    setTimeout(() => { status.textContent = ''; }, 2000);
  });
});

function deleteLlmConfig(idx) {
  if (confirm('确定删除该配置？')) {
    llmConfigs.splice(idx, 1);
    renderLlmList();
  }
}

function setDefaultLlm(idx) {
  llmConfigs = llmConfigs.map((cfg, i) => ({ ...cfg, isDefault: i === idx }));
  renderLlmList();
}

// 自动填充 LLM 配置
window.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['llmConfigs'], (data) => {
    llmConfigs = Array.isArray(data.llmConfigs) ? data.llmConfigs : [];
    renderLlmList();
  });
});

// 自动填充设置页
window.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['defaultToken', 'defaultBaseUrl'], (data) => {
    document.getElementById('token').value = data.defaultToken || '';
    document.getElementById('baseUrl').value = data.defaultBaseUrl || '';
  });
}); 