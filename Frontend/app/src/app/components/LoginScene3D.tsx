'use client';
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';

/* =====================================================================
   LOGIN SCENE 3D — Globe + Tethered Balloon + GIS
   Continuous cinematic animation: Login → Auth → Success → Dashboard
   ===================================================================== */

/* ---------- EARTH GLOBE (Wireframe + GIS Grid) ---------- */
function EarthGlobe({ phase }: { phase: string }) {
  const globeRef = useRef<THREE.Group>(null);

  // Create GIS-style grid lines on sphere
  const gridGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const radius = 2.0;

    // Latitude lines (every 15 degrees)
    for (let lat = -75; lat <= 75; lat += 15) {
      const phi = (90 - lat) * (Math.PI / 180);
      const segments = 64;
      for (let i = 0; i < segments; i++) {
        const theta1 = (i / segments) * Math.PI * 2;
        const theta2 = ((i + 1) / segments) * Math.PI * 2;
        positions.push(
          radius * Math.sin(phi) * Math.cos(theta1), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta1),
          radius * Math.sin(phi) * Math.cos(theta2), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta2)
        );
      }
    }

    // Longitude lines (every 20 degrees)
    for (let lon = 0; lon < 360; lon += 20) {
      const theta = lon * (Math.PI / 180);
      const segments = 64;
      for (let i = 0; i < segments; i++) {
        const phi1 = (i / segments) * Math.PI;
        const phi2 = ((i + 1) / segments) * Math.PI;
        positions.push(
          radius * Math.sin(phi1) * Math.cos(theta), radius * Math.cos(phi1), radius * Math.sin(phi1) * Math.sin(theta),
          radius * Math.sin(phi2) * Math.cos(theta), radius * Math.cos(phi2), radius * Math.sin(phi2) * Math.sin(theta)
        );
      }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, []);

  // Continent point approximation
  const continentGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const r = 2.01;

    const landPatches = [
      { lat: 35, lon: 105, spread: 30, count: 120 },
      { lat: 55, lon: 80, spread: 25, count: 80 },
      { lat: 25, lon: 75, spread: 15, count: 60 },
      { lat: 50, lon: 15, spread: 15, count: 60 },
      { lat: 45, lon: 5, spread: 10, count: 40 },
      { lat: 5, lon: 20, spread: 20, count: 80 },
      { lat: -15, lon: 25, spread: 15, count: 50 },
      { lat: 40, lon: -95, spread: 20, count: 80 },
      { lat: 25, lon: -100, spread: 10, count: 40 },
      { lat: -15, lon: -55, spread: 20, count: 70 },
      { lat: -25, lon: 135, spread: 12, count: 40 },
      { lat: -5, lon: 115, spread: 15, count: 60 },
      { lat: 2, lon: 110, spread: 10, count: 40 },
    ];

    let seed = 42;
    const rng = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

    landPatches.forEach(patch => {
      for (let i = 0; i < patch.count; i++) {
        const latR = patch.lat + (rng() - 0.5) * patch.spread * 2;
        const lonR = patch.lon + (rng() - 0.5) * patch.spread * 2;
        const phi = (90 - latR) * (Math.PI / 180);
        const theta = lonR * (Math.PI / 180);
        positions.push(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
      }
    });

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, []);

  useFrame((_, delta) => {
    if (globeRef.current) {
      const speed = phase === 'authenticating' ? 0.15 : 0.05;
      globeRef.current.rotation.y += delta * speed;
    }
  });

  return (
    <group ref={globeRef}>
      <mesh>
        <sphereGeometry args={[1.98, 48, 48]} />
        <meshPhongMaterial color="#0a1628" transparent opacity={0.6} shininess={30} />
      </mesh>
      <lineSegments geometry={gridGeometry}>
        <lineBasicMaterial color="#1e3a5f" transparent opacity={0.25} />
      </lineSegments>
      <points geometry={continentGeometry}>
        <pointsMaterial color="#3b82f6" size={0.02} transparent opacity={0.6} sizeAttenuation />
      </points>
      <mesh>
        <sphereGeometry args={[2.15, 48, 48]} />
        <meshPhongMaterial color="#1d4ed8" transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[2.4, 32, 32]} />
        <meshPhongMaterial color="#3b82f6" transparent opacity={0.02} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

