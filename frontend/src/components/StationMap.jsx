import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { ExternalLink, ShieldCheck, AlertCircle, Thermometer, Wind, Droplets } from 'lucide-react';

const createRadarIcon = (status, trustScore) => {
  let color = '#10b981'; // Green
  let pingColor = 'rgba(168, 185, 129, 0.4)';
  
  if (status === 'EXTREME') {
    color = '#a855f7'; // Purple - Genuine Extreme
    pingColor = 'rgba(168, 85, 247, 0.6)';
  } else if (status === 'FAULT') {
    color = '#f43f5e'; // Rose - Sensor Fault
    pingColor = 'rgba(244, 63, 94, 0.6)';
  } else if (status === 'SUSPICIOUS') {
    color = '#f59e0b'; // Amber - Warning
    pingColor = 'rgba(245, 158, 11, 0.5)';
  } else if (status === 'UNCERTAIN') {
    color = '#06b6d4'; // Cyan - Review
    pingColor = 'rgba(6, 182, 212, 0.5)';
  }

  const html = `
    <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; background: ${pingColor}; animation: radar-pulse 2s infinite;"></div>
      <div style="position: relative; width: 14px; height: 14px; border-radius: 50%; background: ${color}; border: 2px solid #0f172a; box-shadow: 0 0 8px ${color};"></div>
    </div>
  `;

  return L.divIcon({
    html: html,
    className: 'custom-radar-pin',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14]
  });
};

export default function StationMap({ stations, onSelectStation }) {
  // Center roughly at Nagpur/Central India
  const center = [22.8, 79.5];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'EXTREME':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">GENUINE EXTREME</span>;
      case 'FAULT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">SENSOR FAULT</span>;
      case 'SUSPICIOUS':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">SUSPICIOUS</span>;
      case 'UNCERTAIN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">UNCERTAIN</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">NORMAL</span>;
    }
  };

  return (
    <div className="relative w-full h-[520px] rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      {/* Legend Overlay */}
      <div className="absolute top-3 right-3 z-[1000] glass-panel px-3 py-2 rounded-lg text-xs space-y-1.5 shadow-lg border border-slate-700/60">
        <div className="text-[10px] font-bold tracking-wider uppercase text-slate-400 border-b border-slate-800 pb-1">
          Station Health Status
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
          <span className="text-slate-300 text-[11px]">Normal Baseline</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
          <span className="text-slate-300 text-[11px]">Genuine Extreme Event</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
          <span className="text-slate-300 text-[11px]">Sensor Hardware Fault</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
          <span className="text-slate-300 text-[11px]">Uncertain (Human Triage)</span>
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={5}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=cb1_33z7_1_9a58dfb9ce3f51b545c96ac7"
        />
        {stations.map((st) => (
          <Marker
            key={st.id}
            position={[st.lat, st.lng]}
            icon={createRadarIcon(st.status, st.trust_score)}
          >
            <Popup className="custom-popup">
              <div className="p-1 space-y-2 text-slate-200">
                <div className="flex items-start justify-between border-b border-slate-800 pb-1.5">
                  <div>
                    <h4 className="font-bold text-sm text-white">{st.name}</h4>
                    <p className="text-[10px] font-mono text-cyan-400">{st.id} • {st.zone}</p>
                  </div>
                  {getStatusBadge(st.status)}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-1">
                  <div className="flex items-center space-x-1.5 bg-slate-900/90 p-1.5 rounded border border-slate-800">
                    <Thermometer className="w-3.5 h-3.5 text-rose-400" />
                    <div>
                      <div className="text-[9px] text-slate-400">Base Temp</div>
                      <div className="font-mono font-semibold text-slate-200">{st.base_temp}°C</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 bg-slate-900/90 p-1.5 rounded border border-slate-800">
                    <Droplets className="w-3.5 h-3.5 text-sky-400" />
                    <div>
                      <div className="text-[9px] text-slate-400">Base RH</div>
                      <div className="font-mono font-semibold text-slate-200">{st.base_humidity}%</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                  <span className="text-[11px] text-slate-400">Trust Score:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {Math.round(st.trust_score * 100)}%
                  </span>
                </div>

                <button
                  onClick={() => onSelectStation(st.id)}
                  className="w-full mt-2 py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold flex items-center justify-center space-x-1 transition-colors"
                >
                  <span>Open Deep Diagnostics</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
