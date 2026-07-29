'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context';
import LicenseGate from '../components/LicenseGate';
import GlassCard from '../components/GlassCard';
import {
  Users, Play, Pause, Square, Camera, Cpu, Timer, BarChart3, Activity,
  ScanSearch, Upload, Image as ImageIcon, Video, Sparkles, Sliders,
  Palette, Film, Cable, Zap, Signal, Database, Eye,
  FileText, FileSpreadsheet, Download, Printer, Calendar,
  Globe, MapPin, Target, Layers, Navigation,
  BellRing, Plus, Check, AlertTriangle, Shield, Bell, X,
  Plane, ClipboardCheck, Clock, CheckCircle2,
  Anchor, Wind, Battery, Gauge, Radio, ThermometerSun,
  FlaskConical, CloudLightning, Loader2,
} from 'lucide-react';

/* Helper: Mini bar chart */
function MiniBarChart({ data, color = 'var(--neon-cyan)', height = 60 }: { data: number[]; color?: string; height?: number }) {
  const max = Math.max(...data);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height, padding: '4px 0' }}>
      {data.map((v, i) => (
        <div key={i} style={{
          flex: 1, borderRadius: 2,
          height: `${(v / max) * 100}%`,
          background: `linear-gradient(180deg, ${color}, ${color}44)`,
          opacity: 0.7 + (i / data.length) * 0.3,
          transition: 'height 0.3s ease',
          minHeight: 2,
        }} />
      ))}
    </div>
  );
}

/* ===== CROWD COUNTING (Base License) ===== */
export function CrowdCountingPage() {
  const { addToast } = useApp();
  const [status, setStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const [count, setCount] = useState(0);
  const [frames, setFrames] = useState(0);
  const [sourceType, setSourceType] = useState('RTSP');
  const [uploadType, setUploadType] = useState('Image');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [address, setAddress] = useState('rtsp://192.168.10.100:15004');
  const [processingTime, setProcessingTime] = useState<number | string | null>(null);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (sourceType === 'RTSP') setAddress('rtsp://192.168.10.100:15004');
    else if (sourceType === 'UDP') setAddress('udp://127.0.0.1:5000');
  }, [sourceType]);

  useEffect(() => {
    if (status === 'running') {
      intervalRef.current = setInterval(() => {
        setCount(prev => {
          const delta = Math.floor(Math.random() * 20) - 8;
          return Math.max(100, prev + delta);
        });
        setFrames(prev => prev + 1);
      }, 800);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [status]);

  const handleStart = async () => {
    setStatus('running');
    setCount(0);
    setFrames(0);
    setProcessingTime(null);
    setResultImageUrl(null);
    addToast({ type: 'info', title: 'Analysis Started', message: 'Crowd counting session initiated.' });

    try {
      const formData = new FormData();
      let endpoint = 'http://127.0.0.1:8000/crowd/video';

      if (sourceType === 'Upload File') {
        if (!selectedFile) {
          throw new Error('Please select a file to upload.');
        }
        formData.append('file', selectedFile);
        if (uploadType === 'Image') {
          endpoint = 'http://127.0.0.1:8000/crowd/image';
        }
      } else {
        formData.append('address', address);
        formData.append('type', sourceType);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();
      if (data) {
        if (data.count !== undefined) setCount(data.count);
        if (data.processing_time !== undefined) setProcessingTime(data.processing_time);
        if (data.heatmap_path) setResultImageUrl(data.heatmap_path.startsWith('http') ? data.heatmap_path : `http://127.0.0.1:8000${data.heatmap_path.startsWith('/') ? '' : '/'}${data.heatmap_path}`);
        else if (data.image_url) setResultImageUrl(data.image_url.startsWith('http') ? data.image_url : `http://127.0.0.1:8000${data.image_url.startsWith('/') ? '' : '/'}${data.image_url}`);
      }

      if (sourceType === 'Upload File' && uploadType === 'Image') {
        setStatus('idle');
        addToast({ type: 'success', title: 'Analysis Complete', message: 'Image processing finished.' });
      }

    } catch (error: any) {
      console.error("Analysis error:", error);
      addToast({ type: 'error', title: 'Analysis Failed', message: error.message || 'Failed to connect to API' });
      setStatus('idle');
    }
  };

  const handleStop = () => {
    setStatus('idle');
    addToast({ type: 'success', title: 'Analysis Stopped', message: `Session ended — Peak count: ${count}` });
    setCount(0);
    setFrames(0);
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={22} /> Crowd Counting
            <span className="badge badge-success">Base License <CheckCircle2 size={11} /></span>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Deep learning density estimation — CUDA GPU accelerated</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {status === 'idle' && <button className="btn btn-primary" onClick={handleStart} style={{ gap: 6 }}><Play size={14} /> Start Analysis</button>}
          {status === 'running' && <button className="btn btn-secondary" onClick={() => setStatus('paused')} style={{ gap: 6 }}><Pause size={14} /> Pause</button>}
          {status === 'paused' && <button className="btn btn-primary" onClick={() => setStatus('running')} style={{ gap: 6 }}><Play size={14} /> Resume</button>}
          {status !== 'idle' && <button className="btn btn-danger" onClick={handleStop} style={{ gap: 6 }}><Square size={14} /> Stop</button>}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div>
          <div className="video-container" style={{ marginBottom: 12 }}>
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0a0e1a, #0d1528)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
              {status === 'running' && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 48%, rgba(88,166,255,0.04) 50%, transparent 52%)', animation: 'scanline 3s linear infinite' }} />}
              {resultImageUrl ? (
                <img src={resultImageUrl} alt="Result" style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'relative', zIndex: 1 }} />
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', position: 'relative', zIndex: 1 }}>
                  <Users size={48} style={{ color: 'var(--neon-cyan)', opacity: 0.3, marginBottom: 12 }} />
                  <div style={{ fontSize: 48, fontWeight: 900, color: 'var(--neon-cyan)' }}>
                    {count || '—'}
                  </div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-code)', marginTop: 4 }}>DENSITY MAP — ESTIMATED HEAD COUNT</div>
                </div>
              )}
            </div>
            {status === 'running' && (
              <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 'var(--radius-full)', background: 'rgba(0,0,0,0.6)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--neon-green)', animation: 'pulse 1s infinite' }} />
                <span style={{ fontSize: 11, fontFamily: 'var(--font-code)', color: 'var(--neon-green)' }}>PROCESSING</span>
              </div>
            )}
          </div>
          <GlassCard tilt={false}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><BarChart3 size={15} /> Session Statistics</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {[
                { label: 'CURRENT', value: count > 0 ? String(count) : '—', color: 'var(--neon-cyan)', icon: <Users size={12} /> },
                { label: 'PROCESSING TIME', value: processingTime ? `${processingTime}s` : '—', color: 'var(--neon-orange)', icon: <Timer size={12} /> },
              ].map(s => (
                <div key={s.label} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>{s.icon} {s.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-code)', color: s.color, marginTop: 4 }}>{s.value}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <GlassCard>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}><Camera size={15} /> Source</div>
            <div className="form-group">
              <label className="form-label">Source Type</label>
              <select className="form-select" value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
                <option value="RTSP">RTSP</option>
                <option value="UDP">UDP</option>
                <option value="Upload File">Upload File</option>
              </select>
            </div>
            {sourceType === 'Upload File' && (
              <div className="form-group">
                <label className="form-label">File Type</label>
                <select className="form-select" value={uploadType} onChange={(e) => setUploadType(e.target.value)}>
                  <option value="Image">Image</option>
                  <option value="Video">Video</option>
                </select>
              </div>
            )}
            {sourceType !== 'Upload File' ? (
              <div className="form-group">
                <label className="form-label">Address</label>
                <input className="form-input font-mono" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Select {uploadType}</label>
                <input type="file" accept={uploadType === 'Image' ? "image/*" : "video/*"} className="form-input" style={{ padding: '6px' }} onChange={(e) => { if (e.target.files && e.target.files.length > 0) setSelectedFile(e.target.files[0]); }} />
              </div>
            )}
            <div className="form-group"><label className="form-label">Resolution</label><select className="form-select"><option>1920×1080</option><option>1280×720</option></select></div>
          </GlassCard>
          <div style={{ display: 'none' }}>
            <GlassCard>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}><Cpu size={15} /> AI Model Config</div>
              <div className="form-group"><label className="form-label">Model</label><select className="form-select"><option>CSRNet (Density)</option><option>MCNN</option><option>DM-Count</option></select></div>
              <div className="form-group"><label className="form-label">Confidence Threshold</label><input type="range" min="0" max="100" defaultValue="60" style={{ width: '100%', accentColor: 'var(--neon-cyan)' }} /><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}><span>Low</span><span>60%</span><span>High</span></div></div>
              <div className="form-group"><label className="form-label">GPU Device</label><select className="form-select"><option>CUDA:0 (RTX 4090)</option></select></div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== IMAGE DETECTION ===== */
export function ImageDetectionPage() {
  const { addToast } = useApp();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<{ obj: string; conf: number; color: string }[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSelectFile = async (file: File) => {
    setSelectedFile(file.name);
    setAnalyzing(true);
    setResults([]);
    setResultImage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/api/v1/detect/image', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }


      const data = await response.json();

      const colors = ['var(--neon-green)', 'var(--neon-cyan)', 'var(--neon-blue)', 'var(--neon-purple)', 'var(--neon-yellow)'];

      // Get the objects array from the response data
      const list = data.objects || [];

      const mappedResults: { obj: string; conf: number; color: string }[] = list.map((item: any, idx: number) => {
        const confValue = item.confidence ?? 1;
        // Map the 'class' property and calculate percentage confidence
        return {
          obj: item.class ? (item.class.charAt(0).toUpperCase() + item.class.slice(1)) : 'Unknown',
          conf: confValue <= 1 && confValue > 0 ? Math.round(confValue * 100) : Math.round(confValue),
          color: item.color || colors[idx % colors.length]
        };
      });

      setResults(mappedResults);

      if (data.image_url) {
        setResultImage(data.image_url.startsWith('http') ? data.image_url : `http://localhost:8000${data.image_url.startsWith('/') ? '' : '/'}${data.image_url}`);
      }

      const timeMsg = data.processing_time ? ` in ${data.processing_time}s` : '';
      addToast({ type: 'success', title: 'Detection Complete', message: `${mappedResults.length} objects detected${timeMsg}.` });
    } catch (error: any) {
      console.error("Detection error:", error);
      addToast({ type: 'error', title: 'Detection Failed', message: error.message || 'Failed to connect to API' });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <LicenseGate moduleCode="1.1a" moduleName="Digital Imaging Analytic & Object Detection">
      <div className="animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}><ScanSearch size={22} /> Image Object Detection</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>AI-powered detection on static images — YOLOv8 / CUDA</p>
          </div>
          <span className="badge badge-success">1.1a <CheckCircle2 size={11} /></span>
        </div>
        <div className="grid-2">
          <GlassCard>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Upload size={15} /> Upload Image</div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files && e.target.files.length > 0) handleSelectFile(e.target.files[0]); }} />
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleSelectFile(e.dataTransfer.files[0]); }}
              style={{
                border: `2px dashed ${dragOver ? 'var(--neon-cyan)' : 'var(--border-default)'}`,
                borderRadius: 'var(--radius-lg)', padding: 48, textAlign: 'center',
                transition: 'all 0.2s', cursor: 'pointer',
                background: dragOver ? 'rgba(88,166,255,0.03)' : 'transparent',
              }}
            >
              {selectedFile ? (
                <div>
                  <ImageIcon size={40} style={{ color: 'var(--neon-cyan)', marginBottom: 8 }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{selectedFile}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Click to select another image</p>
                </div>
              ) : (
                <>
                  <Upload size={40} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Drag & drop image here</p>
                  <p style={{ color: 'var(--text-disabled)', fontSize: 11, marginTop: 4 }}>JPG, PNG, TIFF — Max 50MB</p>
                  <button className="btn btn-primary mt-16" onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}>Select Image</button>
                </>
              )}
            </div>
          </GlassCard>
          <GlassCard>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Eye size={15} /> Detection Results</div>
            {analyzing ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Loader2 size={32} style={{ color: 'var(--neon-cyan)', animation: 'spin 1s linear infinite', marginBottom: 12 }} />
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Analyzing image...</p>
              </div>
            ) : results.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {results.map((d, i) => (
                  <div key={d.obj} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    background: 'var(--bg-card-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)',
                    animation: `fadeIn 0.3s ease ${i * 0.15}s both`,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{d.obj}</div>
                      <div className="progress-bar" style={{ marginTop: 6, height: 3 }}>
                        <div className="progress-fill" style={{ width: `${d.conf}%`, background: d.color }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-code)', color: d.color }}>{d.conf}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                <ScanSearch size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
                <p style={{ fontSize: 13 }}>Upload an image to detect objects</p>
              </div>
            )}
          </GlassCard>
        </div>

        {resultImage && (
          <div className="animate-fade-in" style={{ marginTop: 24, animationDelay: '0.2s' }}>
            <GlassCard>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ImageIcon size={15} /> Detection Output Image
              </div>
              <div style={{ width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-card-hover)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'center' }}>
                <img src={resultImage} alt="Detected Output" style={{ maxWidth: '100%', maxHeight: '600px', objectFit: 'contain' }} />
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </LicenseGate>
  );
}

