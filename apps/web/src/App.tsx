import { useEffect, useMemo, useState } from "react";
import {
  calculateLegacyEvaluation,
  calculateLearning,
  calculateNomination,
  calculateRoh,
  calculateSimulation,
  NOMINATION_SLOTS,
  OPERATION_SLOTS,
} from "@aditya/calculation-engine";
import type {
  EvaluationHistoryRecord,
  EvaluationInput,
  OperationMode,
} from "@aditya/shared-types";
import "./styles.css";

type Page =
  "simulation" | "roh" | "nomination" | "evaluation" | "tank" | "activity";
type Workspace = {
  id: Page;
  label: string;
  description: string;
  source: string;
};
type Log = {
  id: string;
  at: string;
  action: string;
  module: string;
  detail: string;
};
const HISTORY_KEY = "aditya-evaluation-v2";
const LOG_KEY = "aditya-activity-v2";
const LINEPACK_WARNING_PSI = 650;
const WORKSPACES: Workspace[] = [
  {
    id: "simulation",
    label: "Simulasi Energi",
    description: "Proyeksi energi, gas, flow, dan tren linepack 24 jam.",
    source: "PGN · PHE · GMS",
  },
  {
    id: "roh",
    label: "ROH",
    description: "Rencana operasi harian unit dan proyeksi konsumsi gas.",
    source: "24 slot operasi",
  },
  {
    id: "nomination",
    label: "Nominasi PGN",
    description: "Daily swap, stock, dan forecast nominasi gas per jam.",
    source: "Forecast harian",
  },
  {
    id: "evaluation",
    label: "Evaluasi & Learning",
    description: "Bandingkan prediksi dengan realisasi dan pelajari deviasi.",
    source: "Histori lokal",
  },
  {
    id: "tank",
    label: "Kalkulator Tanki",
    description: "Konversi level-volume dan status operasional RWT/MWT.",
    source: "Formula terversi",
  },
  {
    id: "activity",
    label: "Activity Log",
    description: "Audit aksi operasional non-sensitif pada browser ini.",
    source: "Privasi terjaga",
  },
];
const pageFromPath = (): Page | null => {
  const candidate = window.location.pathname.split("/").filter(Boolean).at(-1);
  return WORKSPACES.some(({ id }) => id === candidate)
    ? (candidate as Page)
    : null;
};
const num = (value: string | number) => Number(value) || 0;
const fixed = (value: number | null | undefined, digits = 2) =>
  value == null ? "–" : value.toFixed(digits);
const read = <T,>(key: string, fallback: T): T => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "") as T;
  } catch {
    return fallback;
  }
};
const download = (
  name: string,
  content: string,
  type = "text/csv;charset=utf-8",
) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\ufeff", content], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};
const exportRows = (
  name: string,
  rows: Array<Array<string | number>>,
  excel = false,
) =>
  download(
    `${name}.${excel ? "xls" : "csv"}`,
    rows
      .map((r) =>
        r
          .map((v) => `"${String(v).replaceAll('"', '""')}"`)
          .join(excel ? "\t" : ";"),
      )
      .join("\n"),
    excel ? "application/vnd.ms-excel" : undefined,
  );

