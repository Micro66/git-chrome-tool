// utils/export.js

export function exportToCSV(data, filename = 'events.csv') {
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

export async function exportToCSVWithProgress(data, setStatus, filename = 'events.csv') {
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

export function exportToMarkdown(data, filename = 'events.md') {
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