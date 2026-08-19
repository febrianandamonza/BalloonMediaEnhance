'use client';
/* =====================================================================
   ADEGAN 3D LAYAR MASUK
   ---------------------------------------------------------------------
   Adegan ini bukan hiasan lepas: keempat babaknya mengikuti persis apa
   yang sedang terjadi pada sesi operator, dan berakhir pada objek yang
   sama dengan yang menyambut di Mission Dashboard.

     login          Kamera berdiri di permukaan, memandang balon yang
                    bertahan di ketinggian dengan kabel penambat terulur
                    ke titik gelar. Tenang, belum ada aktivitas sensor.

     authenticating Kamera mendekat ke gimbal. Kerucut pandang menyala
                    dan menyapu permukaan — stasiun sedang memeriksa
                    kredensial dan sertifikat.

     success        Kamera mundur; cincin cakupan mengembang di
                    permukaan dan tautan data ke titik tambat menyala.

     transitioning  Kamera memanjat cepat. Permukaan yang tadinya datar
                    melengkung menjadi bola bumi — inilah bola dunia yang
                    langsung dilihat operator di Mission Dashboard.

   Bumi memang dimodelkan sebagai bola berjari-jari besar yang puncaknya
   menyentuh y = 0, sehingga "tanah" pada babak awal dan "bola dunia"
   pada babak akhir benar-benar objek yang sama — bukan dua adegan
   berbeda yang disambung.
   ===================================================================== */

/* React Three Fiber menganimasikan adegan dengan cara mengubah langsung
   objek Three.js pada setiap bingkai — itulah kontrak pustakanya, dan
   memang tidak melewati state React. Aturan immutability karena itu
   dimatikan khusus untuk berkas ini. */
/* eslint-disable react-hooks/immutability */

import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/* Jari-jari bumi pada adegan. Pusatnya diletakkan di bawah agar
   permukaan atasnya tepat berada di ketinggian nol. */
const R = 62;
const EARTH_CENTER = new THREE.Vector3(0, -R, 0);

/* Ketinggian balon di atas permukaan (satuan adegan). */
const ALT = 3.1;

type Phase = 'login' | 'authenticating' | 'success' | 'transitioning' | 'app';

/* ---------------------------------------------------------------------
   Koreografi kamera — satu tabel, satu sumber kebenaran.
   --------------------------------------------------------------------- */
const SHOTS: Record<Phase, { pos: [number, number, number]; look: [number, number, number]; fov: number }> = {
  /* Berdiri agak jauh di permukaan: balon terlihat utuh beserta kabel
     penambatnya, dan garis cakrawala ikut masuk bingkai. */
  login: { pos: [9.5, 2.4, 15.5], look: [0, ALT * 0.72, 0], fov: 40 },
  /* Mendekat ke gimbal saat kredensial diperiksa. Titik bidik digeser ke
     kanan agar balon jatuh di sisi kiri bingkai — kolom kanan layar
     ditempati panel verifikasi. */
  authenticating: { pos: [4.4, 4.2, 8.0], look: [2.0, ALT + 0.2, 0], fov: 36 },
  /* Mundur dan naik untuk memperlihatkan cakupan di permukaan. */
  success: { pos: [2.6, 7.4, 18.0], look: [2.4, ALT * 0.4, 0], fov: 46 },
  /* Memanjat cepat — permukaan melengkung menjadi bola dunia. */
  transitioning: { pos: [0, 42, 26], look: [0, 0, 0], fov: 60 },
  app: { pos: [0, 42, 26], look: [0, 0, 0], fov: 60 },
};

function Rig({ phase }: { phase: Phase }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(...SHOTS.login.look));
  const drift = useRef(0);

  useFrame((_, delta) => {
    const shot = SHOTS[phase] ?? SHOTS.login;

    /* Gerak melayang halus hanya pada babak diam, supaya adegan tidak
       terasa beku tanpa mengganggu pembacaan. */
    drift.current += delta * 0.16;
    const idle = phase === 'login' ? 1 : 0;
    const wobbleX = Math.sin(drift.current) * 0.55 * idle;
    const wobbleY = Math.cos(drift.current * 0.7) * 0.18 * idle;

    const want = new THREE.Vector3(
      shot.pos[0] + wobbleX,
      shot.pos[1] + wobbleY,
      shot.pos[2],
    );

    /* Perpindahan babak dibuat cepat di awal lalu melambat, sehingga
       terbaca sebagai gerakan kamera yang disengaja. */
    const ease = phase === 'transitioning' ? 1.9 : 1.15;
    camera.position.lerp(want, 1 - Math.exp(-ease * delta));
    target.current.lerp(new THREE.Vector3(...shot.look), 1 - Math.exp(-2.4 * delta));
    camera.lookAt(target.current);

    const cam = camera as THREE.PerspectiveCamera;
    cam.fov += (shot.fov - cam.fov) * (1 - Math.exp(-2.2 * delta));
    cam.updateProjectionMatrix();
  });

  return null;
}

