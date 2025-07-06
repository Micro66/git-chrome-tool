// contentScript.js
(function() {
  // 注入样式
  function injectStyle() {
    if (document.getElementById('gitlab-export-modal-style')) return;
    const style = document.createElement('style');
    style.id = 'gitlab-export-modal-style';
    style.textContent = `
      .gitlab-modal-mask { position: fixed; left:0; top:0; width:100vw; height:100vh; background:rgba(30,40,90,0.18); z-index:99999; display:flex; align-items:center; justify-content:center; }
      .gitlab-modal-card { background:rgba(255,255,255,0.85); border-radius:18px; box-shadow:0 8px 32px 0 rgba(31,38,135,0.18); min-width:370px; max-width:98vw; padding:32px 28px 18px 28px; position:relative; backdrop-filter:blur(14px) saturate(180%); border:1.5px solid rgba(255,255,255,0.28); }
      .gitlab-modal-close { position:absolute; right:18px; top:18px; font-size:22px; color:#6366f1; background:none; border:none; cursor:pointer; }
      .gitlab-modal-title { text-align:center; font-weight:700; font-size:20px; color:#2a3a5e; margin-bottom:18px; }
      .gitlab-form-group { margin-bottom:18px; display:flex; flex-wrap:wrap; align-items:center; }
      .gitlab-form-group label { display:block; margin-bottom:4px; font-weight:500; color:#2a3a5e; }
      .gitlab-modal-card input, .gitlab-modal-card select { padding:8px 14px; border:1.5px solid #cfd8dc; border-radius:7px; font-size:15px; margin-right:14px; margin-bottom:4px; background:rgba(255,255,255,0.7); transition:border 0.2s, box-shadow 0.2s; box-shadow:0 1px 4px #e3e3e3; }
      .gitlab-modal-card input:focus, .gitlab-modal-card select:focus { border:1.5px solid #6366f1; outline:none; box-shadow:0 0 0 2px #c7d2fe; }
      .gitlab-modal-btn { padding:9px 26px; background:linear-gradient(90deg,#6366f1 0%,#60a5fa 100%); color:#fff; border:none; border-radius:7px; font-size:16px; cursor:pointer; font-weight:600; box-shadow:0 2px 8px #c7d2fe; transition:background 0.2s,box-shadow 0.2s; }
      .gitlab-modal-btn:hover { background:linear-gradient(90deg,#4f46e5 0%,#2563eb 100%); box-shadow:0 4px 16px #a5b4fc; }
      .gitlab-modal-status { margin-left:12px; font-size:13px; color:#1976d2; }
      .gitlab-modal-error { color:#d32f2f; margin-top:8px; text-align:center; }
      .gitlab-modal-config { margin-bottom:18px; }
    `;
    document.head.appendChild(style);
  }

  // 立即注入样式，保证按钮和弹窗都美观
  injectStyle();

  if (window.__gitlab_export_btn_injected) return;
  window.__gitlab_export_btn_injected = true;

  // 插入导出按钮
  function insertExportBtn() {
    const controls = document.querySelector('.cover-controls');
    if (!controls || document.getElementById('gitlab-export-btn')) return;
    const editBtn = controls.querySelector('a[aria-label="Edit profile"],button[aria-label="Edit profile"],a[title="Edit profile"],button[title="Edit profile"]');
    if (!editBtn) return;
    const btn = document.createElement('button');
    btn.id = 'gitlab-export-btn';
    btn.textContent = '导出活跃事件';
    btn.className = 'gitlab-modal-btn';
    btn.style.marginLeft = '12px';
    btn.onclick = showExportModal;
    editBtn.parentNode.insertBefore(btn, editBtn.nextSibling);
  }

  // 弹出导出 Modal
  function showExportModal() {
    if (document.getElementById('gitlab-export-modal')) return;
    const mask = document.createElement('div');
    mask.className = 'gitlab-modal-mask';
    mask.id = 'gitlab-export-modal';
    // 计算今天日期
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    // 生成最近N天输入和按钮
    mask.innerHTML = `
      <div class="gitlab-modal-card">
        <button class="gitlab-modal-close" title="关闭">×</button>
        <div class="gitlab-modal-title">导出我的 GitLab 活跃事件</div>
        <form id="gitlab-export-form">
          <div class="gitlab-form-group">
            <label>开始日期:<input type="date" id="startDate" required /></label>
            <label>结束日期:<input type="date" id="endDate" required value="${todayStr}" /></label>
            <label>最近
              <input id="recentDays" type="number" min="1" max="365" style="width:100px;" placeholder="天数" />
            </label>
          </div>
          <div class="gitlab-form-group">
            <label>事件类型:
              <select id="targetType">
                <option value="">全部</option>
                <option value="Issue">Issue</option>
                <option value="MergeRequest">MergeRequest</option>
                <option value="Note">Note</option>
                <option value="Milestone">Milestone</option>
                <option value="Project">Project</option>
                <option value="Snippet">Snippet</option>
              </select>
            </label>
          </div>
          <div class="gitlab-form-group">
            <label>事件行为:
              <select id="action">
                <option value="opened" selected>opened</option>
                <option value="updated">updated</option>
                <option value="closed">closed</option>
                <option value="reopened">reopened</option>
                <option value="pushed">pushed</option>
                <option value="commented">commented</option>
                <option value="merged">merged</option>
              </select>
            </label>
          </div>
          <div class="gitlab-form-group">
            <label>导出格式:
              <select id="exportFormat">
                <option value="csv">CSV</option>
                <option value="md">Markdown</option>
              </select>
            </label>
            <button type="submit" class="gitlab-modal-btn">一键导出</button>
            <span id="exportStatus" class="gitlab-modal-status"></span>
          </div>
          <div id="error" class="gitlab-modal-error"></div>
        </form>
        <div id="configPanel" style="display:none;">
          <div class="gitlab-modal-title">设置</div>
          <div class="gitlab-modal-config">
            <label>GitLab 实例地址:<input type="text" id="baseUrl" placeholder="https://gitlab.com" /></label>
          </div>
          <div class="gitlab-modal-config">
            <label>GitLab Token:<input type="password" id="token" /></label>
          </div>
          <button id="saveSettingsBtn" class="gitlab-modal-btn">保存配置</button>
          <span id="saveStatus" class="gitlab-modal-status"></span>
        </div>
      </div>
    `;
    document.body.appendChild(mask);
    // 关闭按钮
    mask.querySelector('.gitlab-modal-close').onclick = () => mask.remove();
    // ESC关闭
    mask.onkeydown = e => { if (e.key === 'Escape') mask.remove(); };
    mask.tabIndex = -1; mask.focus();
    // 表单逻辑
    setupExportForm(mask);
    // 最近N天输入和按钮逻辑
    const startDateInput = mask.querySelector('#startDate');
    const endDateInput = mask.querySelector('#endDate');
    const recentDaysInput = mask.querySelector('#recentDays');
    const quickBtns = mask.querySelectorAll('.gitlab-quick-btn');
    function setRecentDays(n) {
      if (!n || isNaN(n) || n < 1) return;
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - n + 1);
      startDateInput.value = start.toISOString().slice(0, 10);
      endDateInput.value = end.toISOString().slice(0, 10);
    }
    recentDaysInput.addEventListener('input', function() {
      setRecentDays(parseInt(this.value, 10));
    });
    quickBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        recentDaysInput.value = this.dataset.days;
        setRecentDays(parseInt(this.dataset.days, 10));
      });
    });
    // 事件类型默认选中全部
    // 单选下拉默认选中即可，无需额外处理
  }

  // 表单和导出逻辑
  function setupExportForm(mask) {
    const form = mask.querySelector('#gitlab-export-form');
    const configPanel = mask.querySelector('#configPanel');
    const exportStatus = mask.querySelector('#exportStatus');
    const errorDiv = mask.querySelector('#error');
    // 自动填充配置
    chrome.storage.sync.get(['defaultToken', 'defaultBaseUrl'], (data) => {
      mask.querySelector('#token').value = data.defaultToken || '';
      mask.querySelector('#baseUrl').value = data.defaultBaseUrl || '';
    });
    // 导出表单提交
    form.onsubmit = async e => {
      e.preventDefault();
      errorDiv.textContent = '';
      exportStatus.textContent = '正在导出...';
      // 读取配置
      chrome.storage.sync.get(['defaultToken', 'defaultBaseUrl'], async (data) => {
        const token = data.defaultToken || mask.querySelector('#token').value;
        const baseUrl = data.defaultBaseUrl || mask.querySelector('#baseUrl').value;
        if (!token || !baseUrl) {
          exportStatus.textContent = '';
          configPanel.style.display = '';
          form.style.display = 'none';
          return;
        }
        // 读取查询项
        const after = mask.querySelector('#startDate').value;
        const before = mask.querySelector('#endDate').value;
        const targetTypeSel = mask.querySelector('#targetType');
        const actionSel = mask.querySelector('#action');
        const targetTypes = targetTypeSel.value ? [targetTypeSel.value] : [];
        const actions = actionSel.value ? [actionSel.value] : [];
        const format = mask.querySelector('#exportFormat').value;
        if (!after || !before) {
          errorDiv.textContent = '请选择时间范围';
          exportStatus.textContent = '';
          return;
        }
        if (after > before) {
          errorDiv.textContent = '开始日期不能晚于结束日期';
          exportStatus.textContent = '';
          return;
        }
        try {
          const events = await fetchEvents({ token, baseUrl, after, before, actions, targetTypes });
          await getAllProjectPaths(events, baseUrl, token);
          const eventsWithUrl = events.map(e => ({
            ...e,
            url: buildEventUrlWithPath(e, baseUrl, token),
            author: e.author && typeof e.author === 'object' ? (e.author.name || e.author.username || '') : (e.author || '')
          }));
          if (!eventsWithUrl.length) {
            errorDiv.textContent = '无数据';
            exportStatus.textContent = '';
            return;
          }
          if (format === 'csv') {
            if (eventsWithUrl.length > 1000) {
              await exportToCSVWithProgress(eventsWithUrl, msg => exportStatus.textContent = msg);
            } else {
              exportToCSV(eventsWithUrl);
            }
          } else if (format === 'md') {
            if (eventsWithUrl.length > 1000) {
              await exportToMarkdownWithProgress(eventsWithUrl, msg => exportStatus.textContent = msg);
            } else {
              exportToMarkdown(eventsWithUrl);
            }
          }
          exportStatus.textContent = '导出成功！';
          setTimeout(() => mask.remove(), 1200);
        } catch (e) {
          errorDiv.textContent = '导出失败';
          exportStatus.textContent = '';
        }
      });
    };
    // 配置保存
    mask.querySelector('#saveSettingsBtn').onclick = () => {
      const token = mask.querySelector('#token').value;
      const baseUrl = mask.querySelector('#baseUrl').value;
      if (!token || !baseUrl) {
        mask.querySelector('#saveStatus').textContent = '请填写完整';
        return;
      }
      chrome.storage.sync.set({ defaultToken: token, defaultBaseUrl: baseUrl }, () => {
        mask.querySelector('#saveStatus').textContent = '配置已保存';
        setTimeout(() => mask.querySelector('#saveStatus').textContent = '', 1500);
        configPanel.style.display = 'none';
        form.style.display = '';
      });
    };
  }

  // fetchEvents、导出工具、buildEventUrl 逻辑
  async function fetchEvents({ token, baseUrl, after, before, actions, targetTypes }) {
    let page = 1;
    let allEvents = [];
    let hasMore = true;
    while (hasMore) {
      const params = new URLSearchParams({
        per_page: 100,
        page: page.toString(),
        after,
        before
      });
      const url = `${baseUrl.replace(/\/$/, '')}/api/v4/events?${params.toString()}`;
      const res = await fetch(url, {
        headers: { 'PRIVATE-TOKEN': token }
      });
      if (!res.ok) throw new Error('API 请求失败');
      const events = await res.json();
      // 前端筛选 action/target_type
      const filtered = events.filter(e =>
        (!actions.length || actions.includes(e.action_name)) &&
        (!targetTypes.length || targetTypes.includes(e.target_type))
      );
      allEvents = allEvents.concat(filtered);
      hasMore = events.length === 100;
      page++;
    }
    return allEvents;
  }

  function getExportFilename(ext) {
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    const y = now.getFullYear();
    const m = pad(now.getMonth() + 1);
    const d = pad(now.getDate());
    const h = pad(now.getHours());
    const min = pad(now.getMinutes());
    const s = pad(now.getSeconds());
    return `git_event_${y}${m}${d}-${h}${min}${s}.${ext}`;
  }

  function exportToCSV(data, filename) {
    filename = filename || getExportFilename('csv');
    const csvRows = [];
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    csvRows.push(headers.join(','));
    for (const row of data) {
      csvRows.push(headers.map(h => '"' + (row[h] || '').toString().replace(/"/g, '""') + '"').join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  async function exportToCSVWithProgress(data, setStatus, filename) {
    filename = filename || getExportFilename('csv');
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
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  function exportToMarkdown(data, filename) {
    filename = filename || getExportFilename('md');
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

  async function exportToMarkdownWithProgress(data, setStatus, filename) {
    filename = filename || getExportFilename('md');
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

  // 项目路径缓存
  const projectPathCache = {};
  async function getProjectPath(project_id, baseUrl, token) {
    if (projectPathCache[project_id]) return projectPathCache[project_id];
    const url = `${baseUrl.replace(/\/$/, '')}/api/v4/projects/${project_id}`;
    const res = await fetch(url, { headers: { 'PRIVATE-TOKEN': token } });
    if (!res.ok) return '';
    const data = await res.json();
    projectPathCache[project_id] = data.path_with_namespace;
    return data.path_with_namespace;
  }
  // 批量查所有项目路径
  async function getAllProjectPaths(events, baseUrl, token) {
    const ids = Array.from(new Set(events.map(e => e.project_id).filter(Boolean)));
    await Promise.all(ids.map(id => getProjectPath(id, baseUrl, token)));
  }
  // 用 path_with_namespace 拼接事件链接
  function buildEventUrlWithPath(e, baseUrl, token) {
    if (!e || !e.target_type || !e.project_id) return '';
    const path = projectPathCache[e.project_id];
    if (!path) return '';
    const root = baseUrl.replace(/\/$/, '');
    if (e.target_type === 'Issue' && e.target_iid) {
      return `${root}/${path}/-/issues/${e.target_iid}`;
    }
    if (e.target_type === 'MergeRequest' && e.target_iid) {
      return `${root}/${path}/-/merge_requests/${e.target_iid}`;
    }
    if (e.target_type === 'Note' && e.noteable_type && e.target_iid) {
      if (e.noteable_type === 'Issue') {
        return `${root}/${path}/-/issues/${e.target_iid}#note_${e.id}`;
      }
      if (e.noteable_type === 'MergeRequest') {
        return `${root}/${path}/-/merge_requests/${e.target_iid}#note_${e.id}`;
      }
    }
    if (e.target_type === 'Milestone' && e.target_id) {
      return `${root}/${path}/-/milestones/${e.target_id}`;
    }
    if (e.target_type === 'Project') {
      return `${root}/${path}`;
    }
    if (e.target_type === 'Snippet' && e.target_id) {
      return `${root}/${path}/-/snippets/${e.target_id}`;
    }
    if (e.target_type === 'PushEvent' && e.commit_id) {
      return `${root}/${path}/-/commit/${e.commit_id}`;
    }
    return '';
  }

  const observer = new MutationObserver(insertExportBtn);
  observer.observe(document.body, { childList: true, subtree: true });
  insertExportBtn();
})(); 