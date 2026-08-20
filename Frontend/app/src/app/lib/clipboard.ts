/* =====================================================================
   PENYALINAN KE PAPAN KLIP

   navigator.clipboard hanya tersedia pada konteks aman — HTTPS atau
   localhost. Stasiun ini dilayani lewat HTTP biasa di jaringan internal,
   sehingga jalur modern itu tidak pernah ada di sana dan setiap tombol
   salin akan gagal tanpa alasan yang terlihat.

   Fungsi di bawah mencoba jalur modern lebih dulu, lalu jatuh ke
   execCommand yang memang bekerja tanpa konteks aman. execCommand
   memang sudah usang, namun ia satu-satunya cara menyalin di halaman
   non-HTTPS dan seluruh peramban sasaran masih mendukungnya.
   ===================================================================== */

/** Menyalin teks; mengembalikan true bila salah satu jalur berhasil. */
export async function salinTeks(teks: string): Promise<boolean> {
  /* Jalur modern — dipakai bila tersedia dan diizinkan. */
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(teks);
      return true;
    } catch {
      /* Izin ditolak atau konteks tidak aman → lanjut ke cadangan. */
    }
  }

  if (typeof document === 'undefined') return false;

  /* Cadangan: seleksi pada elemen sementara di luar layar. Ia harus
     benar-benar berada di dalam dokumen dan dapat difokus, karena
     execCommand menyalin dari seleksi yang sedang aktif. */
  const kotak = document.createElement('textarea');
  kotak.value = teks;
  kotak.setAttribute('readonly', '');
  kotak.setAttribute('aria-hidden', 'true');
  kotak.style.position = 'fixed';
  kotak.style.top = '0';
  kotak.style.left = '-9999px';
  kotak.style.opacity = '0';
  document.body.appendChild(kotak);

  /* Posisi kursor sebelumnya dikembalikan agar fokus operator tidak
     berpindah tanpa sebab. */
  const fokusSebelumnya = document.activeElement as HTMLElement | null;

  try {
    kotak.select();
    kotak.setSelectionRange(0, kotak.value.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(kotak);
    fokusSebelumnya?.focus?.();
  }
}
