const API_BASE = '/api';

export async function fetchStations(zone = '', status = '') {
  const params = new URLSearchParams();
  if (zone) params.append('zone', zone);
  if (status) params.append('status', status);
  const res = await fetch(`${API_BASE}/stations?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch stations');
  return res.json();
}

export async function fetchStationDetail(stationId) {
  const res = await fetch(`${API_BASE}/stations/${stationId}`);
  if (!res.ok) throw new Error(`Failed to fetch station ${stationId}`);
  return res.json();
}

export async function fetchStationReadings(stationId, limit = 50) {
  const res = await fetch(`${API_BASE}/stations/${stationId}/readings?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch readings');
  return res.json();
}

export async function fetchStationNeighbors(stationId, parameter = 'temperature') {
  const res = await fetch(`${API_BASE}/stations/${stationId}/neighbors?parameter=${parameter}`);
  if (!res.ok) throw new Error('Failed to fetch neighbors');
  return res.json();
}

export async function fetchAnomalies(classification = '', stationId = '') {
  const params = new URLSearchParams();
  if (classification) params.append('classification', classification);
  if (stationId) params.append('station_id', stationId);
  const res = await fetch(`${API_BASE}/anomalies?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch anomalies');
  return res.json();
}

export async function fetchAlerts(severity = '') {
  const params = new URLSearchParams();
  if (severity) params.append('severity', severity);
  const res = await fetch(`${API_BASE}/alerts?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function submitFeedback(alertId, action, notes = '') {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, notes })
  });
  if (!res.ok) throw new Error('Failed to submit feedback');
  return res.json();
}

export async function injectSimulation(scenario, stationId = null) {
  const res = await fetch(`${API_BASE}/simulator/inject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario, station_id: stationId })
  });
  if (!res.ok) throw new Error('Failed to inject simulation');
  return res.json();
}

export async function resetSimulation() {
  const res = await fetch(`${API_BASE}/simulator/reset`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to reset simulation');
  return res.json();
}

export async function fetchTrustScore(stationId) {
  const res = await fetch(`${API_BASE}/trust-score/${stationId}`);
  if (!res.ok) throw new Error('Failed to fetch trust score');
  return res.json();
}

export async function fetchMetrics() {
  const res = await fetch(`${API_BASE}/metrics`);
  if (!res.ok) throw new Error('Failed to fetch system metrics');
  return res.json();
}