function Chart({
  values,
  color = "#65d6aa",
}: {
  values: number[];
  color?: string;
}) {
  const max = Math.max(...values, 1),
    points = values
      .map(
        (v, i) =>
          `${(i / Math.max(values.length - 1, 1)) * 100},${55 - (v / max) * 48}`,
      )
      .join(" ");
  return (
    <svg
      className="chart"
      viewBox="0 0 100 60"
      preserveAspectRatio="none"
      aria-label="Grafik tren"
    >
      <line x1="0" y1="55" x2="100" y2="55" />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
function Actions({
  name,
  rows,
}: {
  name: string;
  rows: Array<Array<string | number>>;
}) {
  return (
    <div className="actions">
      <button onClick={() => exportRows(name, rows)}>CSV</button>
      <button onClick={() => exportRows(name, rows, true)}>Excel</button>
      <button onClick={() => window.print()}>PDF / Print</button>
    </div>
  );
}
function Input({
  value,
  onChange,
  min,
}: {
  value: number | string;
  onChange: (v: string) => void;
  min?: number;
}) {
  return (
    <input
      type="number"
      min={min}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
function Kpis({ items }: { items: Array<[string, string, boolean?]> }) {
  return (
    <div className="kpis">
      {items.map(([label, value, warn]) => (
        <article className={warn ? "warn" : ""} key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </div>
  );
}
function Module({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="module">
      <div className="module-head">
        <div>
          <span className="eyebrow">OPERATION WORKSPACE</span>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Simulation({ log }: { log: (a: string, d: string) => void }) {
  const [mode, setMode] = useState<OperationMode>("COMBINED");
  const [nomPhe, setNomPhe] = useState(35);
  const [nomPgn, setNomPgn] = useState(28.118);
  const [linepack, setLinepack] = useState(700);
  const [flowIn, setFlowIn] = useState(25);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [rows, setRows] = useState(() =>
    OPERATION_SLOTS.map(() => ({
      loadMw: 0,
      fgcCount: 0 as 0 | 1 | 2 | 3 | 4,
    })),
  );
  const result = useMemo(
    () =>
      calculateSimulation({
        mode,
        nominationPheBbtud: nomPhe,
        nominationPgnBbtud: nomPgn,
        initialLinepack: linepack,
        flowInPhe: flowIn,
        rows,
      }),
    [mode, nomPhe, nomPgn, linepack, flowIn, rows],
  );
  const minimumLinepack = Math.min(...result.rows.map((row) => row.linepack));
  const hasLinepackWarning = minimumLinepack <= LINEPACK_WARNING_PSI;
  useEffect(() => {
    if (!hasLinepackWarning) setWarningDismissed(false);
  }, [hasLinepackWarning]);
  const set = (i: number, key: "loadMw" | "fgcCount", value: string) =>
    setRows((old) =>
      old.map((r, x) =>
        x === i
          ? {
              ...r,
              [key]:
                key === "fgcCount"
                  ? Math.max(0, Math.min(4, Math.round(num(value))))
                  : num(value),
            }
          : r,
      ),
    );
  const fill = (i: number, key: "loadMw" | "fgcCount") => {
    setRows((old) =>
      old.map((r, x) => (x > i ? { ...r, [key]: old[i]![key] } : r)),
    );
    log("FILL_RIGHT", `Simulasi ${key} dari slot ${i + 1}`);
  };
  const data = [
    [
      "Jam",
      "Load",
      "FGC",
      "GT Net",
      "ST Net",
      "Total Net",
      "PHE",
      "PGN",
      "Total Gas",
      "Linepack",
    ],
    ...result.rows.map((r) => [
      r.slot,
      r.loadMw,
      r.fgcCount,
      r.gtNetMw,
      r.stNetMw,
      r.totalNetMw,
      r.pheBbtud,
      r.pgnBbtud,
      r.totalGasBbtud,
      r.linepack,
    ]),
  ];
  return (
    <Module
      title="Simulasi Energi"
      subtitle="Proyeksi 24 jam produksi, konsumsi gas, flow dan linepack."
    >
      <div className="data-source">
        <strong>Sumber data spreadsheet (menunggu link)</strong>
        <span>
          Energi PGN: sheet Data Penyaluran Gas PGN - IP PLTGU Cilegon, kolom G
        </span>
        <span>
          Energi PHE: sheet GMS Monitoring Gas Delivery November 2026, kolom P
        </span>
        <span>
          Trend linepack: sheet GMS Monitoring Gas Delivery November 2026, kolom
          T
        </span>
      </div>
      <div className="controls">
        <label>
          Mode
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as OperationMode)}
          >
            <option value="COMBINED">Combined Cycle</option>
            <option value="OPEN">Open Cycle</option>
          </select>
        </label>
        <label>
          Nominasi PHE
          <Input value={nomPhe} onChange={(v) => setNomPhe(num(v))} />
        </label>
        <label>
          Nominasi PGN
          <Input value={nomPgn} onChange={(v) => setNomPgn(num(v))} />
        </label>
        <label>
          Linepack awal (psi)
          <Input value={linepack} onChange={(v) => setLinepack(num(v))} />
        </label>
        <label>
          Flow in PHE
          <Input value={flowIn} onChange={(v) => setFlowIn(num(v))} />
        </label>
      </div>
      <Kpis
        items={[
          [
            "Rata-rata PHE",
            `${fixed(result.averagePheBbtud)} BBTUD`,
            result.nominationWarnings.phe,
          ],
          [
            "Rata-rata PGN",
            `${fixed(result.averagePgnBbtud)} BBTUD`,
            result.nominationWarnings.pgn,
          ],
          ["Rata-rata Gas", `${fixed(result.averageTotalGasBbtud)} BBTUD`],
          ["Produksi 24 jam", `${fixed(result.totalProductionMw)} MWh`],
          [
            "Minimum linepack",
            `${fixed(minimumLinepack)} psi`,
            hasLinepackWarning,
          ],
        ]}
      />
      {hasLinepackWarning && !warningDismissed && (
        <div className="alert-backdrop" role="presentation">
          <section
            className="alert-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="linepack-alert-title"
          >
            <span className="alert-icon" aria-hidden="true">
              !
            </span>
            <div>
              <span className="eyebrow">PERINGATAN LINEPACK</span>
              <h3 id="linepack-alert-title">Linepack mencapai batas rendah</h3>
              <p>
                Tren minimum mencapai{" "}
                <strong>{fixed(minimumLinepack)} psi</strong>, sama dengan atau
                di bawah ambang {LINEPACK_WARNING_PSI} psi. Segera verifikasi
                penyaluran gas dan rencana operasi.
              </p>
              <button
                onClick={() => {
                  setWarningDismissed(true);
                  log(
                    "ACK_LINEPACK",
                    `Peringatan linepack ${fixed(minimumLinepack)} psi ditutup`,
                  );
                }}
              >
                Saya mengerti
              </button>
            </div>
          </section>
        </div>
      )}
      <Chart values={result.rows.map((r) => r.totalNetMw)} />
      <Actions name="ADITYA_Simulasi" rows={data} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Jam</th>
              <th>Load MW</th>
              <th>FGC</th>
              <th>GT Net</th>
              {mode === "COMBINED" && <th>ST Net</th>}
              <th>Total Net</th>
              <th>PHE</th>
              <th>PGN</th>
              <th>Total Gas</th>
              <th>Linepack</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((r, i) => (
              <tr key={r.slot}>
                <td>{r.slot}</td>
                <td>
                  <Input
                    value={r.loadMw}
                    min={0}
                    onChange={(v) => set(i, "loadMw", v)}
                  />
                  <button className="fill" onClick={() => fill(i, "loadMw")}>
                    →
                  </button>
                </td>
                <td>
                  <Input
                    value={r.fgcCount}
                    min={0}
                    onChange={(v) => set(i, "fgcCount", v)}
                  />
                  <button className="fill" onClick={() => fill(i, "fgcCount")}>
                    →
                  </button>
                </td>
                <td>{fixed(r.gtNetMw, 0)}</td>
                {mode === "COMBINED" && <td>{fixed(r.stNetMw, 0)}</td>}
                <td>{fixed(r.totalNetMw, 0)}</td>
                <td>{fixed(r.pheBbtud)}</td>
                <td>{fixed(r.pgnBbtud)}</td>
                <td>{fixed(r.totalGasBbtud)}</td>
                <td>{fixed(r.linepack)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Module>
  );
}

function Roh({ log }: { log: (a: string, d: string) => void }) {
  const blank = {
    gt11OpenMw: 0,
    gt12OpenMw: 0,
    stMw: 0,
    gt11CombinedMw: 0,
    gt12CombinedMw: 0,
    fgcCount: 0 as 0 | 1 | 2 | 3 | 4,
  };
  const [ownUseUnit, setOwn] = useState<"GT11" | "GT12">("GT11");
  const [rows, setRows] = useState(() =>
    OPERATION_SLOTS.map(() => ({ ...blank })),
  );
  const result = useMemo(
    () => calculateRoh({ ownUseUnit, rows }),
    [ownUseUnit, rows],
  );
  const keys = Object.keys(blank) as Array<keyof typeof blank>;
  const set = (i: number, key: keyof typeof blank, v: string) =>
    setRows((old) =>
      old.map((r, x) =>
        x === i
          ? {
              ...r,
              [key]:
                key === "fgcCount"
                  ? Math.max(0, Math.min(4, Math.round(num(v))))
                  : num(v),
            }
          : r,
      ),
    );
  const fill = (i: number, key: keyof typeof blank) => {
    setRows((old) =>
      old.map((r, x) => (x > i ? { ...r, [key]: old[i]![key] } : r)),
    );
    log("FILL_RIGHT", `ROH ${key} dari slot ${i + 1}`);
  };
  const data = [
    ["Jam", ...keys, "Total Beban", "PHE", "PGN", "Total Gas"],
    ...result.rows.map((r) => [
      r.slot,
      ...keys.map((k) => r[k]),
      r.totalLoadMw,
      r.pheBbtud,
      r.pgnBbtud,
      r.totalGasBbtud,
    ]),
  ];
  return (
    <Module
      title="ROH"
      subtitle="Rencana operasi harian per unit dalam slot 24 jam."
    >
      <div className="controls">
        <label>
          Unit pemakaian sendiri
          <select
            value={ownUseUnit}
            onChange={(e) => setOwn(e.target.value as "GT11" | "GT12")}
          >
            <option>GT11</option>
            <option>GT12</option>
          </select>
        </label>
      </div>
      <Kpis
        items={[
          ["Rata-rata PHE", `${fixed(result.averagePheBbtud)} BBTUD`],
          ["Rata-rata PGN", `${fixed(result.averagePgnBbtud)} BBTUD`],
          ["Rata-rata Gas", `${fixed(result.averageTotalGasBbtud)} BBTUD`],
        ]}
      />
      <Chart values={result.rows.map((r) => r.totalLoadMw)} />
      <Actions name="ADITYA_ROH" rows={data} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Jam</th>
              {["GT11 OC", "GT12 OC", "ST", "GT11 CC", "GT12 CC", "FGC"].map(
                (x) => (
                  <th key={x}>{x}</th>
                ),
              )}
              <th>Total Beban</th>
              <th>PHE</th>
              <th>PGN</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((r, i) => (
              <tr key={r.slot}>
                <td>{r.slot}</td>
                {keys.map((k) => (
                  <td key={k}>
                    <Input value={r[k]} onChange={(v) => set(i, k, v)} />
                    <button className="fill" onClick={() => fill(i, k)}>
                      →
                    </button>
                  </td>
                ))}
                <td>{fixed(r.totalLoadMw, 0)}</td>
                <td>{fixed(r.pheBbtud)}</td>
                <td>{fixed(r.pgnBbtud)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Module>
  );
}

function Nomination({ log }: { log: (a: string, d: string) => void }) {
  const [submissionDate, setSubmission] = useState("");
  const [effectiveDate, setEffective] = useState("");
  const [dailySwapBbtud, setSwap] = useState(0);
  const [dailyStockBbtud, setStock] = useState(0);
  const [rows, setRows] = useState(() =>
    NOMINATION_SLOTS.map(() => ({ swapBbtud: 0, stockBbtud: 0 })),
  );
  const result = useMemo(
    () =>
      calculateNomination({
        submissionDate,
        effectiveDate,
        deliveryPoint: "STASIUN PENGUKUR GAS PLTGU CILEGON",
        receiptPoint: "GUKUR GAS PLTGU CILEGON",
        dailySwapBbtud,
        dailyStockBbtud,
        rows,
      }),
    [submissionDate, effectiveDate, dailySwapBbtud, dailyStockBbtud, rows],
  );
  const fill = () => {
    setRows(
      rows.map(() => ({
        swapBbtud: dailySwapBbtud,
        stockBbtud: dailyStockBbtud,
      })),
    );
    log("FORECAST_FILL", "Forecast nominasi diisi dari nilai harian");
  };
  const data = [
    ["Jam", "Swap", "Stock", "Total"],
    ...result.rows.map((r) => [
      r.slot,
      r.swapBbtud,
      r.stockBbtud,
      r.totalBbtud,
    ]),
  ];
  return (
    <Module
      title="Nominasi PGN"
      subtitle="Form nominasi harian dan forecast per jam."
    >
      <div className="controls">
        <label>
          Tanggal pengajuan
          <input
            type="date"
            value={submissionDate}
            onChange={(e) => setSubmission(e.target.value)}
          />
        </label>
        <label>
          Tanggal efektif
          <input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffective(e.target.value)}
          />
        </label>
        <label>
          Daily Swap
          <Input value={dailySwapBbtud} onChange={(v) => setSwap(num(v))} />
        </label>
        <label>
          Daily Stock
          <Input value={dailyStockBbtud} onChange={(v) => setStock(num(v))} />
        </label>
        <button onClick={fill}>Isi forecast</button>
      </div>
      <Kpis
        items={[
          ["Daily total", `${fixed(result.dailyTotalBbtud)} BBTUD`],
          ["Avg Swap", fixed(result.averageSwapBbtud)],
          ["Avg Stock", fixed(result.averageStockBbtud)],
          ["Avg Total", fixed(result.averageTotalBbtud)],
        ]}
      />
      <Chart values={result.rows.map((r) => r.totalBbtud)} color="#f2b84b" />
      <Actions name="ADITYA_Nominasi_PGN" rows={data} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Jam</th>
              <th>Swap</th>
              <th>Stock</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((r, i) => (
              <tr key={r.slot}>
                <td>{r.slot}</td>
                <td>
                  <Input
                    value={r.swapBbtud}
                    onChange={(v) =>
                      setRows((x) =>
                        x.map((a, n) =>
                          n === i ? { ...a, swapBbtud: num(v) } : a,
                        ),
                      )
                    }
                  />
                </td>
                <td>
                  <Input
                    value={r.stockBbtud}
                    onChange={(v) =>
                      setRows((x) =>
                        x.map((a, n) =>
                          n === i ? { ...a, stockBbtud: num(v) } : a,
                        ),
                      )
                    }
                  />
                </td>
                <td>{fixed(r.totalBbtud)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Module>
  );
}

function Evaluation({ log }: { log: (a: string, d: string) => void }) {
  const [history, setHistory] = useState(() =>
    read<EvaluationHistoryRecord[]>(HISTORY_KEY, []),
  );
  const [input, setInput] = useState<EvaluationInput>({
    operationDate: new Date().toISOString().slice(0, 10),
    mode: "COMBINED",
    loadMw: 230,
    fgcCount: 3,
    predictedGasBbtud: 58,
    actualGasBbtud: 59,
  });
  const result = useMemo(() => calculateLegacyEvaluation(input), [input]);
  const learning = useMemo(
    () => calculateLearning(history, input),
    [history, input],
  );
  const set = (key: keyof EvaluationInput, value: string | number) =>
    setInput((old) => ({ ...old, [key]: value }));
  const save = () => {
    const next = [
      {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        input,
        result,
      },
      ...history,
    ];
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    log("SAVE", "Evaluasi disimpan ke histori lokal browser");
  };
  const remove = (id: string) => {
    const next = history.filter((x) => x.id !== id);
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    log("DELETE", "Satu histori evaluasi dihapus");
  };
  const rows = [
    [
      "Tanggal",
      "Mode",
      "Load",
      "FGC",
      "Prediksi",
      "Aktual",
      "Deviasi",
      "Faktor",
    ],
    ...history.map((x) => [
      x.input.operationDate,
      x.input.mode,
      x.input.loadMw,
      x.input.fgcCount,
      x.input.predictedGasBbtud,
      x.input.actualGasBbtud,
      x.result.deviationPercent,
      x.result.correctionFactor,
    ]),
  ];
  return (
    <Module
      title="Evaluasi & Learning"
      subtitle="Bandingkan prediksi dengan realisasi; learning memakai kondisi historis serupa."
    >
      <p className="notice">
        Histori pada versi ini disimpan lokal di browser. Tidak ada identitas
        pengguna atau data pribadi yang dicatat.
      </p>
      <div className="controls">
        <label>
          Tanggal
          <input
            type="date"
            value={input.operationDate}
            onChange={(e) => set("operationDate", e.target.value)}
          />
        </label>
        <label>
          Mode
          <select
            value={input.mode}
            onChange={(e) => set("mode", e.target.value)}
          >
            <option value="COMBINED">Combined</option>
            <option value="OPEN">Open</option>
          </select>
        </label>
        {[
          ["Load MW", "loadMw"],
          ["FGC", "fgcCount"],
          ["Prediksi Gas", "predictedGasBbtud"],
          ["Realisasi Gas", "actualGasBbtud"],
        ].map(([label, key]) => (
          <label key={key}>
            {label}
            <Input
              value={input[key as keyof EvaluationInput] as number}
              onChange={(v) => set(key as keyof EvaluationInput, num(v))}
            />
          </label>
        ))}
        <button onClick={save}>Simpan evaluasi</button>
      </div>
      <Kpis
        items={[
          ["Deviasi", `${fixed(result.deviationPercent)}%`],
          ["Akurasi", `${fixed(result.accuracyPercent)}%`],
          ["Correction factor", fixed(result.correctionFactor, 4)],
          ["Learning samples", String(learning.sampleCount)],
          ["Learning factor", fixed(learning.learningFactor, 4)],
          [
            "Rekomendasi",
            learning.recommendedGasBbtud == null
              ? "–"
              : `${fixed(learning.recommendedGasBbtud)} BBTUD`,
          ],
        ]}
      />
      <Actions name="ADITYA_Evaluasi" rows={rows} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {rows[0]!.map((x) => (
                <th key={x}>{x}</th>
              ))}
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {history.map((x) => (
              <tr key={x.id}>
                <td>{x.input.operationDate}</td>
                <td>{x.input.mode}</td>
                <td>{x.input.loadMw}</td>
                <td>{x.input.fgcCount}</td>
                <td>{x.input.predictedGasBbtud}</td>
                <td>{x.input.actualGasBbtud}</td>
                <td>{fixed(x.result.deviationPercent)}%</td>
                <td>{fixed(x.result.correctionFactor, 4)}</td>
                <td>
                  <button onClick={() => remove(x.id)}>Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Module>
  );
}

function TankPlaceholder() {
  return (
    <Module
      title="Kalkulator Tanki"
      subtitle="Kalkulator RWT/MWT yang telah dimigrasikan tersedia melalui API."
    >
      <div className="empty">
        <strong>
          Modul kalkulator tetap dipertahankan di calculation engine dan API.
        </strong>
        <p>
          Gunakan endpoint <code>POST /calculations/tank</code>. Integrasi
          visual penuh tidak mengubah formula atau parameter terversi.
        </p>
      </div>
    </Module>
  );
}
function Activity({ logs, clear }: { logs: Log[]; clear: () => void }) {
  const rows = [
    ["Waktu", "Modul", "Aksi", "Detail"],
    ...logs.map((x) => [x.at, x.module, x.action, x.detail]),
  ];
  return (
    <Module
      title="Activity Log"
      subtitle="Jejak aksi operasional lokal tanpa payload sensitif atau identitas pribadi."
    >
      <p className="notice">
        Batas privasi: hanya waktu, nama modul, jenis aksi, dan ringkasan
        non-sensitif. Nilai input detail, IP, user-agent, dan identitas pengguna
        tidak dicatat.
      </p>
      <Actions name="ADITYA_Activity_Log" rows={rows} />
      <button onClick={clear}>Hapus log lokal</button>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {rows[0]!.map((x) => (
                <th key={x}>{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((x) => (
              <tr key={x.id}>
                <td>{new Date(x.at).toLocaleString("id-ID")}</td>
                <td>{x.module}</td>
                <td>{x.action}</td>
                <td>{x.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Module>
  );
}

export function App() {
  const page = pageFromPath();
  const [logs, setLogs] = useState(() => read<Log[]>(LOG_KEY, []));
  const addLog = (action: string, detail: string) => {
    const next = [
      {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        action,
        module: page ?? "landing",
        detail,
      },
      ...logs,
    ].slice(0, 250);
    setLogs(next);
    localStorage.setItem(LOG_KEY, JSON.stringify(next));
  };
  return (
    <div className="app-shell">
      <header>
        <div>
          <span className="eyebrow">PLTGU CILEGON</span>
          <h1>ADITYA</h1>
          <p>Decision support workspace</p>
        </div>
        {page && (
          <a className="home-link" href="/">
            ← Landing page
          </a>
        )}
      </header>
      <main>
        {!page && (
          <section className="landing">
            <div className="landing-copy">
              <span className="eyebrow">WORKSPACE OPERASIONAL</span>
              <h2>Pilih ruang kerja</h2>
              <p>
                Setiap workspace dibuka sebagai halaman mandiri di tab baru.
              </p>
            </div>
            <div className="workspace-grid">
              {WORKSPACES.map((workspace, index) => (
                <a
                  className="workspace-card"
                  href={`/workspace/${workspace.id}`}
                  target="_blank"
                  rel="noreferrer"
                  key={workspace.id}
                >
                  <span className="workspace-number">0{index + 1}</span>
                  <span className="workspace-source">{workspace.source}</span>
                  <h3>{workspace.label}</h3>
                  <p>{workspace.description}</p>
                  <strong>Buka workspace ↗</strong>
                </a>
              ))}
            </div>
          </section>
        )}
        {page === "simulation" && <Simulation log={addLog} />}
        {page === "roh" && <Roh log={addLog} />}
        {page === "nomination" && <Nomination log={addLog} />}
        {page === "evaluation" && <Evaluation log={addLog} />}
        {page === "tank" && <TankPlaceholder />}
        {page === "activity" && (
          <Activity
            logs={logs}
            clear={() => {
              setLogs([]);
              localStorage.removeItem(LOG_KEY);
            }}
          />
        )}
      </main>
      <footer>
        ADITYA · Formula legacy terkarakterisasi · Data kerja tersimpan lokal
        sampai repository PostgreSQL API diaktifkan.
      </footer>
    </div>
  );
}

export default App;
