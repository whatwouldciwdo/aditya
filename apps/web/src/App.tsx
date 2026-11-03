import { DOCUMENT_STATUSES } from "@aditya/shared-types";

const modules = [
  "Gas Mix",
  "RWT & MWT",
  "Simulasi Energi",
  "ROH",
  "Nominasi PGN",
  "Evaluasi",
];

export function App() {
  return (
    <div className="app-shell">
      <header>
        <div>
          <span className="eyebrow">PLTGU CILEGON</span>
          <h1>ADITYA</h1>
          <p>Advanced Digital Integrated Turbine &amp; Energy Analytics</p>
        </div>
      </header>
      <main>
        <section className="hero">
          <div>
            <span className="eyebrow">FOUNDATION BUILD</span>
            <h2>Pusat perhitungan dan dokumen operasional</h2>
            <p>
              Formula baseline sedang dikarakterisasi dan belum dianggap resmi
              sebelum validasi Engineer.
            </p>
          </div>
          <div
            className="status-panel"
            aria-label="Status dokumen yang tersedia"
          >
            <span>Status dokumen</span>
            <div>
              {DOCUMENT_STATUSES.map((status) => (
                <strong key={status}>{status}</strong>
              ))}
            </div>
          </div>
        </section>
        <section aria-labelledby="module-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">MODUL</span>
              <h2 id="module-title">Workspace operasional</h2>
            </div>
            <span className="muted">Implementasi bertahap</span>
          </div>
          <div className="module-grid">
            {modules.map((name, index) => (
              <article key={name}>
                <span className="number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{name}</h3>
                <p>
                  Fondasi modul siap untuk migrasi fungsi dan pengujian parity.
                </p>
                <span className="coming">Dalam pengembangan</span>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer>ADITYA Credits 2026</footer>
    </div>
  );
}