/* ===== VIDEO DETECTION ===== */
export function VideoDetectionPage() {
  const { addToast } = useApp();
  const [detecting, setDetecting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [model, setModel] = useState('YOLOv8-L');
  const [confThreshold, setConfThreshold] = useState(55);
  const [activeTab, setActiveTab] = useState<'log' | 'zones' | 'config'>('log');
  const [detections, setDetections] = useState<{ time: string; obj: string; conf: number; zone: string; id: number }[]>([]);
  const [stats, setStats] = useState({ fps: 0, latency: 0, totalObjects: 0, framesProcessed: 0 });
  const [objectCounts, setObjectCounts] = useState<Record<string, number>>({ Person: 0, Vehicle: 0, Animal: 0, Aircraft: 0, Vessel: 0 });
  const [zones] = useState([
    { name: 'Zone Alpha', type: 'Intrusion', status: 'active', objects: 3 },
    { name: 'Zone Bravo', type: 'Crowd', status: 'active', objects: 12 },
    { name: 'Zone Charlie', type: 'Perimeter', status: 'inactive', objects: 0 },
    { name: 'Zone Delta', type: 'Vehicle Gate', status: 'active', objects: 1 },
  ]);

  useEffect(() => {
    if (!detecting) return;
    const objectTypes = ['Person', 'Vehicle', 'Animal', 'Aircraft', 'Vessel'];
    const zoneNames = ['Zone Alpha', 'Zone Bravo', 'Zone Charlie', 'Zone Delta'];
    let frameCount = 0;
    const interval = setInterval(() => {
      frameCount++;
      const obj = objectTypes[Math.floor(Math.random() * objectTypes.length)];
      const conf = confThreshold + Math.floor(Math.random() * (100 - confThreshold));
      setDetections(prev => [{
        time: new Date().toLocaleTimeString('en-GB'),
        obj, conf,
        zone: zoneNames[Math.floor(Math.random() * zoneNames.length)],
        id: Date.now(),
      }, ...prev].slice(0, 50));
      setObjectCounts(prev => ({ ...prev, [obj]: (prev[obj] || 0) + 1 }));
      setStats({
        fps: 25 + Math.floor(Math.random() * 6),
        latency: 18 + Math.floor(Math.random() * 12),
        totalObjects: frameCount * 2 + Math.floor(Math.random() * 5),
        framesProcessed: frameCount,
      });
    }, 800);
    return () => clearInterval(interval);
  }, [detecting, confThreshold]);

  const handleStart = () => {
    setDetecting(true);
    setDetections([]);
    setStats({ fps: 0, latency: 0, totalObjects: 0, framesProcessed: 0 });
    setObjectCounts({ Person: 0, Vehicle: 0, Animal: 0, Aircraft: 0, Vessel: 0 });
    addToast({ type: 'info', title: 'Detection Started', message: `${model} pipeline active — confidence ≥ ${confThreshold}%` });
  };

  const handleStop = () => {
    setDetecting(false);
    addToast({ type: 'success', title: 'Detection Stopped', message: `${stats.framesProcessed} frames processed, ${stats.totalObjects} total detections.` });
  };

  const handleRecordToggle = () => {
    setRecording(!recording);
    addToast({ type: recording ? 'success' : 'info', title: recording ? 'Recording Saved' : 'Recording Started', message: recording ? 'Detection recording saved to storage.' : 'Recording detection overlay stream.' });
  };

  const objColors: Record<string, string> = { Person: 'var(--neon-cyan)', Vehicle: 'var(--neon-blue)', Animal: 'var(--neon-green)', Aircraft: 'var(--neon-purple)', Vessel: 'var(--neon-orange)' };

  return (
    <LicenseGate moduleCode="1.1b" moduleName="Digital Video Analytic & Object Detection">
      <div className="animate-fade-in">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Video size={22} /> Video Object Detection
              {detecting && <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'rgba(63,185,80,0.08)', color: 'var(--neon-green)', border: '1px solid rgba(63,185,80,0.15)', display: 'inline-flex', alignItems: 'center', gap: 4, animation: 'pulse 2s infinite' }}><Activity size={10} /> LIVE</span>}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Real-time AI detection — Multi-object tracking with MTI integration — CUDA GPU</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn ${recording ? 'btn-danger' : 'btn-secondary'}`} onClick={handleRecordToggle} style={{ gap: 6 }}>
              {recording ? <><Film size={14} style={{ animation: 'pulse 1s infinite' }} /> Stop Rec</> : <><Film size={14} /> Record</>}
            </button>
            {!detecting ? (
              <button className="btn btn-primary" onClick={handleStart} style={{ gap: 6 }}><Play size={14} /> Start Detection</button>
            ) : (
              <button className="btn btn-danger" onClick={handleStop} style={{ gap: 6 }}><Square size={14} /> Stop</button>
            )}
          </div>
        </div>

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { icon: <Activity size={18} />, label: 'FPS', value: detecting ? `${stats.fps}` : '—', color: 'var(--neon-green)' },
            { icon: <Timer size={18} />, label: 'LATENCY', value: detecting ? `${stats.latency}ms` : '—', color: 'var(--neon-cyan)' },
            { icon: <Eye size={18} />, label: 'OBJECTS/FRAME', value: detecting ? `${2 + Math.floor(Math.random() * 4)}` : '—', color: 'var(--neon-blue)' },
            { icon: <ScanSearch size={18} />, label: 'TOTAL DETECTIONS', value: detecting ? stats.totalObjects.toLocaleString() : '—', color: 'var(--neon-purple)' },
            { icon: <Cpu size={18} />, label: 'GPU', value: detecting ? `${72 + Math.floor(Math.random() * 18)}%` : '—', color: 'var(--neon-orange)' },
          ].map(s => (
            <GlassCard key={s.label} tilt={false} style={{ padding: '14px 16px' }} glow={detecting ? `${s.color}12` : undefined}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ color: s.color, opacity: 0.6 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>{s.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-code)', color: s.color, marginTop: 2 }}>{s.value}</div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16 }}>
          {/* Left: Video + Controls */}
          <div>
            <div className="video-container" style={{ marginBottom: 12 }}>
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #060d1f, #0d1528)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                {detecting && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 48%, rgba(88,166,255,0.04) 50%, transparent 52%)', animation: 'scanline 3s linear infinite' }} />}
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(88,166,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(88,166,255,0.02) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                {/* Detection bounding boxes mock */}
                {detecting && (
                  <>
                    {[
                      { x: '15%', y: '25%', w: 80, h: 140, label: 'Person', c: 'var(--neon-cyan)', cf: 94 },
                      { x: '55%', y: '40%', w: 120, h: 70, label: 'Vehicle', c: 'var(--neon-blue)', cf: 87 },
                      { x: '75%', y: '20%', w: 60, h: 100, label: 'Person', c: 'var(--neon-cyan)', cf: 91 },
                    ].map((box, i) => (
                      <div key={i} style={{
                        position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h,
                        border: `2px solid ${box.c}`, borderRadius: 4,
                        boxShadow: `0 0 8px ${box.c}44`, animation: 'fadeIn 0.3s ease',
                      }}>
                        <span style={{ position: 'absolute', top: -18, left: 0, fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 3, background: box.c, color: '#000', fontFamily: 'var(--font-code)', whiteSpace: 'nowrap' }}>{box.label} {box.cf}%</span>
                      </div>
                    ))}
                  </>
                )}
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', position: 'relative', zIndex: 1 }}>
                  <Video size={40} style={{ opacity: detecting ? 0.15 : 0.3, marginBottom: 8 }} />
                  <div style={{ fontSize: 12, opacity: detecting ? 0.3 : 0.6 }}>{detecting ? `${model} — Processing @ ${stats.fps} FPS` : 'RTSP://192.168.10.100:15004'}</div>
                </div>
              </div>
              {/* HUD overlay */}
              <div className="video-overlay">
                <div className="video-overlay-top">
                  <span>{model}</span>
                  <span>{recording && <span style={{ color: 'var(--danger-400)', animation: 'pulse 1s infinite', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Film size={10} /> REC</span>}</span>
                  <span>{new Date().toLocaleTimeString('en-GB')}</span>
                </div>
                <div className="video-overlay-bottom">
                  <span>CONF ≥ {confThreshold}%</span>
                  <span>OBJS: {detecting ? `${2 + Math.floor(Math.random() * 4)}` : '0'}</span>
                  <span>CUDA:0</span>
                </div>
              </div>
            </div>

            {/* Object Class Breakdown */}
            <GlassCard tilt={false}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}><BarChart3 size={15} /> Object Classification Breakdown</div>
              <div style={{ display: 'flex', gap: 12 }}>
                {Object.entries(objectCounts).map(([obj, count]) => (
                  <div key={obj} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'var(--font-code)', color: objColors[obj] || 'var(--text-primary)' }}>{count}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 2 }}>{obj}</div>
                    <div className="progress-bar" style={{ marginTop: 6, height: 3 }}>
                      <div className="progress-fill" style={{ width: `${Math.min(100, count * 3)}%`, background: objColors[obj] }} />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Right Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', padding: 3 }}>
              {([['log', 'Detection Log', <Activity size={13} key="l" />], ['zones', 'Detection Zones', <Target size={13} key="z" />], ['config', 'Model Config', <Cpu size={13} key="c" />]] as const).map(([key, label, icon]) => (
                <button key={key} onClick={() => setActiveTab(key)} className={`control-btn ${activeTab === key ? 'active' : ''}`} style={{ flex: 1, justifyContent: 'center', fontSize: 11, gap: 4, padding: '7px 8px' }}>{icon} {label}</button>
              ))}
            </div>

            {/* Tab: Detection Log */}
            {activeTab === 'log' && (
              <GlassCard tilt={false} style={{ flex: 1, maxHeight: 480, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Activity size={14} /> Live Detections</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{detections.length} entries</span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {detections.length > 0 ? detections.map((d, i) => (
                    <div key={d.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                      background: 'var(--bg-card-hover)', borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${i === 0 ? 'rgba(88,166,255,0.1)' : 'var(--border-subtle)'}`,
                      fontSize: 11, animation: i === 0 ? 'slideUp 0.25s ease' : undefined,
                    }}>
                      <span className="font-mono" style={{ color: 'var(--text-muted)', width: 52, fontSize: 10 }}>{d.time}</span>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: objColors[d.obj] || 'var(--text-muted)', flexShrink: 0, boxShadow: `0 0 6px ${objColors[d.obj]}55` }} />
                      <span style={{ fontWeight: 600, flex: 1 }}>{d.obj}</span>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{d.zone}</span>
                      <span style={{ fontWeight: 700, fontFamily: 'var(--font-code)', color: d.conf > 85 ? 'var(--neon-green)' : 'var(--neon-cyan)', width: 32, textAlign: 'right' }}>{d.conf}%</span>
                    </div>
                  )) : (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      <Activity size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                      <p style={{ fontSize: 12 }}>Start detection to see entries</p>
                    </div>
                  )}
                </div>
              </GlassCard>
            )}

            {/* Tab: Detection Zones */}
            {activeTab === 'zones' && (
              <GlassCard tilt={false} style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><Target size={14} /> Detection Zones</span>
                  <button className="btn btn-primary btn-sm" style={{ gap: 4 }} onClick={() => addToast({ type: 'info', title: 'Draw Zone', message: 'Click on the video feed to define zone vertices.' })}><Plus size={12} /> Add</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {zones.map(z => (
                    <div key={z.name} style={{
                      padding: '12px 14px', borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-card-hover)', border: '1px solid var(--border-subtle)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{z.name}</span>
                        <span className={`badge badge-${z.status === 'active' ? 'success' : 'neutral'}`}>{z.status}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                        <span>Type: <strong style={{ color: 'var(--text-secondary)' }}>{z.type}</strong></span>
                        <span>Objects: <strong style={{ color: 'var(--neon-cyan)' }}>{z.objects}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Zone heatmap placeholder */}
                <div style={{ marginTop: 14, padding: 20, borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Activity Heatmap</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gridTemplateRows: 'repeat(6, 1fr)', gap: 2, height: 100 }}>
                    {Array.from({ length: 48 }).map((_, i) => {
                      const intensity = Math.random();
                      return <div key={i} style={{
                        borderRadius: 2,
                        background: intensity > 0.7 ? 'rgba(239,68,68,0.5)' : intensity > 0.4 ? 'rgba(245,158,11,0.4)' : intensity > 0.15 ? 'rgba(88,166,255,0.2)' : 'rgba(255,255,255,0.03)',
                      }} />;
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-disabled)', marginTop: 4 }}>
                    <span>Low</span><span>Medium</span><span>High</span>
                  </div>
                </div>
              </GlassCard>
            )}

            {/* Tab: Model Config */}
            {activeTab === 'config' && (
              <GlassCard tilt={false} style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}><Cpu size={14} /> AI Model Configuration</div>
                <div className="form-group"><label className="form-label">Model Architecture</label><select className="form-select" value={model} onChange={e => setModel(e.target.value)}><option>YOLOv8-L</option><option>YOLOv8-X</option><option>YOLOv8-M</option><option>SSD MobileNet</option><option>Faster R-CNN</option><option>DETR</option></select></div>
                <div className="form-group"><label className="form-label">Confidence Threshold: {confThreshold}%</label><input type="range" min="20" max="95" value={confThreshold} onChange={e => setConfThreshold(+e.target.value)} style={{ width: '100%', accentColor: 'var(--neon-cyan)' }} /><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-disabled)' }}><span>20% (More detections)</span><span>95% (Higher precision)</span></div></div>
                <div className="form-group"><label className="form-label">NMS Threshold</label><input className="form-input font-mono" defaultValue="0.45" /></div>
                <div className="form-group"><label className="form-label">Max Detections / Frame</label><input className="form-input font-mono" defaultValue="100" /></div>
                <div className="form-group"><label className="form-label">GPU Device</label><select className="form-select"><option>CUDA:0 — RTX 4090 (24GB)</option><option>CUDA:1 — RTX 4080</option></select></div>
                <div className="form-group"><label className="form-label">Tracking Algorithm</label><select className="form-select"><option>ByteTrack (Recommended)</option><option>SORT</option><option>DeepSORT</option><option>BoT-SORT</option></select></div>
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  {['Person', 'Vehicle', 'Animal', 'Aircraft', 'Vessel'].map(cls => (
                    <label key={cls} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input type="checkbox" defaultChecked style={{ accentColor: objColors[cls] }} /> {cls}
                    </label>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </LicenseGate>
  );
}

/* ===== IMAGE ENHANCEMENT ===== */
export function ImageEnhancementPage() {
  const [filterMode, setFilterMode] = useState('CLAHE');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { addToast } = useApp();

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setSelectedImage(URL.createObjectURL(file));
      setEnhancedImage(null);
    }
  };

  const handleApplyEnhancement = async () => {
    if (!selectedFile) {
      addToast({ type: 'warning', title: 'No Image', message: 'Please upload an image first.' });
      return;
    }
    setEnhancing(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('filter', filterMode);

      const response = await fetch('http://127.0.0.1:8000/api/v1/enhance/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (data.image_url) {
          setEnhancedImage(data.image_url.startsWith('http') ? data.image_url : `http://127.0.0.1:8000${data.image_url.startsWith('/') ? '' : '/'}${data.image_url}`);
        }
      } else {
        const blob = await response.blob();
        setEnhancedImage(URL.createObjectURL(blob));
      }
      addToast({ type: 'success', title: 'Enhancement Applied', message: `${filterMode} filter applied successfully.` });
    } catch (error: any) {
      console.error(error);
      addToast({ type: 'error', title: 'Enhancement Failed', message: error.message || 'Failed to enhance image.' });
    } finally {
      setEnhancing(false);
    }
  };

  return (
    <LicenseGate moduleCode="1.2a" moduleName="Digital Imaging Analytic Enhancement">
      <div className="animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}><Sparkles size={22} /> Image Enhancement</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>CLAHE, LAP, sharpening, denoising, false color — per Epsilon Manual §5.11</p>
          </div>
          <span className="badge badge-success">1.2a <CheckCircle2 size={11} /></span>
        </div>
        <div className="grid-2" style={{ marginBottom: 16 }}>
          <GlassCard tilt={false}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Original</div>
            <div style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg, #0a0e1a, #0d1528)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13, overflow: 'hidden' }}>
              {selectedImage ? (
                <img src={selectedImage} alt="Original" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <ImageIcon size={32} style={{ opacity: 0.3 }} />
              )}
            </div>
          </GlassCard>
          <GlassCard tilt={false}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Enhanced</div>
            <div style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg, #0d1528, #142038)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neon-cyan)', fontSize: 13, border: '1px solid rgba(88,166,255,0.1)', overflow: 'hidden' }}>
              {enhancing ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Enhancing...</span>
                </div>
              ) : enhancedImage ? (
                <img src={enhancedImage} alt="Enhanced" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <Sparkles size={32} style={{ opacity: 0.5 }} />
              )}
            </div>
          </GlassCard>
        </div>
        <GlassCard tilt={false}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Sliders size={15} /> Enhancement Controls</div>
          <div className="grid-4">
            <div className="form-group"><label className="form-label">Filter</label><select className="form-select" value={filterMode} onChange={e => setFilterMode(e.target.value)}><option>CLAHE</option><option>LAP</option><option>None</option></select></div>
            <div className="form-group"><label className="form-label">Strength</label><input type="range" min="0" max="100" defaultValue="50" style={{ width: '100%', accentColor: 'var(--neon-cyan)' }} /></div>
            <div className="form-group"><label className="form-label">Blend %</label><input type="range" min="0" max="100" defaultValue="75" style={{ width: '100%', accentColor: 'var(--neon-blue)' }} /></div>
            <div className="form-group"><label className="form-label">Denoise</label><select className="form-select"><option>Off</option><option>Low</option><option>Medium</option><option>High</option></select></div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary" onClick={handleApplyEnhancement} disabled={enhancing} style={{ gap: 6 }}><Sparkles size={14} /> {enhancing ? 'Processing...' : 'Apply Enhancement'}</button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
            <button className="btn btn-secondary" onClick={() => fileRef.current?.click()} style={{ gap: 6 }}><Upload size={14} /> Upload Foto</button>
            <button className="btn btn-secondary" onClick={() => addToast({ type: 'success', title: 'Image Saved', message: 'Enhanced image saved to storage.' })} style={{ gap: 6 }}><Download size={14} /> Save Result</button>
          </div>
        </GlassCard>
      </div>
    </LicenseGate>
  );
}

/* ===== VIDEO ENHANCEMENT ===== */
export function VideoEnhancementPage() {
  const [denoise, setDenoise] = useState(20);
  const [contrast, setContrast] = useState(15);
  const [sharpness, setSharpness] = useState(20);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [enhancedVideo, setEnhancedVideo] = useState<string | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { addToast } = useApp();

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setSelectedVideo(URL.createObjectURL(file));

      setEnhancedVideo(null);
    }
  };

  const handleApplyEnhancement = async () => {
    if (!selectedFile) {
      addToast({ type: 'warning', title: 'No Video', message: 'Please upload a video first.' });
      return;
    }
    setEnhancing(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('denoise', denoise.toString());
      formData.append('contrast', contrast.toString());
      formData.append('sharpness', sharpness.toString());

      const response = await fetch('http://127.0.0.1:8000/api/v1/enhance/video?mode=fast', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        // const video = await fetch(
        //   data.output_path
        // );
        // const blob = await video.blob();
        // const url = URL.createObjectURL(blob);
        setEnhancedVideo(data.output_path);
        // console.log(video.status);
        // console.log(video.headers.get("content-type"));
        // console.log(video.headers.get("content-length"));

        // console.log(data)
        // if (data.output_path) {
        //   setEnhancedVideo(data.output_path.startsWith('http') ? data.output_path : `http://127.0.0.1:8000${data.output_path.startsWith('/') ? '' : '/'}${data.output_path}`);
        // } else if (data.output_path) {
        //   setEnhancedVideo(data.output_path.startsWith('http') ? data.output_path : `http://127.0.0.1:8000${data.output_path.startsWith('/') ? '' : '/'}${data.output_path}`);
        // }
      } else {
        const blob = await response.blob();
        setEnhancedVideo(URL.createObjectURL(blob));
      }
      addToast({ type: 'success', title: 'Enhancement Applied', message: `Enhancement applied successfully.` });
    } catch (error: any) {
      console.error(error);
      addToast({ type: 'error', title: 'Enhancement Failed', message: error.message || 'Failed to enhance video.' });
    } finally {
      setEnhancing(false);
    }
  };

  return (
    <LicenseGate moduleCode="1.2b" moduleName="Digital Video Analytic Enhancement">
      <div className="animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}><Film size={22} /> Video Enhancement</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Fast processing mode — Custom denoise, contrast & sharpness</p>
          </div>
          <span className="badge badge-success">1.2b <CheckCircle2 size={11} /></span>
        </div>
        <div className="grid-2" style={{ marginBottom: 16 }}>
          <GlassCard tilt={false}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Original</div>
            <div style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg, #0a0e1a, #0d1528)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13, overflow: 'hidden' }}>
              {selectedVideo ? (
                <video src={selectedVideo} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <Film size={32} style={{ opacity: 0.3 }} />
              )}
            </div>
          </GlassCard>
          <GlassCard tilt={false}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Enhanced</div>
            <div style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg, #0d1528, #142038)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neon-cyan)', fontSize: 13, border: '1px solid rgba(88,166,255,0.1)', overflow: 'hidden' }}>
              {enhancing ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Enhancing Video...</span>
                </div>
              ) : enhancedVideo ? (
                <video src={enhancedVideo} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <Sparkles size={32} style={{ opacity: 0.5 }} />
              )}
            </div>
          </GlassCard>
        </div>
        <GlassCard tilt={false}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Sliders size={15} /> Enhancement Controls</div>
          <div className="grid-3">
            <div className="form-group"><label className="form-label">Denoise</label><input type="range" min="0" max="100" value={denoise} onChange={e => setDenoise(+e.target.value)} style={{ width: '100%', accentColor: 'var(--neon-blue)' }} /></div>
            <div className="form-group"><label className="form-label">Contrast</label><input type="range" min="0" max="100" value={contrast} onChange={e => setContrast(+e.target.value)} style={{ width: '100%', accentColor: 'var(--neon-cyan)' }} /></div>
            <div className="form-group"><label className="form-label">Sharpness</label><input type="range" min="0" max="100" value={sharpness} onChange={e => setSharpness(+e.target.value)} style={{ width: '100%', accentColor: 'var(--neon-purple)' }} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary" onClick={handleApplyEnhancement} disabled={enhancing} style={{ gap: 6 }}><Sparkles size={14} /> {enhancing ? 'Processing...' : 'Apply Enhancement'}</button>
            <input ref={fileRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleUpload} />
            <button className="btn btn-secondary" onClick={() => fileRef.current?.click()} style={{ gap: 6 }}><Upload size={14} /> Upload Video</button>
            <button className="btn btn-secondary" onClick={() => addToast({ type: 'success', title: 'Video Saved', message: 'Enhanced video saved to storage.' })} style={{ gap: 6 }}><Download size={14} /> Save Result</button>
          </div>
        </GlassCard>
      </div>
    </LicenseGate>
  );
}