/* ---------- TETHERED BALLOON ---------- */
function TetheredBalloon({ phase }: { phase: string }) {
  const groupRef = useRef<THREE.Group>(null);

  const basePosition = useMemo(() => {
    const lat = -6.2, lon = 106.8, r = 2.02;
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = lon * (Math.PI / 180);
    return new THREE.Vector3(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
  }, []);

  const balloonHeight = phase === 'authenticating' || phase === 'success' ? 0.8 : 0.5;
  const normal = useMemo(() => basePosition.clone().normalize(), [basePosition]);
  const balloonPos = useMemo(() => basePosition.clone().add(normal.clone().multiplyScalar(balloonHeight)), [basePosition, normal, balloonHeight]);

  const cableGeometry = useMemo(() => {
    const pointVectors: [number, number, number][] = [];
    const segments = 20;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const height = t * balloonHeight;
      const sway = Math.sin(t * Math.PI) * 0.03;
      const pos = basePosition.clone().add(normal.clone().multiplyScalar(height));
      pos.x += sway;
      pointVectors.push([pos.x, pos.y, pos.z]);
    }
    return pointVectors;
  }, [basePosition, normal, balloonHeight]);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      groupRef.current.position.set(Math.sin(t * 0.3) * 0.01, Math.sin(t * 0.5) * 0.02, 0);
    }
  });

  return (
    <group ref={groupRef}>
      <Line
        points={cableGeometry}
        color="#94a3b8"
        transparent
        opacity={0.5}
        lineWidth={1}
      />
      <mesh position={balloonPos}>
        <sphereGeometry args={[0.06, 16, 12]} />
        <meshPhongMaterial color="#f1f5f9" transparent opacity={0.85} emissive="#3b82f6" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[balloonPos.x, balloonPos.y - 0.08, balloonPos.z]}>
        <boxGeometry args={[0.025, 0.015, 0.025]} />
        <meshPhongMaterial color="#1e293b" />
      </mesh>
      <mesh position={[balloonPos.x, balloonPos.y - 0.09, balloonPos.z]}>
        <circleGeometry args={[0.008, 12]} />
        <meshBasicMaterial color={phase === 'authenticating' || phase === 'success' ? '#10b981' : '#3b82f6'} />
      </mesh>
      <mesh position={basePosition}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>
    </group>
  );
}

