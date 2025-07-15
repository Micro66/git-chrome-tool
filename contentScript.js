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

  if (window.__gitlab_export_btn_injected && window.__gitlab_copy_diff_btn_injected) return;
  
  // 检查是否是merge request页面
  const isMergeRequestPage = window.location.href.includes('/merge_requests/');
  
  if (!window.__gitlab_export_btn_injected) {
    window.__gitlab_export_btn_injected = true;
  }
  
  if (isMergeRequestPage && !window.__gitlab_copy_diff_btn_injected) {
    window.__gitlab_copy_diff_btn_injected = true;
  }

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
      
      // 获取导出按钮
      const exportBtn = mask.querySelector('button[type="submit"]');
      
      // 读取配置，优先使用最新保存的配置
      chrome.storage.sync.get(['defaultToken', 'defaultBaseUrl'], async (data) => {
        // 优先使用全局变量中的最新配置
        const token = window.__gitlab_latest_token || data.defaultToken || mask.querySelector('#token').value;
        const baseUrl = window.__gitlab_latest_baseUrl || data.defaultBaseUrl || mask.querySelector('#baseUrl').value;
        
        if (!token || !baseUrl) {
          exportStatus.textContent = '';
          configPanel.style.display = '';
          form.style.display = 'none';
          // 标记为待导出，配置保存后自动触发导出
          window.__gitlab_pending_export = true;
          
          // 禁用导出按钮
          if (exportBtn) {
            exportBtn.disabled = true;
            exportBtn.classList.add('disabled');
          }
          
          return;
        }
        
        // 确保导出按钮启用
        if (exportBtn) {
          exportBtn.disabled = false;
          exportBtn.classList.remove('disabled');
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
        
        // 隐藏配置面板，显示表单
        configPanel.style.display = 'none';
        form.style.display = '';
        
        // 启用导出按钮
        const exportBtn = mask.querySelector('button[type="submit"]');
        if (exportBtn) {
          exportBtn.disabled = false;
          exportBtn.classList.remove('disabled');
        }
        
        // 重新获取最新配置并更新表单状态
        chrome.storage.sync.get(['defaultToken', 'defaultBaseUrl'], (data) => {
          // 更新全局变量或状态，确保导出时使用最新配置
          window.__gitlab_latest_token = data.defaultToken;
          window.__gitlab_latest_baseUrl = data.defaultBaseUrl;
          
          // 如果用户点击了导出按钮后才配置的，可以自动触发一次导出
          if (window.__gitlab_pending_export) {
            window.__gitlab_pending_export = false;
            // 延迟一点时间再触发导出，确保UI更新完成
            setTimeout(() => form.dispatchEvent(new Event('submit')), 100);
          }
        });
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

  // 插入复制git diff按钮
  function insertCopyDiffBtn() {
    // 检查是否是merge request页面
    if (!window.location.href.includes('/merge_requests/')) return;
    
    // 如果按钮已存在，则不重复添加
    if (document.getElementById('gitlab-copy-diff-btn')) return;
    
    // 查找Edit按钮
    const editBtn = document.querySelector('.detail-page-header-actions a.js-issuable-edit');
    if (!editBtn) return;
    
    // 创建复制git diff按钮
    const btn = document.createElement('button');
    btn.id = 'gitlab-copy-diff-btn';
    btn.textContent = '复制git diff';
    btn.className = 'gl-button btn btn-md btn-default gl-display-none gl-md-display-block';
    btn.style.marginRight = '8px';
    btn.onclick = copyGitDiff;
    
    // 创建按钮内部的span元素，与Edit按钮结构保持一致
    const spanText = document.createElement('span');
    spanText.className = 'gl-button-text';
    spanText.textContent = '复制git diff';
    btn.textContent = ''; // 清空按钮文本
    btn.appendChild(spanText);
    
    // 插入按钮到Edit按钮前面
    editBtn.parentNode.insertBefore(btn, editBtn.nextSibling);
    
    // 同时在移动端下拉菜单中添加复制git diff选项
    try {
      const mobileEditItem = document.querySelector('[data-testid="edit-merge-request"]');
      if (mobileEditItem) {
        const mobileMenu = mobileEditItem.parentNode;
        
        const copyDiffItem = document.createElement('li');
        copyDiffItem.className = 'gl-new-dropdown-item';
        copyDiffItem.tabIndex = 0;
        copyDiffItem.dataset.testid = 'copy-git-diff';
        
        const copyDiffButton = document.createElement('button');
        copyDiffButton.tabIndex = -1;
        copyDiffButton.type = 'button';
        copyDiffButton.className = 'gl-new-dropdown-item-content';
        copyDiffButton.onclick = copyGitDiff;
        
        const textWrapper = document.createElement('span');
        textWrapper.className = 'gl-new-dropdown-item-text-wrapper';
        textWrapper.textContent = '复制git diff';
        
        copyDiffButton.appendChild(textWrapper);
        copyDiffItem.appendChild(copyDiffButton);
        
        // 插入到Edit选项前面
        mobileMenu.insertBefore(copyDiffItem, mobileEditItem);
      }
    } catch (e) {
      console.error('添加移动端复制git diff选项失败:', e);
    }
  }
  
  // 复制git diff功能
  function copyGitDiff(event) {
    // 阻止事件冒泡，防止触发其他事件
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // 获取当前页面URL
    const currentUrl = window.location.href;
    
    // 构建.diff URL
    const diffUrl = currentUrl.replace(/\/merge_requests\/(\d+).*$/, '/merge_requests/$1.diff');
    
    // 判断是桌面按钮还是移动端菜单项
    const isMobileMenu = event && event.currentTarget && event.currentTarget.classList.contains('gl-new-dropdown-item-content');
    
    // 获取按钮元素和文本元素
    let btn, textElement, originalText;
    
    if (isMobileMenu) {
      btn = event.currentTarget;
      textElement = btn.querySelector('.gl-new-dropdown-item-text-wrapper');
      originalText = textElement.textContent;
      textElement.textContent = '加载中...';
    } else {
      btn = document.getElementById('gitlab-copy-diff-btn');
      textElement = btn.querySelector('.gl-button-text');
      originalText = textElement.textContent;
      textElement.textContent = '加载中...';
      btn.disabled = true;
    }
    
    // 获取diff内容
    fetch(diffUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error('获取diff失败');
        }
        return response.text();
      })
      .then(diffText => {
        // 复制到剪贴板
        navigator.clipboard.writeText(diffText)
          .then(() => {
            // 显示成功状态
            textElement.textContent = '复制成功!';
            
            // 创建并显示一个临时的成功提示
            showToast('Git diff已复制到剪贴板');
            
            setTimeout(() => {
              textElement.textContent = originalText;
              if (!isMobileMenu) {
                btn.disabled = false;
              }
            }, 2000);
          })
          .catch(err => {
            console.error('复制失败:', err);
            textElement.textContent = '复制失败';
            setTimeout(() => {
              textElement.textContent = originalText;
              if (!isMobileMenu) {
                btn.disabled = false;
              }
            }, 2000);
          });
      })
      .catch(error => {
        console.error('获取diff失败:', error);
        textElement.textContent = '获取失败';
        setTimeout(() => {
          textElement.textContent = originalText;
          if (!isMobileMenu) {
            btn.disabled = false;
          }
        }, 2000);
      });
  }
  
  // 显示一个临时的toast提示
  function showToast(message) {
    // 检查是否已存在toast
    let toast = document.querySelector('.gitlab-toast');
    if (toast) {
      toast.remove();
    }
    
    // 创建toast元素
    toast = document.createElement('div');
    toast.className = 'gitlab-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #1f75cb;
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      z-index: 9999;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      font-size: 14px;
      font-weight: 500;
    `;
    
    // 添加到页面
    document.body.appendChild(toast);
    
    // 2秒后自动消失
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.5s';
      setTimeout(() => toast.remove(), 500);
    }, 2000);
  }

  // 新增：插入提取commit按钮
  function insertExtractCommitsBtn() {
    // 只在merge request编辑页面插入
    if (!/\/merge_requests\/(\d+)\/edit/.test(window.location.pathname)) return;
    if (document.getElementById('gitlab-extract-commits-btn')) return;
    // 优先查找Edit按钮
    const editBtn = document.querySelector('.detail-page-header-actions a.js-issuable-edit');
    let insertTarget = null;
    if (editBtn && editBtn.parentNode) {
      insertTarget = editBtn;
    } else {
      // 没有Edit按钮，降级插入到.branch-selector末尾
      insertTarget = document.querySelector('.branch-selector');
      if (!insertTarget) return;
    }
    // 创建按钮
    const btn = document.createElement('button');
    btn.id = 'gitlab-extract-commits-btn';
    btn.type = 'button';
    btn.className = 'gl-button btn btn-md btn-confirm';
    btn.style.marginLeft = '12px';
    btn.onclick = async function() {
      btn.disabled = true;
      btn.textContent = '加载中...';
      try {
        // 1. 获取merge_request_iid 和 group/projectName，支持多级group
        const url = window.location.href;
        const regex = /https?:\/\/[^/]+\/(.+?)\/-\/*merge_requests\/(\d+)\//;
        const match = url.match(regex);
        const namespaceProject = match ? match[1] : null;
        const mrIid = match ? match[2] : null;
        if (!mrIid) throw new Error('无法获取merge request iid');
        // 2. 获取token和baseUrl
        chrome.storage.sync.get(['defaultToken', 'defaultBaseUrl'], async (data) => {
          const token = window.__gitlab_latest_token || data.defaultToken;
          const baseUrl = window.__gitlab_latest_baseUrl || data.defaultBaseUrl;
          if (!token || !baseUrl) {
            alert('请先在插件设置中配置GitLab Token和实例地址');
            btn.textContent = '提取所有commit';
            btn.disabled = false;
            return;
          }
          // 3. 获取project_id
          let projectId = null;
          // 3.1 尝试从全局JS变量
          if (window.gon && window.gon.current_project_id) {
            projectId = window.gon.current_project_id;
          }
          // 3.2 尝试从meta标签
          if (!projectId) {
            const meta = document.querySelector('meta[name="project-id"]');
            if (meta) projectId = meta.getAttribute('content');
          }
          // 3.3 尝试从页面隐藏字段
          if (!projectId) {
            const input = document.querySelector('input[name="project_id"]');
            if (input) projectId = input.value;
          }
          // 3.4 如果还没有，自动从URL解析namespace/project并查API
          if (!projectId && namespaceProject) {
            // 用项目API查project_id
            const projectApiUrl = `${baseUrl.replace(/\/$/, '')}/api/v4/projects/${encodeURIComponent(namespaceProject)}`;
            try {
              const res = await fetch(projectApiUrl, { headers: { 'PRIVATE-TOKEN': token } });
              if (res.ok) {
                const projectDetail = await res.json();
                projectId = projectDetail.id;
              }
            } catch (e) { /* 忽略，后续有兜底 */ }
          }
          if (!projectId) {
            alert('无法自动获取project_id，请检查页面URL或手动输入');
            btn.textContent = '提取所有commit';
            btn.disabled = false;
            return;
          }
          // 4. 拉取commit
          const apiUrl = `${baseUrl.replace(/\/$/, '')}/api/v4/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}/commits`;
          try {
            const res = await fetch(apiUrl, { headers: { 'PRIVATE-TOKEN': token } });
            if (!res.ok) throw new Error('API请求失败');
            const commits = await res.json();
            showCommitsModal(commits);
          } catch (e) {
            alert('获取commit信息失败: ' + e.message);
          }
          btn.textContent = '提取所有commit';
          btn.disabled = false;
        });
      } catch (e) {
        alert(e.message);
        btn.textContent = '提取所有commit';
        btn.disabled = false;
      }
    };
    // 创建span结构
    const spanText = document.createElement('span');
    spanText.className = 'gl-button-text';
    spanText.textContent = '提取所有commit';
    btn.textContent = '';
    btn.appendChild(spanText);
    // 插入
    if (editBtn && editBtn.parentNode) {
      editBtn.parentNode.insertBefore(btn, editBtn);
    } else {
      insertTarget.appendChild(btn);
    }
  }

  // 新增：弹窗展示commit信息（带导出/复制按钮）
  function showCommitsModal(commits) {
    if (document.getElementById('gitlab-commits-modal')) return;
    const mask = document.createElement('div');
    mask.className = 'gitlab-modal-mask';
    mask.id = 'gitlab-commits-modal';
    // 分页参数
    let pageSize = 20;
    let page = 1;
    const pageSizeOptions = [10, 20, 50, 100];
    const total = commits ? commits.length : 0;
    function renderTable() {
      let html = `<div class=\"gitlab-modal-card\"><button class=\"gitlab-modal-close\" title=\"关闭\">×</button><div class=\"gitlab-modal-title\">MR Commit 列表</div>`;
      // 按钮区+每页条数选择
      html += `<div style='margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;'>
        <div>
          <button id='gitlab-commits-export-csv' class='gitlab-modal-btn' style='margin-right:8px;'>导出CSV</button>
          <button id='gitlab-commits-copy-md' class='gitlab-modal-btn' style='margin-right:8px;'>复制Markdown</button>
          <button id='gitlab-commits-copy' class='gitlab-modal-btn' style='margin-right:8px;'>复制全部</button>
          <button id='gitlab-commits-ai-summary' class='gitlab-modal-btn' style='background:#10a37f;'>AI总结</button>
        </div>
        <div style='font-size:14px;'>
          每页
          <select id='gitlab-commits-page-size' style='margin:0 4px;'>
            ${pageSizeOptions.map(opt => `<option value='${opt}'${opt===pageSize?" selected":''}>${opt}</option>`).join('')}
          </select>
          条
        </div>
      </div>`;
      html += `<div style=\"max-height:400px;overflow:auto;font-size:14px;\">`;
      if (!commits || !commits.length) {
        html += '<div>无commit数据</div>';
      } else {
        html += '<table style="width:100%;border-collapse:collapse;border:1px solid #d1d5db;">';
        html += '<tr style="background:#f3f4f6;">'
          +'<th style="text-align:left;border:1px solid #d1d5db;padding:4px 8px;">SHA</th>'
          +'<th style="text-align:left;border:1px solid #d1d5db;padding:4px 8px;">标题</th>'
          +'<th style="text-align:left;border:1px solid #d1d5db;padding:4px 8px;">作者</th>'
          +'<th style="text-align:left;border:1px solid #d1d5db;padding:4px 8px;">时间</th>'
        +'</tr>';
        const start = (page-1)*pageSize;
        const end = Math.min(start+pageSize, commits.length);
        for (let i=start; i<end; ++i) {
          const c = commits[i];
          html += `<tr><td style=\"font-family:monospace;border:1px solid #d1d5db;padding:4px 8px;\">${c.short_id}</td><td style=\"border:1px solid #d1d5db;padding:4px 8px;\">${c.title}</td><td style=\"border:1px solid #d1d5db;padding:4px 8px;\">${c.author_name}</td><td style=\"border:1px solid #d1d5db;padding:4px 8px;\">${c.created_at.replace('T',' ').replace('Z','')}</td></tr>`;
        }
        html += '</table>';
      }
      html += '</div>';
      // 分页控件
      if (commits && commits.length > 0) {
        const totalPages = Math.ceil(commits.length/pageSize);
        html += `<div style='margin-top:10px;display:flex;justify-content:space-between;align-items:center;font-size:14px;'>
          <div>共 ${commits.length} 条，当前第 ${page} / ${totalPages} 页</div>
          <div>
            <button id='gitlab-commits-prev' class='gitlab-modal-btn' style='margin-right:8px;' ${page===1?'disabled':''}>上一页</button>
            <button id='gitlab-commits-next' class='gitlab-modal-btn' ${page===totalPages?'disabled':''}>下一页</button>
          </div>
        </div>`;
      }
      html += '</div>';
      mask.innerHTML = html;
      mask.querySelector('.gitlab-modal-close').onclick = () => mask.remove();
      mask.onkeydown = e => { if (e.key === 'Escape') mask.remove(); };
      mask.tabIndex = -1; mask.focus();
      // 按钮事件
      const headers = ['SHA', '标题', '作者', '时间'];
      const commitRows = (commits||[]).map(c => [c.short_id, c.title, c.author_name, c.created_at.replace('T',' ').replace('Z','')]);
      // 导出CSV
      mask.querySelector('#gitlab-commits-export-csv').onclick = () => {
        let csv = headers.join(',') + '\n';
        for (const row of commitRows) {
          csv += row.map(v => '"'+(v||'').replace(/"/g,'""')+'"').join(',') + '\n';
        }
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `mr_commits_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
      };
      // 导出Markdown
      mask.querySelector('#gitlab-commits-copy-md').onclick = () => {
        let md = '| ' + headers.join(' | ') + ' |\n';
        md += '| ' + headers.map(()=> '---').join(' | ') + ' |\n';
        for (const row of commitRows) {
          md += '| ' + row.map(v => (v||'').replace(/\|/g,'\\|')) .join(' | ') + ' |\n';
        }
        navigator.clipboard.writeText(md).then(() => {
          showToast('已复制为Markdown表格');
        });
      };
      // 复制全部
      mask.querySelector('#gitlab-commits-copy').onclick = () => {
        let text = headers.join('\t') + '\n';
        for (const row of commitRows) {
          text += row.join('\t') + '\n';
        }
        navigator.clipboard.writeText(text).then(() => {
          showToast('已复制到剪贴板');
        });
      };
      // AI总结按钮
      mask.querySelector('#gitlab-commits-ai-summary').onclick = async () => {
        const btn = mask.querySelector('#gitlab-commits-ai-summary');
        btn.disabled = true;
        btn.textContent = '总结中...';
        try {
          // 组装prompt
          let prompt = '请根据以下Git Commit列表，总结出一个合适的Merge Request标题和描述（中文），格式如下：\nTitle: ...\nDescription: ...\nCommit列表如下：\n';
          for (const c of commits) {
            prompt += `- ${c.title}\n`;
          }
          // 读取llm配置
          const config = await new Promise((resolve) => {
            chrome.storage.sync.get(['llmConfigs'], (data) => {
              const configs = Array.isArray(data.llmConfigs) ? data.llmConfigs : [];
              const def = configs.find(cfg => cfg.isDefault) || configs[0] || null;
              resolve(def);
            });
          });
          if (!config || !config.apiKey || !config.baseURL || !config.model) throw new Error('请先在插件设置中配置LLM');
          // 展示弹窗，输出区先显示loading
          const resultMask = document.createElement('div');
          resultMask.className = 'gitlab-modal-mask';
          resultMask.innerHTML = `<div class='gitlab-modal-card'><button class='gitlab-modal-close' title='关闭'>×</button><div class='gitlab-modal-title'>AI总结结果</div><pre id='gitlab-ai-stream-output' style='white-space:pre-wrap;font-size:15px;background:#f8fafc;padding:12px;border-radius:8px;margin-bottom:12px;min-height:60px;max-width:600px;word-break:break-all;overflow-x:auto;max-height:300px;overflow-y:auto;'>AI正在生成...</pre><div style='display:flex;gap:8px;'><button id='gitlab-ai-stop' class='gitlab-modal-btn' style='background:#e53e3e;'>停止</button><button id='gitlab-ai-copy-result' class='gitlab-modal-btn' disabled>复制到剪贴板</button><button id='gitlab-ai-fill-mr' class='gitlab-modal-btn' style='background:#6366f1;' disabled>填充到MR</button></div></div>`;
          resultMask.querySelector('.gitlab-modal-close').onclick = () => { abortStream(); resultMask.remove(); };
          document.body.appendChild(resultMask);
          const outputPre = resultMask.querySelector('#gitlab-ai-stream-output');
          const copyBtn = resultMask.querySelector('#gitlab-ai-copy-result');
          const fillBtn = resultMask.querySelector('#gitlab-ai-fill-mr');
          const stopBtn = resultMask.querySelector('#gitlab-ai-stop');
          let fullText = '';
          let streamSuccess = false;
          let abortController = null;
          let streamAborted = false;
          function abortStream() {
            streamAborted = true;
            if (abortController) abortController.abort();
          }
          // 页面关闭时自动停止
          window.addEventListener('beforeunload', abortStream);
          stopBtn.onclick = () => {
            abortStream();
            stopBtn.disabled = true;
            stopBtn.textContent = '已停止';
          };
          // 尝试stream模式
          try {
            abortController = new AbortController();
            const res = await fetch(`${config.baseURL.replace(/\/$/, '')}/chat/completions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
                ...(config.defaultHeaders||{})
              },
              body: JSON.stringify({
                model: config.model,
                stream: true,
                messages: [
                  { role: 'system', content: '你是一个资深的Git代码总结助手。' },
                  { role: 'user', content: prompt }
                ]
              }),
              signal: abortController.signal
            });
            if (!res.ok) throw new Error('LLM API请求失败');
            const reader = res.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let done = false;
            let firstChunk = true;
            while (!done && !streamAborted) {
              const { value, done: doneReading } = await reader.read();
              done = doneReading;
              if (value) {
                const chunk = decoder.decode(value, { stream: true });
                chunk.split(/\r?\n/).forEach(line => {
                  if (line.startsWith('data: ')) {
                    const data = line.replace('data: ', '').trim();
                    if (data === '[DONE]') return;
                    try {
                      const delta = JSON.parse(data);
                      const content = delta.choices?.[0]?.delta?.content;
                      if (content) {
                        if (firstChunk) { outputPre.textContent = ''; firstChunk = false; }
                        fullText += content;
                        outputPre.textContent = fullText;
                      }
                    } catch {}
                  }
                });
              }
            }
            streamSuccess = !streamAborted;
          } catch (e) {
            // stream失败fallback普通模式
            if (streamAborted) {
              outputPre.textContent += '\n[已停止]';
              copyBtn.disabled = false;
              fillBtn.disabled = false;
              stopBtn.disabled = true;
              stopBtn.textContent = '已停止';
              window.removeEventListener('beforeunload', abortStream);
              return;
            }
          }
          if (!streamSuccess && !streamAborted) {
            // fallback普通模式
            const res = await fetch(`${config.baseURL.replace(/\/$/, '')}/chat/completions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
                ...(config.defaultHeaders||{})
              },
              body: JSON.stringify({
                model: config.model,
                messages: [
                  { role: 'system', content: '你是一个资深的Git代码总结助手。' },
                  { role: 'user', content: prompt }
                ]
              })
            });
            if (!res.ok) throw new Error('LLM API请求失败');
            const data = await res.json();
            fullText = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '';
            outputPre.textContent = fullText || '无内容';
          }
          // 启用按钮
          copyBtn.disabled = false;
          fillBtn.disabled = false;
          stopBtn.disabled = true;
          stopBtn.textContent = '已停止';
          window.removeEventListener('beforeunload', abortStream);
        } catch(e) {
          showToast('AI总结失败: '+e.message);
        } finally {
          btn.disabled = false;
          btn.textContent = 'AI总结';
        }
      };
      // 分页事件
      const pageSizeSelect = mask.querySelector('#gitlab-commits-page-size');
      if (pageSizeSelect) {
        pageSizeSelect.onchange = e => {
          pageSize = parseInt(e.target.value, 10);
          page = 1;
          renderTable();
        };
      }
      const prevBtn = mask.querySelector('#gitlab-commits-prev');
      if (prevBtn) {
        prevBtn.onclick = () => { if (page > 1) { page--; renderTable(); } };
      }
      const nextBtn = mask.querySelector('#gitlab-commits-next');
      if (nextBtn) {
        const totalPages = Math.ceil(commits.length/pageSize);
        nextBtn.onclick = () => { if (page < totalPages) { page++; renderTable(); } };
      }
    }
    renderTable();
    document.body.appendChild(mask);
  }

  // 根据页面类型执行不同的操作
  function handlePageChange() {
    if (window.location.href.includes('/users/') && window.location.href.includes('/activity')) {
      insertExportBtn();
    } else if (window.location.href.includes('/merge_requests/')) {
      insertCopyDiffBtn();
      insertExtractCommitsBtn(); // 新增
    }
  }

  const observer = new MutationObserver(handlePageChange);
  observer.observe(document.body, { childList: true, subtree: true });
  handlePageChange();
})(); 