/* ===== TETHER API ===== */
export function TetherAPIPage() {
  const { addToast } = useApp();
  const [apiKeys, setApiKeys] = useState([
    { name: 'Field Gateway', key: 'sk_live_****abc1', rate: '100/min' },
  ]);

  const generateKey = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const suffix = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setApiKeys(prev => [...prev, { name: `Key #${prev.length + 1}`, key: `sk_live_****${suffix}`, rate: '50/min' }]);
    addToast({ type: 'success', title: 'API Key Generated', message: 'New API key has been created and is ready for use.' });
  };

  return (
    <LicenseGate moduleCode="1.2c" moduleName="Interface Integrasi (API) Main Tether Cable">
      <div className="animate-fade-in">
        <div style={{ marginBottom: 24 }}><h1 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}><Cable size={22} /> Tether Cable API</h1><p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>REST API interface for tether cable integration</p></div>
        <div className="grid-2">
          <GlassCard>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Signal size={15} /> API Status</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
              {[{ l: 'VOLTAGE', v: '230V', c: 'var(--neon-green)', i: <Zap size={12} /> }, { l: 'CURRENT', v: '1.8A', c: 'var(--neon-cyan)', i: <Activity size={12} /> }, { l: 'EOP SNR', v: '42dB', c: 'var(--neon-blue)', i: <Signal size={12} /> }, { l: 'DATA RATE', v: '85Mbps', c: 'var(--neon-purple)', i: <Database size={12} /> }].map(t => (
                <div key={t.l} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>{t.i} {t.l}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-code)', color: t.c, marginTop: 4 }}>{t.v}</div>
                </div>
              ))}
            </div>
          </GlassCard>
          <GlassCard>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><Shield size={15} /> API Keys</div>
              <button className="btn btn-primary btn-sm" onClick={generateKey} style={{ gap: 4 }}><Plus size={13} /> Generate</button>
            </div>
            <div className="table-container">
              <table><thead><tr><th>Name</th><th>Key</th><th>Rate</th></tr></thead>
                <tbody>{apiKeys.map((k, i) => (
                  <tr key={i}><td style={{ fontWeight: 600 }}>{k.name}</td><td className="font-mono" style={{ fontSize: 11 }}>{k.key}</td><td>{k.rate}</td></tr>
                ))}</tbody></table>
            </div>
          </GlassCard>
        </div>
      </div>
    </LicenseGate>
  );
}