/* ---------- SCANNING BEAM ---------- */
function ScanningBeam({ phase }: { phase: string }) {
  const beamRef = useRef<THREE.Mesh>(null);
  const basePosition = useMemo(() => {
    const lat = -6.2, lon = 106.8, r = 2.02;
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = lon * (Math.PI / 180);
    return new THREE.Vector3(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
  }, []);

  const beamActive = phase === 'authenticating' || phase === 'success';
  const normal = useMemo(() => basePosition.clone().normalize(), [basePosition]);
  const balloonPos = useMemo(() => basePosition.clone().add(normal.clone().multiplyScalar(0.42)), [basePosition, normal]);

  useFrame(({ clock }) => {
    if (beamRef.current) {
      beamRef.current.rotation.y = clock.getElapsedTime() * 0.3;
      const mat = beamRef.current.material as THREE.MeshBasicMaterial;
      const target = beamActive ? 0.08 : 0.03;
      mat.opacity += (target - mat.opacity) * 0.05;
    }
  });

  if (phase === 'transitioning') return null;

  return (
    <mesh ref={beamRef} position={balloonPos}>
      <coneGeometry args={[0.15, 0.4, 16, 1, true]} />
      <meshBasicMaterial color="#3b82f6" transparent opacity={0.03} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

/* ---------- ORBITAL SATELLITES ---------- */
function DataSatellites() {
  const groupRef = useRef<THREE.Group>(null);
  const sats = useMemo(() => [
    { orbit: 2.8, speed: 0.2, offset: 0, incl: 0.3 },
    { orbit: 3.0, speed: -0.15, offset: 2.1, incl: -0.2 },
    { orbit: 3.3, speed: 0.1, offset: 4.2, incl: 0.4 },
  ], []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      const s = sats[i];
      const a = t * s.speed + s.offset;
      child.position.set(Math.cos(a) * s.orbit, Math.sin(a * 0.5) * s.incl, Math.sin(a) * s.orbit);
    });
  });

  return (
    <group ref={groupRef}>
      {sats.map((_, i) => (
        <mesh key={i}>
          <octahedronGeometry args={[0.03, 0]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- STARS ---------- */
function Stars() {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    let s = 123;
    const rng = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    for (let i = 0; i < 800; i++) {
      const r = 15 + rng() * 20;
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(2 * rng() - 1);
      positions.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, []);

  return (
    <points geometry={geometry}>
      <pointsMaterial color="#94a3b8" size={0.06} transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

/* ---------- CAMERA CONTROLLER ---------- */
function CameraController({ phase }: { phase: string }) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 1.5, 5.5));
  const lookAtTarget = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    switch (phase) {
      case 'login':
        targetPos.current.set(0, 1.5, 5.5);
        lookAtTarget.current.set(0, 0, 0);
        break;
      case 'authenticating':
        targetPos.current.set(1.5, 0.8, 4.0);
        lookAtTarget.current.set(0.5, -0.2, 0);
        break;
      case 'success':
        targetPos.current.set(1.2, 0.5, 3.5);
        lookAtTarget.current.set(0.5, -0.2, 0);
        break;
      case 'transitioning':
        targetPos.current.set(0, 0, 2.5);
        lookAtTarget.current.set(0, 0, 0);
        break;
    }
  }, [phase]);

  useFrame(() => {
    camera.position.lerp(targetPos.current, 0.02);
    camera.lookAt(lookAtTarget.current);
  });

  return null;
}

/* ---------- HUD OVERLAY ---------- */
function HUDOverlay({ phase }: { phase: string }) {
  const [hudVisible, setHudVisible] = useState(false);

  useEffect(() => {
    if (phase === 'success') {
      const t = setTimeout(() => setHudVisible(true), 300);
      return () => clearTimeout(t);
    }
    setHudVisible(false);
  }, [phase]);

  if (phase !== 'success' && phase !== 'authenticating') return null;

  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10,
      transition: 'opacity 0.6s ease',
      opacity: phase === 'success' ? 1 : 0,
    }}>
      {hudVisible && (
        <>
          {/* Crosshair */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 60, height: 60, border: '1px solid rgba(59,130,246,0.3)', borderRadius: '50%',
            animation: 'hudPulse 2s ease infinite',
          }}>
            {[{ l: -8, t: '50%', w: 16, h: 1, ty: '-50%' }, { r: -8, t: '50%', w: 16, h: 1, ty: '-50%' },
              { l: '50%', t: -8, w: 1, h: 16, tx: '-50%' }, { l: '50%', b: -8, w: 1, h: 16, tx: '-50%' }
            ].map((s, i) => (
              <div key={i} style={{
                position: 'absolute', background: 'rgba(59,130,246,0.5)',
                ...(s.l !== undefined ? { left: s.l } : {}), ...(s.r !== undefined ? { right: s.r } : {}),
                ...(s.t !== undefined ? { top: s.t } : {}), ...(s.b !== undefined ? { bottom: s.b } : {}),
                width: s.w, height: s.h,
                transform: `${s.tx ? `translateX(${s.tx})` : ''} ${s.ty ? `translateY(${s.ty})` : ''}`.trim() || undefined,
              }} />
            ))}
          </div>

          {/* Coordinates — top left */}
          <div style={{
            position: 'absolute', top: 24, left: 24,
            fontFamily: 'var(--font-code)', fontSize: 10, color: 'rgba(148,163,184,0.6)',
            lineHeight: 1.8, animation: 'fadeSlideIn 0.4s ease 0.2s both',
          }}>
            <div>LAT -6.2088°</div>
            <div>LON 106.8456°</div>
            <div>ALT 285.0m</div>
          </div>

          {/* System status — top right */}
          <div style={{
            position: 'absolute', top: 24, right: 24,
            fontFamily: 'var(--font-code)', fontSize: 10, color: 'rgba(148,163,184,0.6)',
            textAlign: 'right', lineHeight: 1.8, animation: 'fadeSlideIn 0.4s ease 0.4s both',
          }}>
            <div style={{ color: 'rgba(16,185,129,0.8)' }}>● SYSTEM ONLINE</div>
            <div>SAT LINK: 3/3</div>
            <div>UPTIME: 99.7%</div>
          </div>

          {/* Bottom bar */}
          <div style={{
            position: 'absolute', bottom: 24, left: 24, right: 24,
            display: 'flex', justifyContent: 'space-between',
            fontFamily: 'var(--font-code)', fontSize: 9, color: 'rgba(148,163,184,0.4)',
            animation: 'fadeSlideIn 0.4s ease 0.6s both',
          }}>
            <span>SkyStar GeoInt v2.1.0</span>
            <span>ENCRYPTED CHANNEL</span>
            <span>{new Date().toISOString().slice(0, 19)}Z</span>
          </div>
        </>
      )}

      <style>{`
        @keyframes hudPulse {
          0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ========== MAIN EXPORT ========== */
export default function LoginScene3D({ phase = 'login' }: { phase?: string }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 0,
      transition: 'opacity 0.8s ease',
      opacity: phase === 'transitioning' ? 0 : 1,
      background: 'linear-gradient(180deg, #020617 0%, #0a1628 50%, #0f172a 100%)',
    }}>
      <Canvas
        camera={{ position: [0, 1.5, 5.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 3, 5]} intensity={0.6} color="#e2e8f0" />
        <pointLight position={[-3, 2, -3]} intensity={0.2} color="#3b82f6" />

        <CameraController phase={phase} />
        <Stars />
        <EarthGlobe phase={phase} />
        <TetheredBalloon phase={phase} />
        <ScanningBeam phase={phase} />
        <DataSatellites />
      </Canvas>

      <HUDOverlay phase={phase} />

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 50%, rgba(2,6,23,0.5) 100%)',
      }} />
    </div>
  );
}