/* ---------------------------------------------------------------------
   Bumi — permukaan pada babak awal, bola dunia pada babak akhir.
   --------------------------------------------------------------------- */
function Earth({ phase }: { phase: Phase }) {
  const gridRef = useRef<THREE.LineSegments>(null);

  /* Jaring meridian & paralel dibuat sekali, lalu hanya diputar. */
  const grid = useMemo(() => {
    const geo = new THREE.SphereGeometry(R + 0.02, 48, 32);
    return new THREE.WireframeGeometry(geo);
  }, []);

  useFrame((_, delta) => {
    if (gridRef.current) gridRef.current.rotation.y += delta * 0.012;
  });

  const lit = phase === 'success' || phase === 'transitioning';

  return (
    <>
      <group position={EARTH_CENTER}>
        {/* Badan bumi */}
        <mesh>
          <sphereGeometry args={[R, 96, 64]} />
          <meshStandardMaterial
            color="#132437"
            roughness={0.92}
            metalness={0.06}
            emissive={lit ? '#143a63' : '#0b1c30'}
            emissiveIntensity={lit ? 0.6 : 0.42}
          />
        </mesh>

        {/* Jaring koordinat global */}
        <lineSegments ref={gridRef} geometry={grid}>
          <lineBasicMaterial color="#3b82f6" transparent opacity={0.16} />
        </lineSegments>

        {/* Cahaya tepi atmosfer — terlihat jelas saat kamera memanjat */}
        <mesh>
          <sphereGeometry args={[R * 1.016, 64, 48]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={phase === 'transitioning' ? 0.2 : 0.09}
            side={THREE.BackSide}
          />
        </mesh>
      </group>

      {/* Kisi kutub di sekitar titik gelar — cincin jangkauan dan garis
          baringan, bahasa visual yang sama dengan peta taktis GeoInt. */}
      <polarGridHelper args={[26, 12, 8, 96, '#1e40af', '#1e3a5f']} position={[0, 0.015, 0]}>
        <lineBasicMaterial attach="material" color="#2563eb" transparent opacity={0.28} />
      </polarGridHelper>
    </>
  );
}

/* ---------------------------------------------------------------------
   Aerostat tertambat: badan balon, sirip, kabel, dan titik gelar.
   --------------------------------------------------------------------- */
function Aerostat({ phase }: { phase: Phase }) {
  const body = useRef<THREE.Group>(null);
  const gimbal = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (body.current) {
      /* Simpangan akibat angin — kecil, seperti balon tertambat sungguhan. */
      body.current.position.x = Math.sin(t * 0.34) * 0.16;
      body.current.position.y = ALT + Math.sin(t * 0.52) * 0.07;
      body.current.rotation.z = Math.sin(t * 0.34) * 0.045;
    }
    if (gimbal.current) {
      /* Gimbal menyapu saat verifikasi, diam mengarah ke bawah selebihnya. */
      gimbal.current.rotation.y = phase === 'authenticating'
        ? Math.sin(t * 1.7) * 0.7
        : gimbal.current.rotation.y * 0.94;
    }
  });

  return (
    <group>
      {/* Kabel penambat */}
      <mesh position={[0, ALT / 2, 0]}>
        <cylinderGeometry args={[0.012, 0.012, ALT, 6]} />
        <meshBasicMaterial color="#64748b" transparent opacity={0.55} />
      </mesh>

      {/* Titik gelar / winch di permukaan */}
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.3, 0.42, 0.12, 16]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.58, 32]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>

      <group ref={body} position={[0, ALT, 0]}>
        {/* Badan balon — elipsoid memanjang searah angin */}
        <mesh scale={[1.55, 0.92, 0.92]}>
          <sphereGeometry args={[0.92, 48, 32]} />
          <meshStandardMaterial
            color="#dbe4f0"
            roughness={0.42}
            metalness={0.12}
            emissive="#1e3a5f"
            emissiveIntensity={0.28}
          />
        </mesh>

        {/* Sirip ekor — ditempatkan di luar badan agar benar-benar
            terlihat sebagai stabilisator, bukan tenggelam di dalamnya. */}
        {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((a, i) => (
          <mesh
            key={i}
            position={[1.42, Math.sin(a) * 0.34, Math.cos(a) * 0.34]}
            rotation={[-a, 0, -Math.PI / 2]}
          >
            <coneGeometry args={[0.075, 0.62, 4]} />
            <meshStandardMaterial color="#8fa3bd" roughness={0.55} metalness={0.2} />
          </mesh>
        ))}

        {/* Gimbal sensor di bawah badan */}
        <mesh ref={gimbal} position={[0, -0.78, 0]}>
          <sphereGeometry args={[0.2, 24, 18]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.7} />
        </mesh>

        {/* Lampu navigasi */}
        <mesh position={[-1.4, 0, 0]}>
          <sphereGeometry args={[0.055, 12, 10]} />
          <meshBasicMaterial color={phase === 'login' ? '#ef4444' : '#34d399'} />
        </mesh>
      </group>
    </group>
  );
}

