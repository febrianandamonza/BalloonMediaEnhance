'use client';
import { useApp } from '../context';
import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

/* react-three-fiber membuat WebGLRenderer di dalam callback ResizeObserver,
   di luar tumpukan panggilan render/commit React — errornya karena itu TIDAK
   tertangkap oleh error boundary manapun (componentDidCatch tidak pernah
   terpanggil). Satu-satunya cara aman adalah mendeteksi dukungan WebGL
   SEBELUM <Canvas> pernah dipasang sama sekali. */
function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    );
  } catch {
    return false;
  }
}

/* Particle field — surveillance satellite dots.
   Sebaran titik dihitung dari deret deterministik, bukan Math.random,
   agar susunannya identik pada setiap render dan setiap muat ulang. */
function ParticleField({ count = 600, light }: { count?: number; light: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    let s = 20260720;
    for (let i = 0; i < count; i++) {
      s = (s * 16807) % 2147483647;
      const r = 4 + (s / 2147483647) * 8;
      s = (s * 16807) % 2147483647;
      const theta = (s / 2147483647) * Math.PI * 2;
      s = (s * 16807) % 2147483647;
      const phi = Math.acos(2 * (s / 2147483647) - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color={light ? '#3b82f6' : '#00e5ff'} transparent opacity={light ? 0.42 : 0.5} sizeAttenuation />
    </points>
  );
}

/* Wireframe globe — geospatial reference */
function WireGlobe({ light }: { light: boolean }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.08;
      ref.current.rotation.x += delta * 0.02;
    }
  });

  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[2.2, 3]} />
      <meshBasicMaterial color={light ? '#2563eb' : '#00e5ff'} wireframe transparent opacity={light ? 0.16 : 0.08} />
    </mesh>
  );
}

/* Inner glowing sphere */
function GlowSphere({ light }: { light: boolean }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 0.8) * 0.05);
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.4}>
      <mesh ref={ref}>
        <sphereGeometry args={[1.8, 64, 64]} />
        <MeshDistortMaterial
          color={light ? '#cfe0f5' : '#0a1628'}
          emissive={light ? '#7aa7d9' : '#003366'}
          emissiveIntensity={light ? 0.32 : 0.15}
          roughness={light ? 0.55 : 0.7}
          metalness={light ? 0.15 : 0.3}
          distort={0.15}
          speed={1.5}
          transparent
          opacity={0.9}
        />
      </mesh>
    </Float>
  );
}

/* Orbit ring */
function OrbitRing({ radius, speed, tilt, light }: { radius: number; speed: number; tilt: number; light: boolean }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += delta * speed;
  });

  return (
    <mesh ref={ref} rotation={[tilt, 0, 0]}>
      <torusGeometry args={[radius, 0.008, 16, 100]} />
      <meshBasicMaterial color={light ? '#60a5fa' : '#00e5ff'} transparent opacity={light ? 0.1 : 0.12} />
    </mesh>
  );
}

/* Satellite dot orbiting */
function OrbitingDot({ radius, speed, offset, color = '#00e5ff' }: { radius: number; speed: number; offset: number; color?: string }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.elapsedTime * speed + offset;
      ref.current.position.x = Math.cos(t) * radius;
      ref.current.position.z = Math.sin(t) * radius;
      ref.current.position.y = Math.sin(t * 0.5) * 0.3;
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.04, 16, 16]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

/* THREE.WebGLRenderer melempar ulang errornya setelah mencatatnya ke
   console (bukan sekadar log) bila peramban/driver gagal membuat konteks
   WebGL — tanpa batas kesalahan ini, error itu akan lolos ke atas dan
   merusak seluruh pohon React (Dashboard ikut kosong), bukan cuma latar
   3D ini. Karena elemen ini murni hiasan di belakang konten nyata, gagal
   diam (null) sudah aman: kartu-kartu Dashboard tetap utuh. */
class SceneErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) {
    console.error('Globe3D: WebGL tidak tersedia, adegan 3D dilewati.', error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/* Main 3D Scene */
export default function Globe3D({ phase = 'idle' }: { phase?: string }) {
  const { theme } = useApp();
  const light = theme === 'light';
  const [webglOk] = useState(supportsWebGL);

  if (!webglOk) return null;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 0,
      transition: 'opacity 0.8s ease, transform 1s ease',
      opacity: phase === 'transitioning' ? 0 : 1,
      transform: phase === 'success' ? 'scale(1.1)' : phase === 'transitioning' ? 'scale(1.5)' : 'scale(1)',
    }}>
      <SceneErrorBoundary>
        <Canvas
          camera={{ position: [0, 0, 6], fov: 45 }}
          style={{ background: 'transparent' }}
          dpr={[1, 2]}
        >
          <ambientLight intensity={light ? 0.75 : 0.3} />
          <pointLight position={[5, 5, 5]} intensity={0.5} color="#00e5ff" />
          <pointLight position={[-5, -3, 5]} intensity={0.3} color="#448aff" />

          <GlowSphere light={light} />
          <WireGlobe light={light} />
          <ParticleField light={light} />

          <OrbitRing radius={2.8} speed={0.15} tilt={Math.PI * 0.1} light={light} />
          <OrbitRing radius={3.2} speed={-0.1} tilt={Math.PI * 0.35} light={light} />
          <OrbitRing radius={3.6} speed={0.08} tilt={Math.PI * 0.55} light={light} />

          <OrbitingDot radius={2.8} speed={0.4} offset={0} color="#00e5ff" />
          <OrbitingDot radius={3.2} speed={-0.3} offset={2} color="#448aff" />
          <OrbitingDot radius={3.6} speed={0.25} offset={4} color="#b388ff" />
        </Canvas>
      </SceneErrorBoundary>
    </div>
  );
}
