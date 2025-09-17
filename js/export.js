function toCsv(records) {
  const esc = s => {
    const str = String(s ?? '');
    const needsQuotes = /[",\n]/.test(str);
    const sanitized = str.replace(/"/g, '""');
    return needsQuotes ? `"${sanitized}"` : sanitized;
  };
  const header = ['timestamp','deviceName','serviceUUIDs','rssi','latitude','longitude'];
  const lines = [header.join(',')];
  for (const r of records) {
    const uuids = Array.isArray(r.serviceUUIDs) ? r.serviceUUIDs.join(';') : '';
    lines.push([
      r.timestamp,
      r.deviceName || '',
      uuids,
      Number.isFinite(r.rssi) ? r.rssi : '',
      typeof r.latitude  === 'number' ? r.latitude  : '',
      typeof r.longitude === 'number' ? r.longitude : ''
    ].map(esc).join(','));
  }
  return lines.join('\n');
}

function download(filename, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

export function exportJSON(records) {
  download(`ble-scans-${new Date().toISOString()}.json`, 'application/json', JSON.stringify(records, null, 2));
}
export function exportCSV(records) {
  download(`ble-scans-${new Date().toISOString()}.csv`, 'text/csv', toCsv(records));
}
