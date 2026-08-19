'use client';
/* =====================================================================
   LAPISAN MIKROINTERAKSI — BAGIAN YANG BUTUH PENGUKURAN

   Sebagian besar mikrointeraksi ditangani motion.css. Tiga hal di bawah
   tidak bisa: keduanya memerlukan pengukuran posisi nyata di layar,
   sesuatu yang tidak dapat dinyatakan dalam CSS.

   1. Riak tekan yang berangkat dari titik kursor.
   2. Pil pada kendali tersegmentasi yang meluncur ke pilihan baru.
   3. Rel penanda halaman aktif di navigasi samping.

   Komponen ini dipasang satu kali di kerangka aplikasi dan bekerja untuk
   seluruh halaman. Ia tidak pernah menyisipkan simpul DOM ke dalam pohon
   yang dikelola React — hasil pengukuran ditulis sebagai custom property
   pada elemen induk, lalu CSS yang menggambar. Dengan begitu tidak ada
   perebutan kendali DOM dengan React saat halaman dirender ulang.
   ===================================================================== */
import { useEffect } from 'react';
import { useApp } from '../context';

/* Elemen yang layak menerima riak: tombol sungguhan yang mengerjakan
   sesuatu. Kendali kecil seperti kotak centang tidak termasuk — riak di
   dalamnya lebih besar daripada kendalinya sendiri. */
const RIPPLE_TARGET = '.btn, .header-btn, .nav-item, .nc-foot-link';

