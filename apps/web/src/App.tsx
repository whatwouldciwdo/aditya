import { useEffect, useMemo, useState } from "react";
import {
  calculateLegacyGasMix,
  calculateLegacyEvaluation,
  calculateLegacyTank,
  calculateLearning,
  getLegacyTankDefinition,
  calculateNomination,
  calculateRoh,
  calculateSimulation,
  NOMINATION_SLOTS,
  OPERATION_SLOTS,
  ROH_SLOTS,
} from "@aditya/calculation-engine";
import type {
  EvaluationHistoryRecord,
  EvaluationInput,
  OperationMode,
  TankCode,
  TankInputType,
} from "@aditya/shared-types";
import "./styles.css";

type Page =
  | "gas-mix"
  | "simulation"
  | "roh"
  | "nomination"
  | "evaluation"
  | "tank"
  | "activity";
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
    id: "gas-mix",
    label: "Gas Mix Calculator",
    description: "Hitung kebutuhan gas PHE/PGN dan produksi netto unit.",
    source: "Load turbin · FGC",
  },
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
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="module">
      <div className="module-head">
        <div>
          <h2>{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function GasMix({ log }: { log: (a: string, d: string) => void }) {
  const [loadMw, setLoadMw] = useState(0);
  const [fgcCount, setFgcCount] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [warning, setWarning] = useState("");
  const result = useMemo(
    () => calculateLegacyGasMix(loadMw, fgcCount),
    [loadMw, fgcCount],
  );
  const updateFgc = (value: string) => {
    const requested = Math.round(num(value));
    const normalized = Math.max(0, Math.min(4, requested)) as 0 | 1 | 2 | 3 | 4;
    setFgcCount(normalized);
    setWarning(requested > 4 ? "Total FGC maksimal 4 unit." : "");
  };
  return (
    <Module title="Gas Mix Calculator">
      <div className="calculator-layout">
        <section className="calculator-inputs">
          <span className="eyebrow">INPUT OPERASI</span>
          <h3>Parameter Turbin</h3>
          <label>
            Load Turbin (MW)
            <Input
              value={loadMw}
              min={0}
              onChange={(value) => setLoadMw(Math.max(0, num(value)))}
            />
          </label>
          <label>
            Jumlah FGC (unit)
            <Input value={fgcCount} min={0} onChange={updateFgc} />
          </label>
          <button
            onClick={() =>
              log(
                "CALCULATE_GAS_MIX",
                `Gas Mix dihitung untuk load ${fixed(loadMw)} MW dan ${fgcCount} FGC`,
              )
            }
          >
            Hitung Energi
          </button>
          {warning && <p className="calculator-warning">{warning}</p>}
          <p className="calculator-note">
            Hasil diperbarui otomatis saat parameter berubah.
          </p>
        </section>
        <section className="calculator-results" aria-live="polite">
          <article className="result-primary">
            <span>Energi Gas Mix Total</span>
            <strong>{fixed(result.totalGasBbtud)}</strong>
            <small>BBTUD</small>
          </article>
          <div className="result-grid">
            <article>
              <span>Energi PGN</span>
              <strong>{fixed(result.pgnBbtud)}</strong>
              <small>BBTUD</small>
            </article>
            <article>
              <span>Energi PHE</span>
              <strong>{fixed(result.pheBbtud)}</strong>
              <small>BBTUD</small>
            </article>
            <article>
              <span>Netto GT</span>
              <strong>{fixed(result.gtNetMw, 0)}</strong>
              <small>MW</small>
            </article>
            <article>
              <span>Netto ST</span>
              <strong>{fixed(result.stNetMw, 0)}</strong>
              <small>MW</small>
            </article>
          </div>
          <article className="result-primary result-netto">
            <span>Total Netto</span>
            <strong>{fixed(result.totalNetMw, 0)}</strong>
            <small>MW</small>
          </article>
        </section>
      </div>
    </Module>
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
  const totalProduction = result.rows.reduce(
    (total, row) => total + row.loadMw + row.stNetMw,
    0,
  );
  const totalSales = result.rows.reduce(
    (total, row) => total + row.totalNetMw,
    0,
  );
  const estimatedSfc =
    totalProduction > 0 ? result.averageTotalGasBbtud / totalProduction : 0;
  const simulationColumnCount = mode === "COMBINED" ? 14 : 12;
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
      "ALR (MW)",
      "ST (MW)",
      "GT Net",
      "ST Net",
      "Total Net",
      "Energi PHE",
      "Energi PGN",
      "Total Gas",
      "Total FGC",
      "Linepack",
      "Flow PHE",
      "Flow PGN",
      "Flow In PHE",
    ],
    ...result.rows.map((r) => [
      r.slot,
      r.loadMw,
      r.stNetMw,
      r.gtNetMw,
      r.stNetMw,
      r.totalNetMw,
      r.pheBbtud,
      r.pgnBbtud,
      r.totalGasBbtud,
      r.fgcCount,
      r.linepack,
      r.flowPhe,
      r.flowPgn,
      flowIn,
    ]),
  ];
  return (
    <Module title="Simulasi Energi">
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
          Mode Operasi
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
              <th>
                ALR
                <br />
                (MW)
              </th>
              {mode === "COMBINED" && (
                <th>
                  ST
                  <br />
                  (MW)
                </th>
              )}
              <th>
                GT NET
                <br />
                (MW)
              </th>
              {mode === "COMBINED" && (
                <th>
                  ST NET
                  <br />
                  (MW)
                </th>
              )}
              <th>
                TOTAL NET
                <br />
                (MW)
              </th>
              <th className="energy-column">
                ENERGI PHE
                <br />
                (BBTUD)
              </th>
              <th className="energy-column">
                ENERGI PGN
                <br />
                (BBTUD)
              </th>
              <th>
                Total Gas
                <br />
                (BBTUD)
              </th>
              <th>
                Total FGC
                <br />
                (UNIT)
              </th>
              <th>
                Linepack
                <br />
                (PSI)
              </th>
              <th>
                FLOW PHE
                <br />
                (MMSCFD)
              </th>
              <th>
                FLOW PGN
                <br />
                (MMSCFD)
              </th>
              <th>
                FLOW IN PHE
                <br />
                (MMSCFD)
              </th>
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
                {mode === "COMBINED" && <td>{fixed(r.stNetMw, 0)}</td>}
                <td>{fixed(r.gtNetMw, 0)}</td>
                {mode === "COMBINED" && <td>{fixed(r.stNetMw, 0)}</td>}
                <td>{fixed(r.totalNetMw, 0)}</td>
                <td className="energy-column">{fixed(r.pheBbtud)}</td>
                <td className="energy-column">{fixed(r.pgnBbtud)}</td>
                <td>{fixed(r.totalGasBbtud)}</td>
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
                <td>{fixed(r.linepack)}</td>
                <td>{fixed(r.flowPhe)}</td>
                <td>{fixed(r.flowPgn)}</td>
                <td>{fixed(flowIn)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="simulation-summary">
            <tr>
              <th colSpan={mode === "COMBINED" ? 6 : 4}>Total Gas</th>
              <td className="energy-column">{fixed(result.averagePheBbtud)}</td>
              <td className="energy-column">{fixed(result.averagePgnBbtud)}</td>
              <td>{fixed(result.averageTotalGasBbtud)}</td>
              <th>Estimasi SFC</th>
              <td>{fixed(estimatedSfc, 6)}</td>
              <td colSpan={3} />
            </tr>
            <tr>
              <th colSpan={simulationColumnCount}>
                Total Produksi = {fixed(totalProduction)} MW
              </th>
            </tr>
            <tr>
              <th colSpan={simulationColumnCount}>
                Total Penjualan = {fixed(totalSales)} MW
              </th>
            </tr>
          </tfoot>
        </table>
      </div>
    </Module>
  );
}

function Roh({ log }: { log: (a: string, d: string) => void }) {
  const blank = {
    gt11OpenMw: 0,
    gt12OpenMw: 0,
    gt11CombinedMw: 0,
    gt12CombinedMw: 0,
    fgcCount: 0 as 0 | 1 | 2 | 3 | 4,
  };
  const [ownUseUnit, setOwn] = useState<"GT11" | "GT12">("GT11");
  const [nominationPheBbtud, setNominationPhe] = useState(0);
  const [nominationPgnBbtud, setNominationPgn] = useState(0);
  const [rows, setRows] = useState(() => ROH_SLOTS.map(() => ({ ...blank })));
  const result = useMemo(
    () =>
      calculateRoh({
        ownUseUnit,
        ...(nominationPheBbtud > 0 ? { nominationPheBbtud } : {}),
        ...(nominationPgnBbtud > 0 ? { nominationPgnBbtud } : {}),
        rows,
      }),
    [ownUseUnit, nominationPheBbtud, nominationPgnBbtud, rows],
  );
  const keys = Object.keys(blank) as Array<keyof typeof blank>;
  const inputRows: Array<{
    key: keyof typeof blank;
    label: string;
  }> = [
    { key: "gt11OpenMw", label: "GT1.1 (OC)" },
    { key: "gt12OpenMw", label: "GT1.2 (OC)" },
    { key: "gt11CombinedMw", label: "GT1.1 (CC)" },
    { key: "gt12CombinedMw", label: "GT1.2 (CC)" },
    { key: "fgcCount", label: "Jumlah FGC" },
  ];
  const outputRows = [
    {
      label: "CLGON 1.1 (OC)",
      value: (i: number) => result.rows[i]!.gt11OpenNetMw,
      digits: 0,
    },
    {
      label: "CLGON 1.2 (OC)",
      value: (i: number) => result.rows[i]!.gt12OpenNetMw,
      digits: 0,
    },
    {
      label: "CLGON 1.0",
      value: (i: number) => result.rows[i]!.stNetMw,
      digits: 0,
    },
    {
      label: "CLGON 1.1 (CC)",
      value: (i: number) => result.rows[i]!.gt11CombinedNetMw,
      digits: 0,
    },
    {
      label: "CLGON 1.2 (CC)",
      value: (i: number) => result.rows[i]!.gt12CombinedNetMw,
      digits: 0,
    },
  ];
  const gasRows = [
    { label: "PHE", value: (i: number) => result.rows[i]!.pheBbtud, digits: 2 },
    { label: "PGN", value: (i: number) => result.rows[i]!.pgnBbtud, digits: 2 },
    {
      label: "Total Gas",
      value: (i: number) => result.rows[i]!.totalGasBbtud,
      digits: 2,
    },
    {
      label: "Status Kompresor",
      value: (i: number) => result.rows[i]!.fgcCount,
      digits: 0,
    },
  ];
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
    [
      "Jam",
      ...keys,
      "CLGON 1.1 (OC)",
      "CLGON 1.2 (OC)",
      "CLGON 1.0",
      "CLGON 1.1 (CC)",
      "CLGON 1.2 (CC)",
      "Total Beban",
      "PHE",
      "PGN",
      "Total Gas",
      "Status Kompresor",
    ],
    ...result.rows.map((r) => [
      r.slot,
      ...keys.map((k) => r[k]),
      r.gt11OpenNetMw,
      r.gt12OpenNetMw,
      r.stNetMw,
      r.gt11CombinedNetMw,
      r.gt12CombinedNetMw,
      r.totalLoadMw,
      r.pheBbtud,
      r.pgnBbtud,
      r.totalGasBbtud,
      r.fgcCount,
    ]),
  ];
  return (
    <Module title="Rencana Operasi Harian PLTGU Cilegon">
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
        <label>
          Nominasi PHE (BBTUD)
          <Input
            value={nominationPheBbtud}
            onChange={(value) => setNominationPhe(Math.max(0, num(value)))}
          />
        </label>
        <label>
          Nominasi PGN (BBTUD)
          <Input
            value={nominationPgnBbtud}
            onChange={(value) => setNominationPgn(Math.max(0, num(value)))}
          />
        </label>
        <button
          className="secondary"
          onClick={() => {
            setRows(ROH_SLOTS.map(() => ({ ...blank })));
            setNominationPhe(0);
            setNominationPgn(0);
            log("RESET", "Input ROH dikosongkan");
          }}
        >
          Reset input
        </button>
      </div>
      <Kpis
        items={[
          ["Rata-rata PHE", `${fixed(result.averagePheBbtud)} BBTUD`],
          ["Rata-rata PGN", `${fixed(result.averagePgnBbtud)} BBTUD`],
          ["Rata-rata Gas", `${fixed(result.averageTotalGasBbtud)} BBTUD`],
        ]}
      />
      {(result.nominationWarnings.phe || result.nominationWarnings.pgn) && (
        <div className="notice error">
          Rata-rata konsumsi melampaui nominasi:
          {result.nominationWarnings.phe ? " PHE" : ""}
          {result.nominationWarnings.pgn ? " PGN" : ""}.
        </div>
      )}
      <Chart values={result.rows.map((r) => r.totalLoadMw)} />
      <Actions name="ADITYA_ROH" rows={data} />
      <div className="table-wrap roh-table-wrap">
        <table className="roh-table">
          <thead>
            <tr>
              <th>JAM</th>
              {result.rows.map((row) => (
                <th key={row.slot}>{row.slot}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {inputRows.map(({ key, label }) => (
              <tr key={key} className="roh-input-row">
                <th scope="row">{label}</th>
                {result.rows.map((row, index) => (
                  <td key={row.slot}>
                    <Input
                      value={rows[index]![key]}
                      onChange={(value) => set(index, key, value)}
                    />
                    <button
                      className="fill"
                      title="Isi nilai ini ke semua jam di kanan"
                      aria-label={`Isi ${label} dari ${row.slot} ke kanan`}
                      onClick={() => fill(index, key)}
                    >
                      →
                    </button>
                  </td>
                ))}
              </tr>
            ))}
            <tr className="roh-netto-heading">
              <th>NETTO</th>
              {result.rows.map((row) => (
                <th key={row.slot}>NETTO</th>
              ))}
            </tr>
            {outputRows.map(({ label, value, digits }) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                {result.rows.map((row, index) => (
                  <td key={row.slot}>{fixed(value(index), digits)}</td>
                ))}
              </tr>
            ))}
            <tr className="roh-total-row">
              <th scope="row">Total Beban</th>
              {result.rows.map((row) => (
                <td key={row.slot}>{fixed(row.totalLoadMw, 0)}</td>
              ))}
            </tr>
            <tr className="roh-spacer-row" aria-hidden="true">
              <td colSpan={result.rows.length + 1} />
            </tr>
            {gasRows.map(({ label, value, digits }) => (
              <tr key={label} className="roh-gas-row">
                <th scope="row">{label}</th>
                {result.rows.map((row, index) => (
                  <td key={row.slot}>{fixed(value(index), digits)}</td>
                ))}
              </tr>
            ))}
            <tr className="roh-average-row">
              <th scope="row">Average perday PHE</th>
              <td colSpan={result.rows.length}>
                {fixed(result.averagePheBbtud)} BBTUD
              </td>
            </tr>
            <tr className="roh-average-row">
              <th scope="row">Average perday PGN</th>
              <td colSpan={result.rows.length}>
                {fixed(result.averagePgnBbtud)} BBTUD
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Module>
  );
}

function Nomination({ log }: { log: (a: string, d: string) => void }) {
  const [submissionDate, setSubmission] = useState("");
  const [effectiveDate, setEffective] = useState("");
  const [deliveryPoint, setDeliveryPoint] = useState(
    "STASIUN PENGUKUR GAS PLTGU CILEGON",
  );
  const [receiptPoint, setReceiptPoint] = useState("GUKUR GAS PLTGU CILEGON");
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
        deliveryPoint,
        receiptPoint,
        dailySwapBbtud,
        dailyStockBbtud,
        rows,
      }),
    [
      submissionDate,
      effectiveDate,
      deliveryPoint,
      receiptPoint,
      dailySwapBbtud,
      dailyStockBbtud,
      rows,
    ],
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
  const reset = () => {
    setSubmission("");
    setEffective("");
    setDeliveryPoint("STASIUN PENGUKUR GAS PLTGU CILEGON");
    setReceiptPoint("GUKUR GAS PLTGU CILEGON");
    setSwap(0);
    setStock(0);
    setRows(NOMINATION_SLOTS.map(() => ({ swapBbtud: 0, stockBbtud: 0 })));
    log("RESET", "Form nominasi PGN dikembalikan ke nilai awal");
  };
  const formatDate = (value: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    })
      .format(date)
      .replaceAll(" ", "-");
  };
  const data = [
    ["Date", formatDate(effectiveDate), "", ""],
    ["Jam", "SWAP LNG", "STOCK LNG PLN EPI", "Total Nominasi"],
    ...result.rows.map((r) => [
      r.slot,
      r.swapBbtud,
      r.stockBbtud,
      r.totalBbtud,
    ]),
    [
      "Average per Day",
      result.averageSwapBbtud,
      result.averageStockBbtud,
      result.averageTotalBbtud,
    ],
  ];
  return (
    <section className="module nomination-page">
      <div className="nomination-title">
        <span>FORMULIR NOMINASI GAS</span>
        <h2>NOMINASI PER HARI PGN</h2>
      </div>

      <div className="nomination-toolbar">
        <button onClick={() => log("RECALCULATE", "Nominasi dihitung ulang")}>
          Hitung Ulang
        </button>
        <button className="green" onClick={fill}>
          Isi Forecast dari Jumlah Harian
        </button>
        <button className="secondary" onClick={reset}>
          Reset
        </button>
        <button className="red" onClick={() => window.print()}>
          Cetak / Simpan PDF
        </button>
        <button
          className="green"
          onClick={() => exportRows("ADITYA_Nominasi_PGN", data, true)}
        >
          Download Excel
        </button>
      </div>

      <div className="nomination-layout">
        <section className="nomination-card nomination-details">
          <div className="nomination-field">
            <label htmlFor="nomination-submission">
              Tanggal Pengajuan Nominasi
            </label>
            <b>:</b>
            <input
              id="nomination-submission"
              type="datetime-local"
              value={submissionDate}
              onChange={(e) => setSubmission(e.target.value)}
            />
          </div>
          <div className="nomination-field">
            <label htmlFor="nomination-effective">
              Tanggal &amp; Waktu Efektif
            </label>
            <b>:</b>
            <input
              id="nomination-effective"
              type="datetime-local"
              value={effectiveDate}
              onChange={(e) => setEffective(e.target.value)}
            />
          </div>
          <div className="nomination-field">
            <label htmlFor="nomination-delivery">Titik Penyerahan</label>
            <b>:</b>
            <input
              id="nomination-delivery"
              value={deliveryPoint}
              onChange={(e) => setDeliveryPoint(e.target.value)}
            />
          </div>
          <div className="nomination-field">
            <label htmlFor="nomination-receipt">Receipt Point (BBTU)</label>
            <b>:</b>
            <input
              id="nomination-receipt"
              value={receiptPoint}
              onChange={(e) => setReceiptPoint(e.target.value)}
            />
          </div>
        </section>

        <section className="nomination-card nomination-section-row">
          <div className="nomination-section-label">Jumlah Nominasi Harian</div>
          <b>:</b>
          <div className="nomination-table-wrap daily">
            <table className="nomination-table daily-table">
              <thead>
                <tr>
                  <th>SWAP LNG</th>
                  <th>STOCK LNG PLN EPI</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <Input
                      value={dailySwapBbtud}
                      min={0}
                      onChange={(v) => setSwap(num(v))}
                    />
                  </td>
                  <td>
                    <Input
                      value={dailyStockBbtud}
                      min={0}
                      onChange={(v) => setStock(num(v))}
                    />
                  </td>
                  <td className="nomination-total">
                    {fixed(result.dailyTotalBbtud)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="nomination-card nomination-section-row forecast-card">
          <div className="nomination-section-label">
            Forecast (All unit in BBTUD)
          </div>
          <b>:</b>
          <div className="nomination-table-wrap">
            <table className="nomination-table forecast-table">
              <thead>
                <tr>
                  <th className="time-col">Date</th>
                  <th colSpan={3}>{formatDate(effectiveDate)}</th>
                </tr>
                <tr>
                  <th />
                  <th>SWAP LNG</th>
                  <th>STOCK LNG PLN EPI</th>
                  <th>Total</th>
                </tr>
                <tr>
                  <th />
                  <th>Nominasi</th>
                  <th>Nominasi</th>
                  <th>Total Nominasi</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r, i) => (
                  <tr key={r.slot}>
                    <td>{r.slot}</td>
                    <td>
                      <Input
                        value={r.swapBbtud}
                        min={0}
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
                        min={0}
                        onChange={(v) =>
                          setRows((x) =>
                            x.map((a, n) =>
                              n === i ? { ...a, stockBbtud: num(v) } : a,
                            ),
                          )
                        }
                      />
                    </td>
                    <td className="nomination-total">{fixed(r.totalBbtud)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th>Average per Day</th>
                  <th>{fixed(result.averageSwapBbtud)}</th>
                  <th>{fixed(result.averageStockBbtud)}</th>
                  <th>{fixed(result.averageTotalBbtud)}</th>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section className="nomination-card signature-card">
          <table className="nomination-table signature-table">
            <thead>
              <tr>
                <th colSpan={4}>PLN</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Name</th>
                <td />
                <td />
                <td />
              </tr>
              <tr>
                <th>Position</th>
                <td>Manager Operasi</td>
                <td />
                <td />
              </tr>
              <tr className="signature-space">
                <th>Sign</th>
                <td />
                <td />
                <td />
              </tr>
              <tr>
                <th>Date</th>
                <td>{formatDate(submissionDate)}</td>
                <td />
                <td />
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </section>
  );
}

function Evaluation({ log }: { log: (a: string, d: string) => void }) {
  const [history, setHistory] = useState(() =>
    read<EvaluationHistoryRecord[]>(HISTORY_KEY, []),
  );
  const [input, setInput] = useState<EvaluationInput>({
    operationDate: new Date().toISOString().slice(0, 16),
    mode: "COMBINED",
    loadMw: 230,
    fgcCount: 3,
    predictedGasBbtud: 58,
    actualGasBbtud: 59,
  });
  const [toleranceMw, setToleranceMw] = useState(10);
  const [minimumSamples, setMinimumSamples] = useState(3);
  const result = useMemo(() => calculateLegacyEvaluation(input), [input]);
  const learning = useMemo(
    () => calculateLearning(history, input, toleranceMw),
    [history, input, toleranceMw],
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
  const clearHistory = () => {
    if (!window.confirm("Hapus seluruh riwayat evaluasi dan learning?")) return;
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
    log("CLEAR", "Seluruh histori evaluasi dihapus");
  };
  const loadDemo = () => {
    const samples = [
      [220, 3, 55.4, 57.1],
      [226, 3, 56.8, 58.2],
      [232, 3, 58.1, 59.4],
      [236, 3, 59.2, 60.1],
      [241, 3, 60.4, 61.8],
    ] as const;
    const demo = samples.map(
      ([loadMw, fgcCount, predictedGasBbtud, actualGasBbtud], index) => {
        const demoInput: EvaluationInput = {
          operationDate: new Date(Date.now() - (index + 1) * 86400000)
            .toISOString()
            .slice(0, 16),
          mode: "COMBINED",
          loadMw,
          fgcCount,
          predictedGasBbtud,
          actualGasBbtud,
          predictedNetMw: loadMw,
          actualNetMw: loadMw,
          predictionSource: { type: "MANUAL" },
        };
        return {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          input: demoInput,
          result: calculateLegacyEvaluation(demoInput),
        };
      },
    );
    const next = [...demo, ...history];
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    log("LOAD_DEMO", "5 contoh historical learning ditambahkan");
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
  const fields: Array<[string, keyof EvaluationInput]> = [
    ["Beban / Load Referensi (MW)", "loadMw"],
    ["Jumlah FGC", "fgcCount"],
    ["Prediksi Total Gas ADITYA (BBTUD)", "predictedGasBbtud"],
    ["Realisasi Total Gas (BBTUD)", "actualGasBbtud"],
    ["Prediksi PHE (BBTUD)", "predictedPheBbtud"],
    ["Realisasi PHE (BBTUD)", "actualPheBbtud"],
    ["Prediksi PGN (BBTUD)", "predictedPgnBbtud"],
    ["Realisasi PGN (BBTUD)", "actualPgnBbtud"],
    ["Prediksi Total Netto (MW)", "predictedNetMw"],
    ["Realisasi Total Netto (MW)", "actualNetMw"],
  ];
  return (
    <section className="evaluation-page">
      <div className="evaluation-heading">
        <h2>EVALUASI &amp; LEARNING</h2>
        <p>
          Historical Feedback &amp; Calibration untuk meningkatkan kualitas
          simulasi kebutuhan energi primer
        </p>
      </div>
      <div className="evaluation-banner">
        <strong>Konsep learning:</strong> ADITYA membandingkan hasil prediksi
        dengan realisasi operasi, menyimpan histori deviasi, lalu menghitung{" "}
        <em>correction factor</em> dari kondisi operasi serupa. Fitur ini
        merupakan <strong>historical feedback learning</strong>, bukan
        Artificial Intelligence / Machine Learning.
      </div>
      <div className="evaluation-top-grid">
        <section className="evaluation-card">
          <h3>
            <span>1</span> Data Evaluasi
          </h3>
          <div className="evaluation-form">
            <label>
              Tanggal Evaluasi
              <input
                type="datetime-local"
                value={input.operationDate}
                onChange={(e) => set("operationDate", e.target.value)}
              />
            </label>
            <label>
              Mode Operasi
              <select
                value={input.mode}
                onChange={(e) => set("mode", e.target.value)}
              >
                <option value="COMBINED">Combined Cycle</option>
                <option value="OPEN">Open Cycle</option>
              </select>
            </label>
            {fields.map(([label, key]) => (
              <label key={key}>
                {label}
                <Input
                  value={(input[key] as number | undefined) ?? ""}
                  min={0}
                  onChange={(v) =>
                    set(
                      key,
                      v === "" ? (undefined as unknown as number) : num(v),
                    )
                  }
                />
              </label>
            ))}
          </div>
          <div className="evaluation-toolbar">
            <button
              className="secondary"
              onClick={() =>
                log("TAKE_GAS_MIX", "Permintaan hasil Gas Mix dicatat")
              }
            >
              Ambil Hasil Gas Mix
            </button>
            <button onClick={() => log("CALCULATE", "Evaluasi dihitung ulang")}>
              Hitung Evaluasi
            </button>
            <button className="green" onClick={save}>
              Simpan ke Riwayat
            </button>
          </div>
        </section>
        <section className="evaluation-card evaluation-result">
          <h3>
            <span>2</span> Hasil Evaluasi
          </h3>
          <Kpis
            items={[
              ["Deviasi Total Gas", `${fixed(result.deviationPercent)}%`],
              ["Tingkat Kesesuaian", `${fixed(result.accuracyPercent)}%`],
              ["Correction Factor", fixed(result.correctionFactor, 4)],
              ["Selisih Absolut", `${fixed(result.absoluteErrorBbtud)} BBTUD`],
            ]}
          />
          <div className="evaluation-note">
            Prediksi {fixed(input.predictedGasBbtud)} BBTUD dibandingkan
            realisasi {fixed(input.actualGasBbtud)} BBTUD menghasilkan bias{" "}
            <strong>{fixed(result.signedBiasPercent)}%</strong>.
          </div>
        </section>
      </div>
      <section className="evaluation-card learning-card">
        <h3>
          <span>3</span> Historical Learning &amp; Calibration
        </h3>
        <div className="learning-controls">
          <label>
            Toleransi Beban Serupa (± MW)
            <Input
              value={toleranceMw}
              min={1}
              onChange={(v) => setToleranceMw(Math.max(1, num(v)))}
            />
          </label>
          <label>
            Minimal Sampel Direkomendasikan
            <Input
              value={minimumSamples}
              min={1}
              onChange={(v) => setMinimumSamples(Math.max(1, num(v)))}
            />
          </label>
          <div>
            <b>Basis Learning</b>
            <p className="evaluation-note">
              Mode {input.mode}, {input.fgcCount} FGC, toleransi ±{toleranceMw}{" "}
              MW.
            </p>
          </div>
        </div>
        <Kpis
          items={[
            ["Jumlah Sampel", String(learning.sampleCount)],
            [
              "Rata-rata Deviasi",
              learning.averageDeviationPercent == null
                ? "–"
                : `${fixed(learning.averageDeviationPercent)}%`,
            ],
            ["Learning Factor", fixed(learning.learningFactor, 4)],
            [
              "Rekomendasi Total Gas",
              learning.recommendedGasBbtud == null
                ? "–"
                : `${fixed(learning.recommendedGasBbtud)} BBTUD`,
            ],
          ]}
        />
        <div className="evaluation-note">
          {learning.sampleCount === 0
            ? "Belum ada data histori. Simpan evaluasi untuk membentuk learning factor."
            : learning.sampleCount < minimumSamples
              ? `Baru tersedia ${learning.sampleCount} sampel. Tambahkan minimal ${minimumSamples} sampel kondisi serupa.`
              : `Learning menggunakan ${learning.sampleCount} sampel dengan tingkat keyakinan ${learning.confidence}.`}
        </div>
      </section>
      <section className="evaluation-card history-card">
        <h3>
          <span>4</span> Riwayat Evaluasi
        </h3>
        <div className="evaluation-toolbar">
          <button
            className="green"
            onClick={() => exportRows("ADITYA_Evaluasi_Learning", rows)}
          >
            Download CSV
          </button>
          <button className="secondary" onClick={loadDemo}>
            Isi Contoh Learning
          </button>
          <button className="red" onClick={clearHistory}>
            Hapus Semua Riwayat
          </button>
        </div>
        <div className="table-wrap evaluation-table">
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
              {history.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty-cell">
                    Belum ada data evaluasi.
                  </td>
                </tr>
              )}
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
        <p className="evaluation-footer-hint">
          Riwayat pada versi ini disimpan di{" "}
          <strong>browser/perangkat lokal</strong>. Untuk implementasi SSOT
          korporat, penyimpanan perlu dipindahkan ke database/server terpusat.
        </p>
      </section>
    </section>
  );
}

const TANK_STATUS_LABELS = {
  NORMAL: "NORMAL",
  NWL: "NORMAL WATER LEVEL",
  HIGH: "LEVEL TINGGI",
  WARNING: "MENDEKATI OVERFLOW",
  CRITICAL: "OVERFLOW / KRITIS",
} as const;

function TankCalculator({ log }: { log: (a: string, d: string) => void }) {
  const [tankCode, setTankCode] = useState<TankCode>("RWT");
  const [inputType, setInputType] = useState<TankInputType>("LEVEL");
  const [value, setValue] = useState("");
  const definition = useMemo(
    () => getLegacyTankDefinition(tankCode),
    [tankCode],
  );
  const numericValue = Number(value);
  const hasValue = value.trim() !== "" && Number.isFinite(numericValue);
  const result = useMemo(
    () =>
      hasValue
        ? calculateLegacyTank({
            tankCode,
            inputType,
            value: Math.max(0, numericValue),
          })
        : null,
    [hasValue, inputType, numericValue, tankCode],
  );
  const indicatorPercent = Math.max(0, Math.min(100, result?.oflPercent ?? 0));
  const reset = () => {
    setValue("");
    log("RESET_TANK", `${tankCode} calculator direset`);
  };
  const changeTank = (next: TankCode) => {
    setTankCode(next);
    setValue("");
  };
  const changeInputType = (next: TankInputType) => {
    setInputType(next);
    setValue("");
  };
  return (
    <Module title="Kalkulator Tanki">
      <p className="tank-subtitle">RWT &amp; MWT Level–Volume Conversion</p>
      <div className="tank-layout">
        <section className="tank-calculator-card">
          <h3>Input Utama</h3>
          <div className="tank-controls">
            <label>
              Pilih Tanki
              <select
                value={tankCode}
                onChange={(event) => changeTank(event.target.value as TankCode)}
              >
                <option value="RWT">RWT - Raw Water Tank</option>
                <option value="MWT">MWT - Make-up Water Tank</option>
              </select>
            </label>
            <label>
              Pilih Jenis Input
              <select
                value={inputType}
                onChange={(event) =>
                  changeInputType(event.target.value as TankInputType)
                }
              >
                <option value="LEVEL">Level (m)</option>
                <option value="VOLUME">Volume (m³)</option>
              </select>
            </label>
            <label>
              Masukkan Nilai{" "}
              {inputType === "LEVEL" ? "Level (m)" : "Volume (m³)"}
              <input
                type="number"
                min="0"
                step="any"
                value={value}
                placeholder={
                  inputType === "LEVEL"
                    ? `Contoh: ${definition.nwlM}`
                    : `Contoh: ${definition.capacityNwlM3}`
                }
                onChange={(event) => setValue(event.target.value)}
              />
            </label>
          </div>
          <div className="tank-reset-row">
            <button onClick={reset}>Reset</button>
          </div>
          <div
            className={`tank-status ${result ? `status-${result.status.toLowerCase()}` : ""}`}
          >
            Status Tanki: {result ? TANK_STATUS_LABELS[result.status] : "–"}
          </div>
          {result?.overflowWarning && (
            <p className="tank-overflow" role="alert">
              Level telah mencapai atau melewati OFL {fixed(definition.oflM, 3)}{" "}
              m. Segera periksa kondisi tanki.
            </p>
          )}
          <div className="tank-results">
            {[
              ["Level", result ? fixed(result.levelM, 3) : "–", "m"],
              ["Level", result ? fixed(result.levelMm, 0) : "–", "mm"],
              ["Volume", result ? fixed(result.volumeM3, 2) : "–", "m³"],
              ["Volume", result ? fixed(result.volumeLiter, 0) : "–", "liter"],
              [
                "Kapasitas",
                result ? fixed(result.capacityPercent, 2) : "–",
                "%",
              ],
            ].map(([label, output, unit]) => (
              <article key={`${label}-${unit}`}>
                <span>{label}</span>
                <strong>{output}</strong>
                <small>{unit}</small>
              </article>
            ))}
          </div>
          <div className="tank-capacity">
            <strong>Nominal Capacity</strong>
            <span>{definition.capacityNwlM3.toLocaleString("id-ID")} m³</span>
            <span>·</span>
            <span>Factor {fixed(definition.factorM3PerM, 3)} m³/m</span>
          </div>
        </section>
        <aside className="tank-indicator-card">
          <h3>Tank Level Indicator</h3>
          <div className="tank-scale">
            <span>0 m</span>
            <span>OFL {fixed(definition.oflM, 3)} m</span>
          </div>
          <div className="tank-gauge">
            <div
              className={`tank-liquid ${result ? `status-${result.status.toLowerCase()}` : ""}`}
              style={{ height: `${indicatorPercent}%` }}
            />
            <span className="tank-marker marker-ofl" style={{ bottom: "100%" }}>
              OFL
            </span>
            <span
              className="tank-marker marker-hwi"
              style={{
                bottom: `${(definition.hwiM / definition.oflM) * 100}%`,
              }}
            >
              HWI
            </span>
            <span
              className="tank-marker marker-nwl"
              style={{
                bottom: `${(definition.nwlM / definition.oflM) * 100}%`,
              }}
            >
              NWL
            </span>
          </div>
          <p>
            {result
              ? `${fixed(result.levelM, 3)} m · ${fixed(result.oflPercent, 1)}% dari OFL`
              : "Masukkan nilai untuk melihat level tanki."}
          </p>
          <dl className="tank-thresholds">
            <div>
              <dt>NWL</dt>
              <dd>{fixed(definition.nwlM, 3)} m</dd>
            </div>
            <div>
              <dt>HWI</dt>
              <dd>{fixed(definition.hwiM, 3)} m</dd>
            </div>
            <div>
              <dt>OFL</dt>
              <dd>{fixed(definition.oflM, 3)} m</dd>
            </div>
          </dl>
        </aside>
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
    <Module title="Activity Log">
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    read("aditya-sidebar-collapsed", false),
  );
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
    <div
      className={`app-layout ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
    >
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark">A</span>
          <div className="sidebar-copy">
            <strong>ADITYA</strong>
            <small>PLTGU CILEGON</small>
          </div>
        </div>
        <button
          className="sidebar-toggle"
          aria-label={
            sidebarCollapsed ? "Perbesar sidebar" : "Minimalkan sidebar"
          }
          title={sidebarCollapsed ? "Perbesar sidebar" : "Minimalkan sidebar"}
          onClick={() =>
            setSidebarCollapsed((old) => {
              localStorage.setItem(
                "aditya-sidebar-collapsed",
                JSON.stringify(!old),
              );
              return !old;
            })
          }
        >
          <span>‹</span>
        </button>
        <nav className="sidebar-nav" aria-label="Shortcut workspace">
          <a href="/" className={!page ? "active" : ""} title="Beranda">
            <span className="nav-icon">⌂</span>
            <span className="nav-label">Beranda</span>
          </a>
          {WORKSPACES.map((workspace, index) => (
            <a
              href={`/workspace/${workspace.id}`}
              className={page === workspace.id ? "active" : ""}
              title={workspace.label}
              key={workspace.id}
            >
              <span className="nav-icon">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="nav-label">{workspace.label}</span>
            </a>
          ))}
        </nav>
      </aside>
      <div className="app-shell">
        <header>
          <div>
            <span className="eyebrow">PLTGU CILEGON</span>
            <h1>ADITYA</h1>
            <p>Decision support workspace</p>
          </div>
          {page && (
            <span className="current-workspace">
              {WORKSPACES.find((item) => item.id === page)?.label}
            </span>
          )}
        </header>
        <main>
          {!page && (
            <section className="landing">
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
          {page === "gas-mix" && <GasMix log={addLog} />}
          {page === "simulation" && <Simulation log={addLog} />}
          {page === "roh" && <Roh log={addLog} />}
          {page === "nomination" && <Nomination log={addLog} />}
          {page === "evaluation" && <Evaluation log={addLog} />}
          {page === "tank" && <TankCalculator log={addLog} />}
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
        <footer>ADITYA - 2026 - PLN INDONESIA POWER UBP CILEGON</footer>
      </div>
    </div>
  );
}

export default App;