/* ===== TETHER MONITOR ===== */
export function TetherMonitorPage() {
  const { addToast } = useApp();
  const [activeTab, setActiveTab] = useState<'live' | 'diagnostics' | 'history'>('live');
  const [testRunning, setTestRunning] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{ test: string; result: string; status: 'pass' | 'warn' | 'fail'; time: string }[]>([
    { test: 'Continuity Check', result: 'All conductors OK', status: 'pass', time: '15:20:00' },
    { test: 'Insulation Resistance', result: '125 MΩ (>100 MΩ)', status: 'pass', time: '15:18:30' },
    { test: 'EOP Signal Quality', result: '42 dB SNR', status: 'pass', time: '15:16:15' },
    { test: 'Power Load Test', result: '414W (230V × 1.8A)', status: 'pass', time: '15:14:00' },
  ]);

  const runDiagnostic = (testName: string) => {
    setTestRunning(testName);
    setTimeout(() => {
      const passed = Math.random() > 0.15;
      setTestResults(prev => [{
        test: testName,
        result: passed ? `${testName} — Passed` : `${testName} — Warning`,
        status: passed ? 'pass' : 'warn',
        time: new Date().toLocaleTimeString('en-GB'),
      }, ...prev]);
      setTestRunning(null);
      addToast({ type: passed ? 'success' : 'warning', title: `${testName} Complete`, message: passed ? 'Test passed — all parameters within spec.' : 'Warning detected — review results.' });
    }, 2500);
  };

  const cableSpecs = [
    { param: 'Type', value: 'Kevlar-reinforced composite', unit: '' },
    { param: 'Length', value: '500', unit: 'm' },
    { param: 'Deployed', value: '450', unit: 'm' },
    { param: 'Power Rating', value: '230VAC / 3A max', unit: '' },
    { param: 'Data Channel', value: 'EOP Single-mode fiber', unit: '' },
    { param: 'Breaking Strength', value: '8,500', unit: 'N' },
    { param: 'Current Load', value: '1,240', unit: 'N (14.6%)' },
    { param: 'Operating Temp', value: '-20 to +55', unit: '°C' },
  ];

  return (
    <LicenseGate moduleCode="1.2d" moduleName="Monitoring Checking Capability Tether Cable">
      <div className="animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Cable size={22} /> Tether Cable Monitor
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'rgba(63,185,80,0.08)', color: 'var(--neon-green)', border: '1px solid rgba(63,185,80,0.15)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={10} /> HEALTHY</span>
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Main tether cable health monitoring — 230VAC, Kevlar reinforced, EOP fiber</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => addToast({ type: 'info', title: 'Report', message: 'Cable health report generating...' })} style={{ gap: 6 }}><Download size={14} /> Export Report</button>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { icon: <Zap size={18} />, label: 'VOLTAGE', value: '230V', sub: 'AC nominal', color: 'var(--neon-green)' },
            { icon: <Activity size={18} />, label: 'CURRENT', value: '1.8A', sub: '414W load', color: 'var(--neon-cyan)' },
            { icon: <Signal size={18} />, label: 'EOP SNR', value: '42 dB', sub: 'Excellent', color: 'var(--neon-blue)' },
            { icon: <Shield size={18} />, label: 'INSULATION', value: '125 MΩ', sub: '>100 MΩ spec', color: 'var(--neon-purple)' },
            { icon: <Gauge size={18} />, label: 'TENSION', value: '1,240N', sub: '14.6% MBS', color: 'var(--neon-orange)' },
            { icon: <Cable size={18} />, label: 'DEPLOYED', value: '450m', sub: 'of 500m total', color: 'var(--text-secondary)' },
          ].map(s => (
            <GlassCard key={s.label} tilt={false} style={{ padding: '14px 16px' }} glow={`${s.color}10`}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ color: s.color, opacity: 0.6, marginTop: 2 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>{s.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-code)', color: s.color, marginTop: 2 }}>{s.value}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>{s.sub}</div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', padding: 3, marginBottom: 16 }}>
          {([['live', 'Live Monitoring', <Activity size={13} key="l" />], ['diagnostics', 'Diagnostics & Testing', <FlaskConical size={13} key="d" />], ['history', 'History & Specs', <Database size={13} key="h" />]] as const).map(([key, label, icon]) => (
            <button key={key} onClick={() => setActiveTab(key)} className={`control-btn ${activeTab === key ? 'active' : ''}`} style={{ flex: 1, justifyContent: 'center', fontSize: 11, gap: 4, padding: '8px' }}>{icon} {label}</button>
          ))}
        </div>

        {/* TAB: Live */}
        {activeTab === 'live' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <GlassCard tilt={false}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Zap size={15} /> Power Channel — 230VAC</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                {[
                  { l: 'VOLTAGE', v: '229.8V', c: 'var(--neon-green)' },
                  { l: 'CURRENT', v: '1.80A', c: 'var(--neon-cyan)' },
                  { l: 'POWER', v: '413.6W', c: 'var(--neon-blue)' },
                  { l: 'FREQUENCY', v: '50.01Hz', c: 'var(--text-secondary)' },
                  { l: 'PF', v: '0.98', c: 'var(--text-secondary)' },
                  { l: 'THD', v: '2.1%', c: 'var(--neon-green)' },
                ].map(m => (
                  <div key={m.l} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>{m.l}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-code)', color: m.c, marginTop: 3 }}>{m.v}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Power Trend (24h)</div>
              <MiniBarChart data={[410, 412, 415, 413, 411, 414, 416, 413, 412, 415, 414, 413, 414, 415, 413, 412, 414, 413, 414, 415, 413, 414, 414, 414]} color="var(--neon-green)" height={80} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-disabled)', marginTop: 4 }}>
                <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>Now</span>
              </div>
            </GlassCard>
            <GlassCard tilt={false}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Signal size={15} /> EOP Fiber Channel</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                {[
                  { l: 'SNR', v: '42.1 dB', c: 'var(--neon-cyan)' },
                  { l: 'BER', v: '1e-12', c: 'var(--neon-green)' },
                  { l: 'DATA RATE', v: '85Mbps', c: 'var(--neon-blue)' },
                  { l: 'TX POWER', v: '-3.2 dBm', c: 'var(--text-secondary)' },
                  { l: 'RX POWER', v: '-8.7 dBm', c: 'var(--text-secondary)' },
                  { l: 'LOSS', v: '5.5 dB', c: 'var(--neon-green)' },
                ].map(m => (
                  <div key={m.l} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>{m.l}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-code)', color: m.c, marginTop: 3 }}>{m.v}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Signal Quality Trend (24h)</div>
              <MiniBarChart data={[40, 41, 42, 41, 43, 42, 41, 42, 43, 42, 41, 42, 42, 41, 43, 42, 42, 41, 42, 43, 42, 42, 41, 42]} color="var(--neon-cyan)" height={80} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-disabled)', marginTop: 4 }}>
                <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>Now</span>
              </div>
            </GlassCard>
            <GlassCard tilt={false}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Gauge size={15} /> Mechanical Load</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {[
                  { l: 'TENSION', v: '1,240 N', c: 'var(--neon-orange)', pct: 14.6 },
                  { l: 'MBS LIMIT', v: '8,500 N', c: 'var(--text-muted)', pct: 100 },
                  { l: 'SAFETY FACTOR', v: '6.85x', c: 'var(--neon-green)', pct: 85 },
                  { l: 'DEPLOY LENGTH', v: '450 / 500m', c: 'var(--neon-cyan)', pct: 90 },
                ].map(m => (
                  <div key={m.l} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>{m.l}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-code)', color: m.c, marginTop: 3 }}>{m.v}</div>
                    <div className="progress-bar" style={{ marginTop: 6, height: 3 }}>
                      <div className="progress-fill" style={{ width: `${m.pct}%`, background: m.c }} />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
            <GlassCard tilt={false}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Shield size={15} /> Insulation & Safety</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {[
                  { l: 'INSULATION', v: '125 MΩ', c: 'var(--neon-green)', spec: '>100 MΩ' },
                  { l: 'CONTINUITY', v: 'PASS', c: 'var(--neon-green)', spec: '<1 Ω' },
                  { l: 'EARTH LEAKAGE', v: '0.3 mA', c: 'var(--neon-green)', spec: '<5 mA' },
                  { l: 'TEMP (JACKET)', v: '32°C', c: 'var(--text-secondary)', spec: '<55°C' },
                ].map(m => (
                  <div key={m.l} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>{m.l}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-code)', color: m.c, marginTop: 3 }}>{m.v}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-disabled)', marginTop: 2 }}>Spec: {m.spec}</div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        )}

        {/* TAB: Diagnostics */}
        {activeTab === 'diagnostics' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <GlassCard tilt={false}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><FlaskConical size={15} /> Run Diagnostic Tests</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {['Continuity Check', 'Insulation Resistance', 'EOP Signal Test', 'Power Load Test', 'Fiber Loopback', 'Full Cable Assessment'].map(test => (
                  <div key={test} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card-hover)', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{test}</span>
                    <button className="btn btn-primary btn-sm" onClick={() => runDiagnostic(test)} disabled={testRunning !== null} style={{ gap: 4, minWidth: 80 }}>
                      {testRunning === test ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Running</> : <><Play size={12} /> Run</>}
                    </button>
                  </div>
                ))}
              </div>
            </GlassCard>
            <GlassCard tilt={false}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><ClipboardCheck size={15} /> Test Results Log</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 400, overflowY: 'auto' }}>
                {testResults.map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card-hover)', border: '1px solid var(--border-subtle)', animation: i === 0 ? 'slideUp 0.3s ease' : undefined }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.status === 'pass' ? 'var(--neon-green)' : t.status === 'warn' ? 'var(--warning-400)' : 'var(--danger-400)', boxShadow: `0 0 6px ${t.status === 'pass' ? 'rgba(63,185,80,0.4)' : 'rgba(245,158,11,0.4)'}`, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{t.test}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{t.result}</div>
                    </div>
                    <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.time}</span>
                    <span className={`badge badge-${t.status === 'pass' ? 'success' : t.status === 'warn' ? 'warning' : 'danger'}`} style={{ fontSize: 10 }}>{t.status.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        )}

        {/* TAB: History & Specs */}
        {activeTab === 'history' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <GlassCard tilt={false}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Database size={15} /> Cable Specifications</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {cableSpecs.map(s => (
                  <div key={s.param} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.1)', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.param}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-code)', color: 'var(--text-primary)' }}>{s.value}{s.unit && ` ${s.unit}`}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
            <GlassCard tilt={false}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><BarChart3 size={15} /> Health Score Trend (7 days)</div>
              <MiniBarChart data={[92, 94, 93, 95, 94, 96, 97, 95, 93, 94, 96, 95, 97, 96, 95, 94, 96, 97, 95, 96, 97, 96, 95, 97, 96, 97, 96, 97]} color="var(--neon-cyan)" height={140} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-disabled)', marginTop: 6 }}><span>7 days ago</span><span>Today</span></div>
              <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(63,185,80,0.04)', border: '1px solid rgba(63,185,80,0.1)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--neon-green)', marginBottom: 4 }}>Overall Health Score: 97/100</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Cable in excellent condition. Next scheduled inspection: 2026-07-15</div>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </LicenseGate>
  );
}