export default function MotionLayer() {
  const { currentPage, sidebarCollapsed, lang } = useApp();

  /* ---------- 1. Riak tekan ---------- */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const onDown = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.(RIPPLE_TARGET) as HTMLElement | null;
      if (!el || el.hasAttribute('disabled')) return;

      const kotak = el.getBoundingClientRect();
      /* Riak harus menutupi sudut terjauh dari titik klik, jika tidak ia
         berhenti di tengah tombol dan terlihat seperti cacat. */
      const jauh = Math.max(
        Math.hypot(e.clientX - kotak.left, e.clientY - kotak.top),
        Math.hypot(kotak.right - e.clientX, e.clientY - kotak.top),
        Math.hypot(e.clientX - kotak.left, kotak.bottom - e.clientY),
        Math.hypot(kotak.right - e.clientX, kotak.bottom - e.clientY),
      );

      const riak = document.createElement('span');
      riak.className = 'm-ripple';
      riak.style.left = `${e.clientX - kotak.left}px`;
      riak.style.top = `${e.clientY - kotak.top}px`;
      riak.style.width = riak.style.height = `${jauh * 2}px`;

      /* Tombol harus memotong riak agar tidak meluber keluar sudutnya. */
      const gaya = getComputedStyle(el);
      if (gaya.position === 'static') el.style.position = 'relative';
      if (gaya.overflow === 'visible') el.style.overflow = 'hidden';

      el.appendChild(riak);
      riak.addEventListener('animationend', () => riak.remove(), { once: true });
      /* Jaring pengaman bila peristiwa animasi tidak pernah tiba. */
      window.setTimeout(() => riak.remove(), 700);
    };

    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  /* ---------- 2. Pil kendali tersegmentasi ----------
     Diukur ulang setiap kali halaman, bahasa, atau lebar jendela
     berubah, dan setiap kali kelas 'on' berpindah tombol. */
  useEffect(() => {
    const ukurSemua = () => {
      document.querySelectorAll<HTMLElement>('.seg').forEach(seg => {
        const aktif = seg.querySelector<HTMLElement>('button.on');
        if (!aktif) {
          seg.style.setProperty('--m-pill-o', '0');
          return;
        }
        seg.style.setProperty('--m-pill-x', `${aktif.offsetLeft}px`);
        seg.style.setProperty('--m-pill-w', `${aktif.offsetWidth}px`);
        seg.style.setProperty('--m-pill-o', '1');
      });
    };

    /* Pengukuran pertama menunggu satu bingkai: pada bingkai yang sama
       dengan pemasangan, lebar tombol masih nol. */
    const bingkai = requestAnimationFrame(ukurSemua);

    /* Perubahan kelas 'on' datang dari React, bukan dari peristiwa yang
       bisa didengarkan — jadi pohon diamati langsung. */
    const pengamat = new MutationObserver(ukurSemua);
    pengamat.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
      childList: true,
    });

    const pengukurUlang = new ResizeObserver(ukurSemua);
    document.querySelectorAll('.seg').forEach(s => pengukurUlang.observe(s));

    window.addEventListener('resize', ukurSemua);

    return () => {
      cancelAnimationFrame(bingkai);
      pengamat.disconnect();
      pengukurUlang.disconnect();
      window.removeEventListener('resize', ukurSemua);
    };
  }, [currentPage, lang]);

  /* ---------- 3. Rel navigasi samping ---------- */
  useEffect(() => {
    const ukurRel = () => {
      const nav = document.querySelector<HTMLElement>('.sidebar-nav');
      if (!nav) return;
      const aktif = nav.querySelector<HTMLElement>('.nav-item.active');
      if (!aktif) {
        nav.style.setProperty('--m-rail-o', '0');
        return;
      }
      /* Posisi dihitung dari kotak batas, bukan offsetTop. Sejak menu
         dikelompokkan, butir aktif berada di dalam .nav-group yang juga
         berposisi relatif — offsetTop akan terhitung terhadap kelompok
         itu, bukan terhadap seluruh daftar. Selisih kotak batas selalu
         benar berapa pun dalamnya sarang, dan tetap benar saat daftar
         sedang tergulir. */
      const kotakNav = nav.getBoundingClientRect();
      const kotakAktif = aktif.getBoundingClientRect();

      /* Butir yang kelompoknya sedang menutup memiliki tinggi nol; rel
         disembunyikan alih-alih menyusut menjadi garis tak bermakna. */
      if (kotakAktif.height < 4) {
        nav.style.setProperty('--m-rail-o', '0');
        return;
      }

      nav.style.setProperty('--m-rail-y', `${kotakAktif.top - kotakNav.top + nav.scrollTop + 6}px`);
      nav.style.setProperty('--m-rail-h', `${kotakAktif.height - 12}px`);
      nav.style.setProperty('--m-rail-o', '1');
    };

    const bingkai = requestAnimationFrame(ukurRel);
    /* Sidebar dapat digulir dan dilipat; keduanya menggeser posisi rel. */
    const nav = document.querySelector('.sidebar-nav');
    nav?.addEventListener('scroll', ukurRel, { passive: true });
    window.addEventListener('resize', ukurRel);

    /* Membuka atau menutup sebuah kelompok menggeser seluruh butir di
       bawahnya. Rel diukur ulang selama transisi berlangsung, bukan
       hanya di ujungnya, supaya ia bergerak bersama daftar alih-alih
       melompat setelah daftar berhenti. */
    let jalan = 0;
    const ikuti = () => {
      ukurRel();
      jalan = requestAnimationFrame(ikuti);
    };
    const mulaiIkuti = () => {
      if (!jalan) jalan = requestAnimationFrame(ikuti);
    };
    const hentiIkuti = () => {
      if (jalan) { cancelAnimationFrame(jalan); jalan = 0; }
      ukurRel();
    };
    nav?.addEventListener('transitionrun', mulaiIkuti);
    nav?.addEventListener('transitionend', hentiIkuti);
    nav?.addEventListener('transitioncancel', hentiIkuti);

    /* Pelipatan sidebar memakai transisi lebar; rel diukur ulang setelah
       transisi itu selesai. */
    const tunda = window.setTimeout(ukurRel, 260);

    return () => {
      cancelAnimationFrame(bingkai);
      if (jalan) cancelAnimationFrame(jalan);
      window.clearTimeout(tunda);
      nav?.removeEventListener('scroll', ukurRel);
      nav?.removeEventListener('transitionrun', mulaiIkuti);
      nav?.removeEventListener('transitionend', hentiIkuti);
      nav?.removeEventListener('transitioncancel', hentiIkuti);
      window.removeEventListener('resize', ukurRel);
    };
  }, [currentPage, sidebarCollapsed, lang]);

  return null;
}