/* ---------------------------------------------------------------------
   Kerucut pandang sensor — menyala hanya saat verifikasi berlangsung.
   --------------------------------------------------------------------- */
function SensorCone({ phase }: { phase: Phase }) {
  const ref = useRef<THREE.Mesh>(null);
  const active = phase === 'authenticating';

  useFrame(({ clock }, delta) => {
    const m = ref.current;
    if (!m) return;
    const mat = m.material as THREE.MeshBasicMaterial;
    mat.opacity += ((active ? 0.2 : 0) - mat.opacity) * Math.min(1, delta * 4);
    /* Kerucut ikut menyapu bersama gimbal. */
    m.rotation.y = Math.sin(clock.getElapsedTime() * 1.7) * 0.7;
    m.rotation.z = Math.sin(clock.getElapsedTime() * 1.1) * 0.14;
  });

  return (
    <mesh ref={ref} position={[0, ALT / 2 - 0.3, 0]}>
      <coneGeometry args={[1.5, ALT - 0.4, 40, 1, true]} />
      <meshBasicMaterial
        color="#38bdf8"
        transparent
        opacity={0}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ---------------------------------------------------------------------
   Cincin cakupan yang mengembang di permukaan setelah akses diberikan.
   --------------------------------------------------------------------- */
function CoverageRings({ phase }: { phase: Phase }) {
  const group = useRef<THREE.Group>(null);
  const show = phase === 'success' || phase === 'transitioning';

  useFrame(({ clock }, delta) => {
    const g = group.current;
    if (!g) return;
    const t = clock.getElapsedTime();

    g.children.forEach((child, i) => {
      const m = child as THREE.Mesh;
      const mat = m.material as THREE.MeshBasicMaterial;
      /* Setiap cincin mengembang dengan jeda berbeda lalu memudar. */
      const cycle = (t * 0.42 + i * 0.34) % 1;
      const s = 1 + cycle * 9;
      m.scale.set(s, s, s);
      const want = show ? (1 - cycle) * 0.42 : 0;
      mat.opacity += (want - mat.opacity) * Math.min(1, delta * 5);
    });
  });

  return (
    <group ref={group} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
      {[0, 1, 2].map(i => (
        <mesh key={i}>
          <ringGeometry args={[0.85, 0.95, 64]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------------------------------------------------------------------
   Tautan data ke titik tambat — garis yang menyala saat sesi terbuka.
   --------------------------------------------------------------------- */
function Downlink({ phase }: { phase: Phase }) {
  const ref = useRef<THREE.Mesh>(null);
  const on = phase === 'success' || phase === 'transitioning';

  useFrame(({ clock }, delta) => {
    const m = ref.current;
    if (!m) return;
    const mat = m.material as THREE.MeshBasicMaterial;
    const pulse = 0.35 + Math.sin(clock.getElapsedTime() * 4) * 0.18;
    mat.opacity += ((on ? pulse : 0) - mat.opacity) * Math.min(1, delta * 5);
  });

  return (
    <mesh ref={ref} position={[1.6, ALT / 2, 0]} rotation={[0, 0, Math.atan2(3.2, ALT)]}>
      <cylinderGeometry args={[0.02, 0.02, ALT * 1.16, 6]} />
      <meshBasicMaterial color="#34d399" transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

/* ---------------------------------------------------------------------
   Bintang latar — deterministik supaya polanya tidak berubah-ubah.
   --------------------------------------------------------------------- */
function Starfield() {
  const positions = useMemo(() => {
    const n = 900;
    const arr = new Float32Array(n * 3);
    let s = 20260727;
    for (let i = 0; i < n; i++) {
      s = (s * 16807) % 2147483647; const u = s / 2147483647;
      s = (s * 16807) % 2147483647; const v = s / 2147483647;
      s = (s * 16807) % 2147483647; const w = s / 2147483647;
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = 150 + w * 90;
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.cos(phi) * 0.7 + 30;
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return arr;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.55} color="#cbd5e1" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

/* ===================================================================== */
export default function LoginScene3D({ phase = 'login' }: { phase?: string }) {
  const p = (['login', 'authenticating', 'success', 'transitioning', 'app'].includes(phase)
    ? phase
    : 'login') as Phase;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        opacity: p === 'transitioning' ? 0.35 : 1,
        transition: 'opacity 900ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      aria-hidden
    >
      <Canvas
        camera={{ position: SHOTS.login.pos, fov: SHOTS.login.fov, near: 0.1, far: 600 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.32} />
        <directionalLight position={[6, 9, 5]} intensity={1.15} color="#dbeafe" />
        <pointLight position={[-5, 3, -4]} intensity={0.5} color="#60a5fa" />

        <Rig phase={p} />
        <Starfield />
        <Earth phase={p} />
        <Aerostat phase={p} />
        <SensorCone phase={p} />
        <CoverageRings phase={p} />
        <Downlink phase={p} />

        <fog attach="fog" args={["#060d1a", 34, 150]} />
      </Canvas>
    </div>
  );
}