/* ===== REPORTING ===== */
export function ReportingPage() {
  const { addToast } = useApp();
  const [generating, setGenerating] = useState<string | null>(null);

  const handleGenerate = (type: string) => {
    setGenerating(type);
    setTimeout(() => {
      setGenerating(null);
      addToast({ type: 'success', title: 'Report Generated', message: `${type} report is ready for download.` });
    }, 2000);
  };

  return (
    <LicenseGate moduleCode="1.3a" moduleName="Digital Reporting Tethered Balloon">
      <div className="animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div><h1 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}><FileText size={22} /> Digital Reporting</h1><p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Generate watermarked PDF/Excel reports</p></div>
          <button className="btn btn-primary" onClick={() => handleGenerate('Custom')} disabled={generating !== null} style={{ gap: 6 }}>
            {generating ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</> : <><FileText size={14} /> Generate Report</>}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { name: 'Daily Operations', icon: <Calendar size={20} /> },
            { name: 'Weekly Summary', icon: <BarChart3 size={20} /> },
            { name: 'Incident Report', icon: <AlertTriangle size={20} /> },
            { name: 'Flight Report', icon: <Plane size={20} /> },
            { name: 'Crowd Analysis', icon: <Users size={20} /> },
            { name: 'Custom Report', icon: <FileSpreadsheet size={20} /> },
          ].map(t => (
            <GlassCard key={t.name} glow="rgba(68,138,255,0.04)" onClick={() => handleGenerate(t.name)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ color: 'var(--neon-blue)', opacity: 0.7 }}>{t.icon}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{t.name}</div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Generate with watermark</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
        <GlassCard tilt={false}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={15} /> Recent Reports</div>
          </div>
          <div className="table-container">
            <table><thead><tr><th>Title</th><th>Type</th><th>Format</th><th>Generated</th><th>Action</th></tr></thead>
              <tbody>
                <tr><td style={{ fontWeight: 600 }}>Daily Ops — 2026-07-08</td><td><span className="badge badge-info">Daily</span></td><td>PDF</td><td className="font-mono text-xs">2026-07-08 18:00</td><td><button className="btn btn-ghost btn-sm" onClick={() => addToast({ type: 'info', title: 'Download Started', message: 'Daily Ops report downloading...' })} style={{ gap: 4 }}><Download size={13} /> Download</button></td></tr>
                <tr><td style={{ fontWeight: 600 }}>Weekly Summary W27</td><td><span className="badge badge-neutral">Weekly</span></td><td>Excel</td><td className="font-mono text-xs">2026-07-07 08:00</td><td><button className="btn btn-ghost btn-sm" onClick={() => addToast({ type: 'info', title: 'Download Started', message: 'Weekly Summary downloading...' })} style={{ gap: 4 }}><Download size={13} /> Download</button></td></tr>
              </tbody></table>
          </div>
        </GlassCard>
      </div>
    </LicenseGate>
  );
}

/* ===== GEO VISUALIZATION ===== */
export function GeoVisualizationPage() {
  const { addToast } = useApp();
  return (
    <LicenseGate moduleCode="1.3b" moduleName="Digital Visualisation Information GeoInt">
      <div className="animate-fade-in">
        <div style={{ marginBottom: 24 }}><h1 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}><Globe size={22} /> GEO Visualization</h1><p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Moving map overlay, target bank, FOV cone</p></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
          <div>
            <div className="map-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0a0e1a, #111d33)', position: 'relative', overflow: 'hidden' }}>
              {/* Grid pattern */}
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(88,166,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(88,166,255,0.03) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', position: 'relative', zIndex: 1 }}>
                <Globe size={48} style={{ color: 'var(--neon-cyan)', opacity: 0.3, marginBottom: 8 }} />
                <div style={{ fontSize: 13 }}>Leaflet + OpenStreetMap</div>
                <div style={{ fontSize: 11, marginTop: 4, fontFamily: 'var(--font-code)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={11} /> Camera</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Target size={11} /> Target</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Navigation size={11} /> FOV</span>
                </div>
              </div>
            </div>
            <GlassCard tilt={false} style={{ marginTop: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {[{ l: 'CAM LAT', v: '-6.2088' }, { l: 'CAM LON', v: '106.845' }, { l: 'RANGE', v: '1250m' }, { l: 'TGT LAT', v: '-6.1951' }, { l: 'TGT LON', v: '106.832' }, { l: 'ELEV', v: '42m' }].map(t => (
                  <div key={t.l} style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.2)' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>{t.l}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-code)', color: 'var(--neon-cyan)', marginTop: 2 }}>{t.v}</div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <GlassCard>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><Target size={15} /> Target Bank</div>
                <button className="btn btn-primary btn-sm" style={{ gap: 4 }} onClick={() => addToast({ type: 'info', title: 'Add Target', message: 'Click on the map to set target position.' })}><Plus size={13} /> Add</button>
              </div>
              {['Alpha Gate', 'Main Square', 'Bridge North', 'Checkpoint B'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-card-hover)', borderRadius: 'var(--radius-sm)', marginBottom: 4, border: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={12} /> {t}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => addToast({ type: 'info', title: 'Navigating', message: `Slewing gimbal to ${t}...` })} style={{ fontSize: 10 }}>Go</button>
                </div>
              ))}
            </GlassCard>
            <GlassCard>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}><Layers size={15} /> Raster / DEM</div>
              <button className="btn btn-secondary btn-sm w-full mb-8" onClick={() => addToast({ type: 'info', title: 'Upload', message: 'Select a GeoTIFF raster file.' })} style={{ gap: 4 }}><Upload size={13} /> Upload .TIF</button>
              <button className="btn btn-secondary btn-sm w-full" onClick={() => addToast({ type: 'info', title: 'Upload', message: 'Select an SRTM height file.' })} style={{ gap: 4 }}><Upload size={13} /> Upload .HGT (SRTM)</button>
            </GlassCard>
          </div>
        </div>
      </div>
    </LicenseGate>
  );
}

/* ===== ALERTS ===== */
export function AlertsPage() {
  const { addToast } = useApp();
  const [alerts, setAlerts] = useState([
    { id: 1, time: '15:32', title: 'Wind gust > 30 km/h', severity: 'warning', type: 'Weather', status: 'open' },
    { id: 2, time: '14:10', title: 'Crowd > 500 Zone A', severity: 'info', type: 'Threshold', status: 'acked' },
    { id: 3, time: '12:05', title: 'Geofence breach NW', severity: 'critical', type: 'Geofence', status: 'resolved' },
  ]);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [ruleForm, setRuleForm] = useState({ name: '', type: 'threshold', condition: '', severity: 'warning' });

  const handleAck = (id: number) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'acked' } : a));
    addToast({ type: 'success', title: 'Alert Acknowledged' });
  };

  const handleCreateRule = () => {
    if (!ruleForm.name) return;
    addToast({ type: 'success', title: 'Rule Created', message: `Alert rule "${ruleForm.name}" has been created.` });
    setShowRuleModal(false);
    setRuleForm({ name: '', type: 'threshold', condition: '', severity: 'warning' });
  };

  const counts = { critical: alerts.filter(a => a.severity === 'critical' && a.status === 'open').length, warning: alerts.filter(a => a.severity === 'warning' && a.status === 'open').length, info: alerts.filter(a => a.severity === 'info').length, acked: alerts.filter(a => a.status === 'acked' || a.status === 'resolved').length };

  return (
    <LicenseGate moduleCode="1.3c" moduleName="Digital Smart Notification Alert">
      <div className="animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div><h1 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}><BellRing size={22} /> Smart Alerts</h1><p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Geofence, threshold, intrusion detection alerts</p></div>
          <button className="btn btn-primary" onClick={() => setShowRuleModal(true)} style={{ gap: 6 }}><Plus size={14} /> Create Rule</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Critical', count: counts.critical, color: 'var(--danger-400)', icon: <Shield size={18} /> },
            { label: 'Warning', count: counts.warning, color: 'var(--warning-400)', icon: <AlertTriangle size={18} /> },
            { label: 'Info', count: counts.info, color: 'var(--info-400)', icon: <Bell size={18} /> },
            { label: 'Resolved', count: counts.acked, color: 'var(--success-400)', icon: <CheckCircle2 size={18} /> },
          ].map(s => (
            <GlassCard key={s.label} glow={`${s.color}12`}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: s.color, opacity: 0.6, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: s.color }}>{s.count}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
              </div>
            </GlassCard>
          ))}
        </div>
        <GlassCard tilt={false}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Activity size={15} /> Alert History</div>
          <div className="table-container">
            <table><thead><tr><th>Time</th><th>Title</th><th>Severity</th><th>Type</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {alerts.map(a => (
                  <tr key={a.id}>
                    <td className="font-mono text-xs">{a.time}</td>
                    <td>{a.title}</td>
                    <td><span className={`badge badge-${a.severity === 'critical' ? 'danger' : a.severity}`}>{a.severity}</span></td>
                    <td>{a.type}</td>
                    <td><span className={`badge badge-${a.status === 'open' ? 'danger' : 'success'}`}>{a.status === 'open' ? 'Open' : a.status === 'acked' ? 'Acked' : 'Resolved'}</span></td>
                    <td>{a.status === 'open' ? <button className="btn btn-ghost btn-sm" onClick={() => handleAck(a.id)} style={{ gap: 4 }}><Check size={13} /> Ack</button> : '—'}</td>
                  </tr>
                ))}
              </tbody></table>
          </div>
        </GlassCard>

        {showRuleModal && (
          <div className="modal-backdrop" onClick={() => setShowRuleModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><BellRing size={18} /> Create Alert Rule</h3>
                <button className="btn btn-ghost" onClick={() => setShowRuleModal(false)} style={{ padding: 4 }}><X size={18} /></button>
              </div>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Rule Name</label><input className="form-input" placeholder="e.g. Wind Speed Alert" value={ruleForm.name} onChange={e => setRuleForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Type</label><select className="form-select" value={ruleForm.type} onChange={e => setRuleForm(p => ({ ...p, type: e.target.value }))}><option value="threshold">Threshold</option><option value="geofence">Geofence</option><option value="intrusion">Intrusion</option><option value="weather">Weather</option></select></div>
                <div className="form-group"><label className="form-label">Condition</label><input className="form-input" placeholder="e.g. wind_speed > 35" value={ruleForm.condition} onChange={e => setRuleForm(p => ({ ...p, condition: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Severity</label><select className="form-select" value={ruleForm.severity} onChange={e => setRuleForm(p => ({ ...p, severity: e.target.value }))}><option value="info">Info</option><option value="warning">Warning</option><option value="critical">Critical</option></select></div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowRuleModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleCreateRule} disabled={!ruleForm.name}>Create Rule</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </LicenseGate>
  );
}

/* ===== FLIGHT INFO ===== */
export function FlightInfoPage() {
  const { addToast } = useApp();
  const [checklist, setChecklist] = useState([
    { item: 'Helium ≥ 150 bar', checked: true }, { item: 'Battery ≥ 24V', checked: true },
    { item: 'Tether OK', checked: true }, { item: 'GPS lock', checked: true },
    { item: 'Wind < 35 km/h', checked: true }, { item: 'Isolation passed', checked: true },
    { item: 'Payload connected', checked: false }, { item: 'EOP verified', checked: false },
  ]);
  const checkedCount = checklist.filter(c => c.checked).length;
  const progress = (checkedCount / checklist.length) * 100;

  return (
    <LicenseGate moduleCode="1.3d" moduleName="Information Flight Balloon Intelligent App">
      <div className="animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div><h1 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}><Plane size={22} /> Flight Information</h1><p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Mission planning, pre-flight checklist, flight log</p></div>
          <button className="btn btn-primary" onClick={() => addToast({ type: 'info', title: 'New Mission', message: 'Mission creation wizard started.' })} style={{ gap: 6 }}><Plus size={14} /> New Mission</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { icon: <Plane size={24} />, label: 'Active Mission', value: '#23', sub: 'Block: 4h 30m', color: 'var(--neon-green)' },
            { icon: <BarChart3 size={24} />, label: 'Total Missions', value: '156', sub: 'This year', color: 'var(--neon-cyan)' },
            { icon: <Clock size={24} />, label: 'Flight Hours', value: '892h', sub: 'Total accumulated', color: 'var(--neon-blue)' },
          ].map(s => (
            <GlassCard key={s.label} glow={`${s.color}12`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ color: s.color, opacity: 0.7 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.sub}</div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
        <div className="grid-2">
          <GlassCard>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Current Mission — #23</div>
            {[{ l: 'Status', v: 'ACTIVE', c: 'var(--neon-green)' }, { l: 'Balloon', v: 'SkyStar 180' }, { l: 'Payload', v: 'Epsilon 140Z G2' }, { l: 'Altitude', v: '450m AGL' }, { l: 'Team Lead', v: 'Cpt. Ari Wibowo' }, { l: 'Start', v: '2026-07-09 08:00' }, { l: 'Est. End', v: '2026-07-09 12:30' }].map(item => (
              <div key={item.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(0,0,0,0.1)', borderRadius: 'var(--radius-sm)', marginBottom: 4, border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.l}</span>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-code)', color: item.c || 'var(--text-primary)' }}>{item.v}</span>
              </div>
            ))}
          </GlassCard>
          <GlassCard>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><ClipboardCheck size={15} /> Pre-Flight Checklist</div>
              <span style={{ fontSize: 11, color: progress === 100 ? 'var(--neon-green)' : 'var(--text-muted)', fontWeight: 600 }}>{checkedCount}/{checklist.length}</span>
            </div>
            <div className="progress-bar" style={{ marginBottom: 16, height: 4 }}>
              <div className="progress-fill" style={{ width: `${progress}%`, background: progress === 100 ? 'var(--neon-green)' : undefined }} />
            </div>
            {checklist.map((item, i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 0' }}>
                <input type="checkbox" checked={item.checked} onChange={() => {
                  setChecklist(prev => prev.map((c, j) => j === i ? { ...c, checked: !c.checked } : c));
                }} style={{ accentColor: 'var(--neon-cyan)' }} />
                <span style={{ textDecoration: item.checked ? 'line-through' : 'none', opacity: item.checked ? 0.6 : 1 }}>{item.item}</span>
              </label>
            ))}
          </GlassCard>
        </div>
      </div>
    </LicenseGate>
  );
}

/* ===== MOORING MONITOR ===== */
export function MooringMonitorPage() {
  const { addToast } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'subsystems' | 'maintenance'>('overview');
  const [alarmLog] = useState([
    { time: '15:32', msg: 'Wind gust 28 km/h (threshold: 25)', severity: 'warning' },
    { time: '12:10', msg: 'Inverter #2 switched to standby', severity: 'info' },
    { time: '08:45', msg: 'Daily self-test completed — all pass', severity: 'success' },
    { time: '06:00', msg: 'Helium pressure drop 2 bar/hr (normal)', severity: 'info' },
  ]);
  const [maintenanceLog] = useState([
    { date: '2026-07-08', task: 'Winch cable lubrication', tech: 'Rudi', status: 'done' },
    { date: '2026-07-05', task: 'Helium regulator replacement', tech: 'Budi', status: 'done' },
    { date: '2026-07-01', task: 'Monthly full inspection', tech: 'Rudi', status: 'done' },
    { date: '2026-07-15', task: 'Inverter #2 service', tech: 'Rudi', status: 'scheduled' },
    { date: '2026-07-20', task: 'Annual cable replacement', tech: 'Team', status: 'scheduled' },
  ]);

  return (
    <LicenseGate moduleCode="1.3e" moduleName="Monitoring Avibility Mooring App System">
      <div className="animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Anchor size={22} /> Mooring System Monitor
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'rgba(63,185,80,0.08)', color: 'var(--neon-green)', border: '1px solid rgba(63,185,80,0.15)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={10} /> ALL NOMINAL</span>
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>SkyStar 180 mooring platform — real-time subsystem monitoring & maintenance</p>
          </div>
          <button className="btn btn-secondary" onClick={() => addToast({ type: 'info', title: 'Export', message: 'Mooring system report generating...' })} style={{ gap: 6 }}><Download size={14} /> Export</button>
        </div>

        {/* Primary Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { icon: <Wind size={20} />, label: 'WIND', value: '12 km/h', sub: 'NW 315° — Gust: 18', color: 'var(--neon-cyan)', pct: 34 },
            { icon: <ThermometerSun size={20} />, label: 'HELIUM', value: '165 bar', sub: '92% capacity — ΔP: -0.3/hr', color: 'var(--neon-blue)', pct: 92 },
            { icon: <Battery size={20} />, label: 'POWER', value: '24.2V', sub: '87% — Est: 14h remaining', color: 'var(--neon-green)', pct: 87 },
            { icon: <Gauge size={20} />, label: 'TENSION', value: '1,240 N', sub: '14.6% MBS — Safety: 6.85x', color: 'var(--neon-orange)', pct: 15 },
          ].map(s => (
            <GlassCard key={s.label} tilt={false} glow={`${s.color}10`}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ color: s.color, opacity: 0.6, marginTop: 2 }}>{s.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>{s.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-code)', color: s.color, marginTop: 2 }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{s.sub}</div>
                  <div className="progress-bar" style={{ marginTop: 6, height: 3 }}>
                    <div className="progress-fill" style={{ width: `${s.pct}%`, background: s.color }} />
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', padding: 3, marginBottom: 16 }}>
          {([['overview', 'System Overview', <Activity size={13} key="o" />], ['subsystems', 'Subsystem Details', <Cpu size={13} key="s" />], ['maintenance', 'Maintenance & Alarms', <ClipboardCheck size={13} key="m" />]] as const).map(([key, label, icon]) => (
            <button key={key} onClick={() => setActiveTab(key)} className={`control-btn ${activeTab === key ? 'active' : ''}`} style={{ flex: 1, justifyContent: 'center', fontSize: 11, gap: 4, padding: '8px' }}>{icon} {label}</button>
          ))}
        </div>

        {/* TAB: Overview */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <GlassCard tilt={false}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Anchor size={15} /> Subsystem Health Matrix</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { name: 'Winch System (Main + 3 Aux)', status: 'online', health: 98, detail: 'Main: IDLE | Cable: 450m deployed' },
                  { name: 'Power Distribution (Inverter #1/#2)', status: 'online', health: 95, detail: 'INV#1: Active 230V | INV#2: Standby' },
                  { name: 'Helium Management', status: 'online', health: 92, detail: '165 bar | Regulator: Normal | Leak: None' },
                  { name: 'Weather Station', status: 'online', health: 100, detail: '12 km/h NW | 28°C | RH 65% | 1013 hPa' },
                  { name: 'Lightning Detection', status: 'online', health: 100, detail: 'Clear — No strikes within 50 km' },
                  { name: 'Ground Anchor & Mounting', status: 'online', health: 97, detail: '4-point anchoring — All secure' },
                  { name: 'EOP / Communication', status: 'online', health: 96, detail: '42 dB SNR | 85 Mbps | Loss: 5.5 dB' },
                  { name: 'Safety Systems (E-Stop, Cutaway)', status: 'online', health: 100, detail: 'Armed — Last tested: 2026-07-08' },
                ].map(sub => (
                  <div key={sub.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card-hover)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--neon-green)', boxShadow: '0 0 8px rgba(63,185,80,0.4)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{sub.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-code)', marginTop: 2 }}>{sub.detail}</div>
                    </div>
                    <div style={{ width: 56, textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-code)', color: sub.health >= 95 ? 'var(--neon-green)' : 'var(--warning-400)' }}>{sub.health}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <GlassCard tilt={false}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}><Wind size={15} /> Weather Station</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {[
                    { l: 'WIND', v: '12 km/h', c: 'var(--neon-cyan)' },
                    { l: 'GUST', v: '18 km/h', c: 'var(--warning-400)' },
                    { l: 'DIRECTION', v: 'NW 315°', c: 'var(--text-secondary)' },
                    { l: 'TEMPERATURE', v: '28°C', c: 'var(--neon-green)' },
                    { l: 'HUMIDITY', v: '65%', c: 'var(--text-secondary)' },
                    { l: 'PRESSURE', v: '1013 hPa', c: 'var(--text-secondary)' },
                    { l: 'VISIBILITY', v: '10+ km', c: 'var(--neon-green)' },
                    { l: 'CLOUD BASE', v: '2,500m', c: 'var(--text-secondary)' },
                    { l: 'LIGHTNING', v: 'Clear', c: 'var(--neon-green)' },
                  ].map(w => (
                    <div key={w.l} style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>{w.l}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-code)', color: w.c, marginTop: 2 }}>{w.v}</div>
                    </div>
                  ))}
                </div>
              </GlassCard>
              <GlassCard tilt={false}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}><BarChart3 size={15} /> Wind Trend (24h)</div>
                <MiniBarChart data={[8, 10, 12, 9, 11, 14, 16, 13, 11, 12, 15, 18, 14, 12, 10, 11, 13, 15, 12, 10, 11, 12, 13, 12]} color="var(--neon-cyan)" height={80} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-disabled)', marginTop: 4 }}><span>00:00</span><span>12:00</span><span>Now</span></div>
              </GlassCard>
            </div>
          </div>
        )}

        {/* TAB: Subsystems */}
        {activeTab === 'subsystems' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <GlassCard tilt={false}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}><Gauge size={15} /> Winch System</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {[{ l: 'MAIN WINCH', v: 'IDLE', c: 'var(--text-secondary)' }, { l: 'CABLE OUT', v: '450m', c: 'var(--neon-cyan)' }, { l: 'SPEED', v: '0 m/min', c: 'var(--text-secondary)' }, { l: 'AUX WINCH 1', v: 'IDLE', c: 'var(--text-secondary)' }, { l: 'AUX WINCH 2', v: 'IDLE', c: 'var(--text-secondary)' }, { l: 'AUX WINCH 3', v: 'IDLE', c: 'var(--text-secondary)' }, { l: 'MOTOR TEMP', v: '42°C', c: 'var(--neon-green)' }, { l: 'BRAKE', v: 'ENGAGED', c: 'var(--neon-green)' }, { l: 'EXT POWER', v: 'CONNECTED', c: 'var(--neon-green)' }].map(w => (
                  <div key={w.l} style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)' }}>{w.l}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-code)', color: w.c, marginTop: 2 }}>{w.v}</div>
                  </div>
                ))}
              </div>
            </GlassCard>
            <GlassCard tilt={false}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}><Zap size={15} /> Power Distribution</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {[
                  { l: 'INV #1', v: 'ACTIVE', c: 'var(--neon-green)' }, { l: 'INV #2', v: 'STANDBY', c: 'var(--warning-400)' }, { l: 'OUTPUT', v: '230V', c: 'var(--neon-green)' },
                  { l: 'BATT VOLTAGE', v: '24.2V', c: 'var(--neon-green)' }, { l: 'BATT CURRENT', v: '12.5A', c: 'var(--neon-cyan)' }, { l: 'BATT SOC', v: '87%', c: 'var(--neon-green)' },
                  { l: 'SOLAR INPUT', v: '850W', c: 'var(--neon-orange)' }, { l: 'GEN STATUS', v: 'OFF', c: 'var(--text-muted)' }, { l: 'ISOLATION', v: '125 MΩ', c: 'var(--neon-green)' },
                ].map(w => (
                  <div key={w.l} style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)' }}>{w.l}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-code)', color: w.c, marginTop: 2 }}>{w.v}</div>
                  </div>
                ))}
              </div>
            </GlassCard>
            <GlassCard tilt={false}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}><ThermometerSun size={15} /> Helium Management</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {[
                  { l: 'PRESSURE', v: '165 bar', c: 'var(--neon-blue)' }, { l: 'CAPACITY', v: '92%', c: 'var(--neon-green)' }, { l: 'TEMP', v: '18°C', c: 'var(--text-secondary)' },
                  { l: 'LEAK RATE', v: 'None', c: 'var(--neon-green)' }, { l: 'Δ PRESSURE', v: '-0.3/hr', c: 'var(--text-secondary)' }, { l: 'REGULATOR', v: 'NORMAL', c: 'var(--neon-green)' },
                ].map(w => (
                  <div key={w.l} style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)' }}>{w.l}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-code)', color: w.c, marginTop: 2 }}>{w.v}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Helium Pressure (24h)</div>
              <MiniBarChart data={[170, 169, 168, 168, 167, 167, 166, 166, 166, 165, 165, 165, 165, 165, 165, 165, 165, 165, 165, 165, 165, 165, 165, 165]} color="var(--neon-blue)" height={60} />
            </GlassCard>
            <GlassCard tilt={false}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}><Shield size={15} /> Safety & Emergency</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { name: 'Emergency Stop (E-Stop)', status: 'Armed', color: 'var(--neon-green)' },
                  { name: 'Automatic Cutaway System', status: 'Armed', color: 'var(--neon-green)' },
                  { name: 'Lightning Protection', status: 'Active', color: 'var(--neon-green)' },
                  { name: 'Over-speed Protection', status: 'Armed (35 km/h)', color: 'var(--neon-green)' },
                  { name: 'Over-tension Limit', status: 'Set (6,000 N)', color: 'var(--neon-green)' },
                  { name: 'Low Helium Alarm', status: 'Set (120 bar)', color: 'var(--neon-green)' },
                ].map(s => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card-hover)', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: 12 }}>{s.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-code)', color: s.color }}>{s.status}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        )}

        {/* TAB: Maintenance */}
        {activeTab === 'maintenance' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <GlassCard tilt={false}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><ClipboardCheck size={15} /> Maintenance Log</div>
                <button className="btn btn-primary btn-sm" style={{ gap: 4 }} onClick={() => addToast({ type: 'info', title: 'New Task', message: 'Maintenance task form opened.' })}><Plus size={12} /> Add Task</button>
              </div>
              <div className="table-container">
                <table><thead><tr><th>Date</th><th>Task</th><th>Tech</th><th>Status</th></tr></thead>
                  <tbody>{maintenanceLog.map((m, i) => (
                    <tr key={i}>
                      <td className="font-mono text-xs">{m.date}</td>
                      <td style={{ fontWeight: 600 }}>{m.task}</td>
                      <td>{m.tech}</td>
                      <td><span className={`badge badge-${m.status === 'done' ? 'success' : 'info'}`}>{m.status === 'done' ? 'Done' : 'Scheduled'}</span></td>
                    </tr>
                  ))}</tbody></table>
              </div>
            </GlassCard>
            <GlassCard tilt={false}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}><BellRing size={15} /> Alarm History</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {alarmLog.map((a, i) => {
                  const sevColors: Record<string, { bg: string; text: string; border: string }> = {
                    warning: { bg: 'rgba(245,158,11,0.06)', text: 'var(--warning-400)', border: 'rgba(245,158,11,0.12)' },
                    info: { bg: 'rgba(59,130,246,0.06)', text: 'var(--info-400)', border: 'rgba(59,130,246,0.12)' },
                    success: { bg: 'rgba(16,185,129,0.06)', text: 'var(--success-400)', border: 'rgba(16,185,129,0.12)' },
                  };
                  const sev = sevColors[a.severity] || sevColors.info;
                  return (
                    <div key={i} style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: sev.bg, border: `1px solid ${sev.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: sev.text, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 500, flex: 1 }}>{a.msg}</span>
                        <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{a.time}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </LicenseGate>
  );
}

/* ===== SIMULATION ===== */
export function SimulationPage() {
  const { addToast } = useApp();
  const [params, setParams] = useState({ wind: 15, gustFactor: 1.5, direction: 'NW 315°', visibility: 10, temp: 28, humidity: 65, pressure: 1013, altitude: 450, blockTime: 270, balloon: 'SkyStar 180', payload: 'Epsilon 140Z G2', helium: 165, crewSize: 4 });
  const [result, setResult] = useState<null | 'GO' | 'NO_GO' | 'MARGINAL'>(null);
  const [risks, setRisks] = useState<{ f: string; r: string; c: string; detail: string; limit: string }[]>([]);
  const [simulating, setSimulating] = useState(false);
  const [activeTab, setActiveTab] = useState<'params' | 'equipment' | 'history'>('params');
  const [simHistory, setSimHistory] = useState<{ id: number; time: string; result: string; wind: number; alt: number }[]>([
    { id: 1, time: '14:30', result: 'GO', wind: 10, alt: 400 },
    { id: 2, time: '12:00', result: 'MARGINAL', wind: 22, alt: 500 },
    { id: 3, time: '08:15', result: 'GO', wind: 8, alt: 350 },
  ]);

  const runSimulation = () => {
    setSimulating(true);
    setTimeout(() => {
      const riskFactors: { f: string; r: string; c: string; detail: string; limit: string }[] = [];
      const gustSpeed = params.wind * params.gustFactor;
      // Wind
      if (params.wind > 35) riskFactors.push({ f: 'Sustained Wind', r: 'CRITICAL', c: 'var(--danger-400)', detail: `${params.wind} km/h exceeds max limit`, limit: '≤ 35 km/h' });
      else if (params.wind > 25) riskFactors.push({ f: 'Sustained Wind', r: 'HIGH', c: 'var(--warning-400)', detail: `${params.wind} km/h — approaching limit`, limit: '≤ 35 km/h' });
      else if (params.wind > 15) riskFactors.push({ f: 'Sustained Wind', r: 'MEDIUM', c: 'var(--warning-400)', detail: `${params.wind} km/h — elevated`, limit: '≤ 35 km/h' });
      else riskFactors.push({ f: 'Sustained Wind', r: 'LOW', c: 'var(--neon-green)', detail: `${params.wind} km/h — safe`, limit: '≤ 35 km/h' });
      // Gust
      if (gustSpeed > 50) riskFactors.push({ f: 'Wind Gust', r: 'CRITICAL', c: 'var(--danger-400)', detail: `Est. ${gustSpeed.toFixed(0)} km/h gust`, limit: '≤ 50 km/h' });
      else if (gustSpeed > 35) riskFactors.push({ f: 'Wind Gust', r: 'HIGH', c: 'var(--warning-400)', detail: `Est. ${gustSpeed.toFixed(0)} km/h gust`, limit: '≤ 50 km/h' });
      else riskFactors.push({ f: 'Wind Gust', r: 'LOW', c: 'var(--neon-green)', detail: `Est. ${gustSpeed.toFixed(0)} km/h gust`, limit: '≤ 50 km/h' });
      // Visibility
      if (params.visibility < 2) riskFactors.push({ f: 'Visibility', r: 'CRITICAL', c: 'var(--danger-400)', detail: `${params.visibility} km — minimum required 2 km`, limit: '≥ 2 km' });
      else if (params.visibility < 5) riskFactors.push({ f: 'Visibility', r: 'MEDIUM', c: 'var(--warning-400)', detail: `${params.visibility} km — reduced`, limit: '≥ 2 km' });
      else riskFactors.push({ f: 'Visibility', r: 'LOW', c: 'var(--neon-green)', detail: `${params.visibility} km — good`, limit: '≥ 2 km' });
      // Temperature
      if (params.temp > 45 || params.temp < 0) riskFactors.push({ f: 'Temperature', r: 'HIGH', c: 'var(--warning-400)', detail: `${params.temp}°C — outside operating range`, limit: '0–45°C' });
      else riskFactors.push({ f: 'Temperature', r: 'LOW', c: 'var(--neon-green)', detail: `${params.temp}°C — within range`, limit: '0–45°C' });
      // Altitude
      if (params.altitude > 600) riskFactors.push({ f: 'Altitude', r: 'HIGH', c: 'var(--warning-400)', detail: `${params.altitude}m exceeds recommended`, limit: '≤ 600m AGL' });
      else riskFactors.push({ f: 'Altitude', r: 'LOW', c: 'var(--neon-green)', detail: `${params.altitude}m AGL`, limit: '≤ 600m AGL' });
      // Helium
      if (params.helium < 120) riskFactors.push({ f: 'Helium Pressure', r: 'CRITICAL', c: 'var(--danger-400)', detail: `${params.helium} bar — below minimum`, limit: '≥ 120 bar' });
      else if (params.helium < 150) riskFactors.push({ f: 'Helium Pressure', r: 'MEDIUM', c: 'var(--warning-400)', detail: `${params.helium} bar — low`, limit: '≥ 120 bar' });
      else riskFactors.push({ f: 'Helium Pressure', r: 'LOW', c: 'var(--neon-green)', detail: `${params.helium} bar — adequate`, limit: '≥ 120 bar' });
      // Block time
      const maxBlockByHelium = ((params.helium - 120) / 0.3).toFixed(0);
      if (params.blockTime > +maxBlockByHelium) riskFactors.push({ f: 'Block Time', r: 'HIGH', c: 'var(--warning-400)', detail: `${params.blockTime} min exceeds He endurance (${maxBlockByHelium} min)`, limit: `≤ ${maxBlockByHelium} min` });
      else riskFactors.push({ f: 'Block Time', r: 'LOW', c: 'var(--neon-green)', detail: `${params.blockTime} min — within He endurance`, limit: `≤ ${maxBlockByHelium} min` });
      // Pressure
      if (params.pressure < 990) riskFactors.push({ f: 'Barometric Pressure', r: 'MEDIUM', c: 'var(--warning-400)', detail: `${params.pressure} hPa — low pressure system`, limit: '≥ 990 hPa' });
      else riskFactors.push({ f: 'Barometric Pressure', r: 'LOW', c: 'var(--neon-green)', detail: `${params.pressure} hPa — stable`, limit: '≥ 990 hPa' });

      setRisks(riskFactors);
      const hasCritical = riskFactors.some(r => r.r === 'CRITICAL');
      const hasHigh = riskFactors.some(r => r.r === 'HIGH');
      const verdict = hasCritical ? 'NO_GO' : hasHigh ? 'MARGINAL' : 'GO';
      setResult(verdict);
      setSimHistory(prev => [{ id: Date.now(), time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), result: verdict, wind: params.wind, alt: params.altitude }, ...prev]);
      setSimulating(false);
      addToast({ type: verdict === 'GO' ? 'success' : verdict === 'NO_GO' ? 'error' : 'warning', title: `Simulation: ${verdict.replace('_', ' ')}`, message: verdict === 'GO' ? 'All clear — flight approved.' : `${riskFactors.filter(r => r.r === 'CRITICAL' || r.r === 'HIGH').length} risk factor(s) detected.` });
    }, 2000);
  };

  const riskScore = result ? (risks.filter(r => r.r === 'LOW').length / risks.length * 100).toFixed(0) : null;

  return (
    <LicenseGate moduleCode="1.3f" moduleName="Simulation Plan Skenario Flight Balloon">
      <div className="animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}><FlaskConical size={22} /> Flight Simulation & Scenario Planning</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Comprehensive GO/NO-GO assessment — weather, equipment & operational readiness</p>
          </div>
          <button className="btn btn-secondary" onClick={() => { setResult(null); setRisks([]); }} style={{ gap: 6 }}><X size={14} /> Reset</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 16 }}>
          {/* Left: Parameters */}
          <div>
            {/* Parameter Tabs */}
            <div style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', padding: 3, marginBottom: 16 }}>
              {([['params', 'Environment', <Wind size={13} key="p" />], ['equipment', 'Equipment', <Cpu size={13} key="e" />], ['history', 'History', <Clock size={13} key="h" />]] as const).map(([key, label, icon]) => (
                <button key={key} onClick={() => setActiveTab(key)} className={`control-btn ${activeTab === key ? 'active' : ''}`} style={{ flex: 1, justifyContent: 'center', fontSize: 11, gap: 4, padding: '8px' }}>{icon} {label}</button>
              ))}
            </div>

            {activeTab === 'params' && (
              <GlassCard tilt={false}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Wind size={15} /> Environmental Conditions</div>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Sustained Wind (km/h)</label><input className="form-input" type="number" value={params.wind} onChange={e => setParams(p => ({ ...p, wind: +e.target.value }))} /><div style={{ fontSize: 9, color: params.wind > 25 ? 'var(--warning-400)' : 'var(--text-disabled)', marginTop: 2 }}>Limit: 35 km/h</div></div>
                  <div className="form-group"><label className="form-label">Gust Factor</label><select className="form-select" value={params.gustFactor} onChange={e => setParams(p => ({ ...p, gustFactor: +e.target.value }))}><option value="1.3">1.3x (Light)</option><option value="1.5">1.5x (Moderate)</option><option value="2.0">2.0x (Strong)</option></select></div>
                  <div className="form-group"><label className="form-label">Direction</label><select className="form-select" value={params.direction} onChange={e => setParams(p => ({ ...p, direction: e.target.value }))}><option>N 0°</option><option>NE 45°</option><option>E 90°</option><option>SE 135°</option><option>S 180°</option><option>SW 225°</option><option>W 270°</option><option>NW 315°</option></select></div>
                  <div className="form-group"><label className="form-label">Visibility (km)</label><input className="form-input" type="number" value={params.visibility} onChange={e => setParams(p => ({ ...p, visibility: +e.target.value }))} /><div style={{ fontSize: 9, color: params.visibility < 5 ? 'var(--warning-400)' : 'var(--text-disabled)', marginTop: 2 }}>Min: 2 km</div></div>
                  <div className="form-group"><label className="form-label">Temperature (°C)</label><input className="form-input" type="number" value={params.temp} onChange={e => setParams(p => ({ ...p, temp: +e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Humidity (%)</label><input className="form-input" type="number" value={params.humidity} onChange={e => setParams(p => ({ ...p, humidity: +e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Barometric Pressure (hPa)</label><input className="form-input" type="number" value={params.pressure} onChange={e => setParams(p => ({ ...p, pressure: +e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Target Altitude (m AGL)</label><input className="form-input" type="number" value={params.altitude} onChange={e => setParams(p => ({ ...p, altitude: +e.target.value }))} /><div style={{ fontSize: 9, color: params.altitude > 500 ? 'var(--warning-400)' : 'var(--text-disabled)', marginTop: 2 }}>Recommended: ≤ 600m</div></div>
                </div>
                <button className="btn btn-primary w-full mt-16" onClick={runSimulation} disabled={simulating} style={{ gap: 6 }}>
                  {simulating ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Running Simulation...</> : <><FlaskConical size={14} /> Run Full Simulation</>}
                </button>
              </GlassCard>
            )}

            {activeTab === 'equipment' && (
              <GlassCard tilt={false}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Cpu size={15} /> Equipment & Operations</div>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Balloon Platform</label><select className="form-select" value={params.balloon} onChange={e => setParams(p => ({ ...p, balloon: e.target.value }))}><option>SkyStar 180</option><option>SkyStar 120</option></select></div>
                  <div className="form-group"><label className="form-label">Payload</label><select className="form-select" value={params.payload} onChange={e => setParams(p => ({ ...p, payload: e.target.value }))}><option>Epsilon 140Z G2</option><option>Epsilon 140Z</option><option>Epsilon 140</option></select></div>
                  <div className="form-group"><label className="form-label">Helium Pressure (bar)</label><input className="form-input" type="number" value={params.helium} onChange={e => setParams(p => ({ ...p, helium: +e.target.value }))} /><div style={{ fontSize: 9, color: params.helium < 150 ? 'var(--warning-400)' : 'var(--text-disabled)', marginTop: 2 }}>Min: 120 bar</div></div>
                  <div className="form-group"><label className="form-label">Block Time (min)</label><input className="form-input" type="number" value={params.blockTime} onChange={e => setParams(p => ({ ...p, blockTime: +e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Crew Size</label><input className="form-input" type="number" value={params.crewSize} onChange={e => setParams(p => ({ ...p, crewSize: +e.target.value }))} /><div style={{ fontSize: 9, color: 'var(--text-disabled)', marginTop: 2 }}>Min: 3 required</div></div>
                </div>
                <div style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Equipment Readiness</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {['Mooring System', 'Tether Cable', 'Gimbal Payload', 'Power Supply', 'Communication', 'Safety Systems'].map(eq => (
                    <div key={eq} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.1)', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: 12 }}>{eq}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--neon-green)', fontFamily: 'var(--font-code)' }}>READY</span>
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary w-full mt-16" onClick={runSimulation} disabled={simulating} style={{ gap: 6 }}>
                  {simulating ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Running...</> : <><FlaskConical size={14} /> Run Simulation</>}
                </button>
              </GlassCard>
            )}

            {activeTab === 'history' && (
              <GlassCard tilt={false}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={15} /> Simulation History</div>
                <div className="table-container">
                  <table><thead><tr><th>Time</th><th>Result</th><th>Wind</th><th>Altitude</th></tr></thead>
                    <tbody>{simHistory.map(h => (
                      <tr key={h.id}>
                        <td className="font-mono text-xs">{h.time}</td>
                        <td><span className={`badge badge-${h.result === 'GO' ? 'success' : h.result === 'NO_GO' ? 'danger' : 'warning'}`}>{h.result.replace('_', ' ')}</span></td>
                        <td className="font-mono">{h.wind} km/h</td>
                        <td className="font-mono">{h.alt}m</td>
                      </tr>
                    ))}</tbody></table>
                </div>
              </GlassCard>
            )}
          </div>

          {/* Right: Result Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <GlassCard glow={result === 'GO' ? 'rgba(63,185,80,0.08)' : result === 'NO_GO' ? 'rgba(239,68,68,0.08)' : result === 'MARGINAL' ? 'rgba(245,158,11,0.08)' : undefined}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><BarChart3 size={15} /> Assessment Result</div>
              {simulating ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <Loader2 size={48} style={{ color: 'var(--neon-cyan)', animation: 'spin 1s linear infinite', marginBottom: 12 }} />
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Analyzing {risks.length > 0 ? `${risks.length} factors` : 'parameters'}...</p>
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                    {['Checking weather limits', 'Evaluating equipment', 'Computing risk matrix'].map((step, i) => (
                      <div key={step} style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0, animation: `fadeIn 0.3s ease ${0.3 + i * 0.5}s forwards`, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--neon-cyan)', animation: 'pulse 1s infinite' }} />{step}
                      </div>
                    ))}
                  </div>
                </div>
              ) : result ? (
                <div>
                  {/* Big verdict */}
                  <div style={{ textAlign: 'center', padding: '16px 0 20px', borderBottom: '1px solid var(--border-subtle)', marginBottom: 16 }}>
                    <div style={{
                      fontSize: 52, fontWeight: 900, lineHeight: 1,
                      color: result === 'GO' ? 'var(--neon-green)' : result === 'NO_GO' ? 'var(--danger-500)' : 'var(--warning-500)',
                    }}>{result.replace('_', ' ')}</div>
                    <p style={{ color: 'var(--text-muted)', marginTop: 10, fontSize: 12 }}>
                      {result === 'GO' ? 'All parameters within safe operating limits.' : result === 'NO_GO' ? 'Critical risk factors detected. Flight NOT recommended.' : 'Elevated risk — commander approval required.'}
                    </p>
                    {/* Score circle */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '8px 16px', borderRadius: 'var(--radius-full)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Safety Score:</span>
                      <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-code)', color: +riskScore! >= 80 ? 'var(--neon-green)' : +riskScore! >= 50 ? 'var(--warning-400)' : 'var(--danger-400)' }}>{riskScore}%</span>
                    </div>
                  </div>
                  {/* Risk breakdown */}
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 8 }}>Risk Factor Analysis ({risks.length} factors)</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 350, overflowY: 'auto' }}>
                    {risks.map((r, i) => (
                      <div key={r.f} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)',
                        background: r.r === 'CRITICAL' ? 'rgba(239,68,68,0.04)' : r.r === 'HIGH' ? 'rgba(245,158,11,0.04)' : 'rgba(0,0,0,0.1)',
                        animation: `fadeIn 0.2s ease ${i * 0.05}s both`,
                      }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: r.c, flexShrink: 0, boxShadow: `0 0 6px ${r.c}55` }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 600 }}>{r.f}</div>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>{r.detail}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-code)', color: r.c }}>{r.r}</span>
                          <div style={{ fontSize: 8, color: 'var(--text-disabled)', marginTop: 1 }}>{r.limit}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  <FlaskConical size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <p style={{ fontSize: 14, fontWeight: 600 }}>Configure & Run Simulation</p>
                  <p style={{ fontSize: 11, marginTop: 6 }}>Set environmental conditions and equipment parameters, then run the simulation to get a GO/NO-GO assessment.</p>
                </div>
              )}
            </GlassCard>

            {/* Recommendations */}
            {result && (
              <GlassCard tilt={false}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><ClipboardCheck size={15} /> Recommendations</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(result === 'GO' ? [
                    { msg: 'Proceed with standard pre-flight checklist', icon: <CheckCircle2 size={13} /> },
                    { msg: 'Monitor wind conditions during ascent', icon: <Wind size={13} /> },
                    { msg: `Max block time: ${params.blockTime} min based on He pressure`, icon: <Clock size={13} /> },
                  ] : result === 'MARGINAL' ? [
                    { msg: 'Requires Commander approval before flight', icon: <Shield size={13} /> },
                    { msg: 'Reduce altitude to mitigate wind risk', icon: <AlertTriangle size={13} /> },
                    { msg: 'Shorten block time by 30%', icon: <Clock size={13} /> },
                    { msg: 'Ensure all safety systems tested', icon: <FlaskConical size={13} /> },
                  ] : [
                    { msg: 'DO NOT proceed with flight operations', icon: <Shield size={13} /> },
                    { msg: 'Wait for conditions to improve', icon: <Clock size={13} /> },
                    { msg: 'Re-simulate when parameters change', icon: <FlaskConical size={13} /> },
                  ]).map((rec, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.1)', border: '1px solid var(--border-subtle)', fontSize: 12 }}>
                      <span style={{ color: result === 'GO' ? 'var(--neon-green)' : result === 'MARGINAL' ? 'var(--warning-400)' : 'var(--danger-400)' }}>{rec.icon}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{rec.msg}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </LicenseGate>
  );
}
