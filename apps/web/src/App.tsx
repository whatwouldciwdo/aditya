import { useMemo, useState, type FormEvent } from "react";
import {
  calculateLegacyEvaluation,
  calculateLegacyGasMix,
  calculateLegacyTank,
  getLegacyTankDefinition,
  LEGACY_FORMULA_VERSION,
  type FgcCount,
} from "@aditya/calculation-engine";
import type {
  EvaluationInput,
  EvaluationResult,
  GasMixResult,
  TankCalculationResult,
  TankCode,
  TankInputType,
} from "@aditya/shared-types";
import {
  evaluationInputSchema,
  gasMixInputSchema,
  tankCalculationInputSchema,
} from "@aditya/validation";

const modules = [
  "Gas Mix",
  "RWT & MWT",
  "Simulasi Energi",
  "ROH",
  "Nominasi PGN",
  "Evaluasi",
];

const numberFormat = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type ResultMetric = readonly [
  label: string,
  value: number | undefined,
  unit: string,
];

function fieldNumber(value: string): number {
  return value.trim() === "" ? Number.NaN : Number(value);
}

function calculateLocally(loadValue: string, fgcValue: string) {
  const parsed = gasMixInputSchema.safeParse({
    loadMw: fieldNumber(loadValue),
    fgcCount: fieldNumber(fgcValue),
  });
  if (!parsed.success) return null;

  return {
    input: parsed.data,
    ...calculateLegacyGasMix(
      parsed.data.loadMw,
      parsed.data.fgcCount as FgcCount,
    ),
    formulaVersion: LEGACY_FORMULA_VERSION,
  } satisfies GasMixResult;
}

export function App() {
  const [loadMw, setLoadMw] = useState("100");
  const [fgcCount, setFgcCount] = useState("2");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverResult, setServerResult] = useState<GasMixResult | null>(null);
  const [requestState, setRequestState] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [operationDate, setOperationDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [mode, setMode] = useState<"OPEN" | "COMBINED">("COMBINED");
  const [actualGas, setActualGas] = useState("");
  const [evaluationResult, setEvaluationResult] =
    useState<EvaluationResult | null>(null);
  const [evaluationErrors, setEvaluationErrors] = useState<
    Record<string, string>
  >({});
  const [tankCode, setTankCode] = useState<TankCode>("RWT");
  const [tankInputType, setTankInputType] = useState<TankInputType>("LEVEL");
  const [tankValue, setTankValue] = useState("");
  const [tankError, setTankError] = useState("");
  const tankDefinition = getLegacyTankDefinition(tankCode);
  const tankResult = useMemo<TankCalculationResult | null>(() => {
    const parsed = tankCalculationInputSchema.safeParse({
      tankCode,
      inputType: tankInputType,
      value: fieldNumber(tankValue),
    });
    return parsed.success ? calculateLegacyTank(parsed.data) : null;
  }, [tankCode, tankInputType, tankValue]);
  const liveResult = useMemo(
    () => calculateLocally(loadMw, fgcCount),
    [loadMw, fgcCount],
  );
  const result = serverResult ?? liveResult;
  const resultMetrics: ResultMetric[] = [
    ["Total Gas Mix", result?.totalGasBbtud, "BBTUD"],
    ["Energi PHE", result?.pheBbtud, "BBTUD"],
    ["Energi PGN", result?.pgnBbtud, "BBTUD"],
    ["GT Netto", result?.gtNetMw, "MW"],
    ["ST Netto", result?.stNetMw, "MW"],
    ["Total Netto", result?.totalNetMw, "MW"],
  ];

  function validate() {
    const parsed = gasMixInputSchema.safeParse({
      loadMw: fieldNumber(loadMw),
      fgcCount: fieldNumber(fgcCount),
    });
    if (parsed.success) {
      setErrors({});
      return parsed.data;
    }
    setErrors(
      Object.fromEntries(
        parsed.error.issues.map(
          (issue: { path: readonly PropertyKey[]; message: string }) => [
            String(issue.path[0]),
            issue.message,
          ],
        ),
      ),
    );
    return null;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = validate();
    if (!input) return;
    setRequestState("loading");
    try {
      const response = await fetch("/api/calculations/gas-mix", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error("Request gagal");
      setServerResult((await response.json()) as GasMixResult);
      setRequestState("idle");
    } catch {
      setRequestState("error");
    }
  }

  function sendToEvaluation() {
    if (!result) return;
    setServerResult(result);
    setEvaluationResult(null);
    setEvaluationErrors({});
    document
      .getElementById("evaluation")
      ?.scrollIntoView({ behavior: "smooth" });
  }

  function evaluate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!result) return;
    const input = {
      operationDate,
      mode,
      loadMw: result.input.loadMw,
      fgcCount: result.input.fgcCount,
      predictedGasBbtud: result.totalGasBbtud,
      actualGasBbtud: fieldNumber(actualGas),
      predictedPheBbtud: result.pheBbtud,
      predictedPgnBbtud: result.pgnBbtud,
      predictedNetMw: result.totalNetMw,
      predictionSource: {
        type: "GAS_MIX" as const,
        formulaVersion: result.formulaVersion,
      },
    };
    const parsed = evaluationInputSchema.safeParse(input);
    if (!parsed.success) {
      setEvaluationErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [
            String(issue.path[0]),
            issue.message,
          ]),
        ),
      );
      setEvaluationResult(null);
      return;
    }
    setEvaluationErrors({});
    const evaluationInput: EvaluationInput = {
      operationDate: parsed.data.operationDate,
      mode: parsed.data.mode,
      loadMw: parsed.data.loadMw,
      fgcCount: parsed.data.fgcCount,
      predictedGasBbtud: parsed.data.predictedGasBbtud,
      actualGasBbtud: parsed.data.actualGasBbtud,
    };
    const optionalKeys = [
      "predictedPheBbtud",
      "actualPheBbtud",
      "predictedPgnBbtud",
      "actualPgnBbtud",
      "predictedNetMw",
      "actualNetMw",
      "predictionSource",
    ] as const;
    for (const key of optionalKeys) {
      const value = parsed.data[key];
      if (value !== undefined) {
        Object.assign(evaluationInput, { [key]: value });
      }
    }
    setEvaluationResult(calculateLegacyEvaluation(evaluationInput));
  }

  function validateTank() {
    if (tankValue.trim() === "") {
      setTankError("");
      return;
    }
    const parsed = tankCalculationInputSchema.safeParse({
      tankCode,
      inputType: tankInputType,
      value: fieldNumber(tankValue),
    });
    setTankError(parsed.success ? "" : (parsed.error.issues[0]?.message ?? ""));
  }

  function resetTank() {
    setTankCode("RWT");
    setTankInputType("LEVEL");
    setTankValue("");
    setTankError("");
  }

  return (
    <div className="app-shell">
      <header>
        <div>
          <span className="eyebrow">PLTGU CILEGON</span>
          <h1>ADITYA</h1>
          <p>Advanced Digital Integrated Turbine &amp; Energy Analytics</p>
        </div>
        <nav aria-label="Navigasi utama">
          <a href="#gas-mix">Kalkulator</a>
          <a href="#tank">Tanki</a>
          <a href="#evaluation">Evaluasi</a>
          <a href="#modules">Modul</a>
        </nav>
      </header>
      <main>
        <section className="hero" id="gas-mix">
          <div>
            <span className="eyebrow">KALKULATOR GAS MIX</span>
            <h2>Hitung kebutuhan gas dan output netto</h2>
            <p>
              Kalkulasi real-time berdasarkan karakterisasi prototipe. Formula
              ini belum dianggap resmi sebelum validasi Engineer.
            </p>
          </div>
          <div className="formula-badge">
            <span>Versi formula</span>
            <strong>{LEGACY_FORMULA_VERSION}</strong>
          </div>
        </section>

        <section id="tank" aria-labelledby="tank-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">RWT &amp; MWT TANK CALCULATOR</span>
              <h2 id="tank-title">Konversi level dan volume tanki</h2>
            </div>
            <span className="muted">
              Parameter {tankDefinition.parameterVersion}
            </span>
          </div>
          <div className="calculator-layout tank-layout">
            <form
              className="calculator-form"
              onSubmit={(event) => {
                event.preventDefault();
                validateTank();
              }}
              noValidate
            >
              <label htmlFor="tank-code">Jenis tanki</label>
              <select
                id="tank-code"
                value={tankCode}
                onChange={(event) => {
                  setTankCode(event.target.value as TankCode);
                  setTankError("");
                }}
              >
                <option value="RWT">RWT — Raw Water Tank</option>
                <option value="MWT">MWT — Make-up Water Tank</option>
              </select>
              <label htmlFor="tank-input-type">Jenis input</label>
              <select
                id="tank-input-type"
                value={tankInputType}
                onChange={(event) => {
                  setTankInputType(event.target.value as TankInputType);
                  setTankError("");
                }}
              >
                <option value="LEVEL">Level (m)</option>
                <option value="VOLUME">Volume (m³)</option>
              </select>
              <label htmlFor="tank-value">
                Nilai {tankInputType === "LEVEL" ? "level" : "volume"}{" "}
                <span>{tankInputType === "LEVEL" ? "m" : "m³"}</span>
              </label>
              <input
                id="tank-value"
                type="number"
                min="0"
                step={tankInputType === "LEVEL" ? "0.001" : "0.01"}
                value={tankValue}
                onChange={(event) => {
                  setTankValue(event.target.value);
                  setTankError("");
                }}
                onBlur={validateTank}
                aria-invalid={Boolean(tankError)}
              />
              {tankError && <p className="field-error">{tankError}</p>}
              <div className="form-actions">
                <button type="submit">Hitung</button>
                <button
                  type="button"
                  className="reset-action"
                  onClick={resetTank}
                >
                  Reset
                </button>
              </div>
            </form>
            <div className="result-panel" aria-live="polite">
              <div className="tank-markers">
                <span>NWL {numberFormat.format(tankDefinition.nwlM)} m</span>
                <span>HWI {numberFormat.format(tankDefinition.hwiM)} m</span>
                <span>OFL {numberFormat.format(tankDefinition.oflM)} m</span>
              </div>
              <div
                className="tank-gauge"
                aria-label="Posisi level terhadap OFL"
              >
                <span
                  className={`tank-gauge-fill ${tankResult?.status.toLowerCase() ?? "normal"}`}
                  style={{
                    width: `${Math.min(100, Math.max(0, tankResult?.oflPercent ?? 0))}%`,
                  }}
                />
              </div>
              <div className="result-grid tank-metrics">
                {(
                  [
                    ["Level", tankResult?.levelM, "m"],
                    ["Level", tankResult?.levelMm, "mm"],
                    ["Volume", tankResult?.volumeM3, "m³"],
                    ["Volume", tankResult?.volumeLiter, "liter"],
                    ["Kapasitas NWL", tankResult?.capacityPercent, "%"],
                  ] as ResultMetric[]
                ).map(([label, value, unit]) => (
                  <article key={`${label}-${unit}`}>
                    <span>{label}</span>
                    <strong>
                      {value === undefined ? "—" : numberFormat.format(value)}
                    </strong>
                    <small>{unit}</small>
                  </article>
                ))}
              </div>
              <p
                className={`tank-status ${tankResult?.status.toLowerCase() ?? "idle"}`}
              >
                Status: {tankResult?.status ?? "—"}
              </p>
              {tankResult?.overflowWarning && (
                <p className="overflow-warning" role="alert">
                  Peringatan: level mencapai atau melebihi OFL{" "}
                  {numberFormat.format(tankDefinition.oflM)} m. Risiko overflow.
                </p>
              )}
            </div>
          </div>
        </section>

        <section
          className="calculator-layout"
          aria-labelledby="calculator-title"
        >
          <form className="calculator-form" onSubmit={submit} noValidate>
            <div className="section-heading compact">
              <div>
                <span className="eyebrow">INPUT</span>
                <h2 id="calculator-title">Parameter operasi</h2>
              </div>
            </div>
            <label htmlFor="load-mw">
              Load turbin <span>MW</span>
            </label>
            <input
              id="load-mw"
              type="number"
              min="0"
              step="0.01"
              value={loadMw}
              onChange={(event) => {
                setLoadMw(event.target.value);
                setServerResult(null);
              }}
              onBlur={validate}
              aria-invalid={Boolean(errors.loadMw)}
              aria-describedby={errors.loadMw ? "load-error" : undefined}
            />
            {errors.loadMw && (
              <p className="field-error" id="load-error" role="alert">
                {errors.loadMw}
              </p>
            )}
            <label htmlFor="fgc-count">
              Jumlah FGC <span>unit (0–4)</span>
            </label>
            <input
              id="fgc-count"
              type="number"
              min="0"
              max="4"
              step="1"
              value={fgcCount}
              onChange={(event) => {
                setFgcCount(event.target.value);
                setServerResult(null);
              }}
              onBlur={validate}
              aria-invalid={Boolean(errors.fgcCount)}
              aria-describedby={errors.fgcCount ? "fgc-error" : undefined}
            />
            {errors.fgcCount && (
              <p className="field-error" id="fgc-error" role="alert">
                {errors.fgcCount}
              </p>
            )}
            <button type="submit" disabled={requestState === "loading"}>
              {requestState === "loading" ? "Menghitung…" : "Hitung di server"}
            </button>
            {requestState === "error" && (
              <p className="request-error" role="alert">
                Server tidak dapat dijangkau. Hasil real-time lokal tetap
                tersedia untuk pratinjau.
              </p>
            )}
          </form>

          <div className="result-panel" aria-live="polite">
            <div className="section-heading compact">
              <div>
                <span className="eyebrow">HASIL REAL-TIME</span>
                <h2>Ringkasan kalkulasi</h2>
              </div>
              <span
                className={result ? "result-status valid" : "result-status"}
              >
                {result ? "Input valid" : "Menunggu input valid"}
              </span>
            </div>
            <div className="result-grid">
              {resultMetrics.map(([label, value, unit]) => (
                <article key={label}>
                  <span>{label}</span>
                  <strong>
                    {typeof value === "number"
                      ? numberFormat.format(value)
                      : "—"}
                  </strong>
                  <small>{unit}</small>
                </article>
              ))}
            </div>
            <button
              className="secondary-action"
              type="button"
              onClick={sendToEvaluation}
              disabled={!result}
            >
              Kirim hasil ke Evaluasi
            </button>
          </div>
        </section>

        <section id="evaluation" aria-labelledby="evaluation-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">EVALUASI PREDIKSI</span>
              <h2 id="evaluation-title">Prediksi vs realisasi gas</h2>
            </div>
            <span className="muted">Sumber: hasil Gas Mix aktif</span>
          </div>
          <div className="calculator-layout evaluation-layout">
            <form className="calculator-form" onSubmit={evaluate} noValidate>
              <label htmlFor="operation-date">Tanggal operasi</label>
              <input
                id="operation-date"
                type="date"
                value={operationDate}
                onChange={(event) => setOperationDate(event.target.value)}
              />
              <label htmlFor="operation-mode">Mode operasi</label>
              <select
                id="operation-mode"
                value={mode}
                onChange={(event) =>
                  setMode(event.target.value as "OPEN" | "COMBINED")
                }
              >
                <option value="COMBINED">Combined Cycle</option>
                <option value="OPEN">Open Cycle</option>
              </select>
              <label htmlFor="predicted-gas">
                Prediksi total gas <span>BBTUD</span>
              </label>
              <input
                id="predicted-gas"
                value={result ? String(result.totalGasBbtud) : ""}
                readOnly
              />
              <label htmlFor="actual-gas">
                Realisasi total gas <span>BBTUD</span>
              </label>
              <input
                id="actual-gas"
                type="number"
                min="0"
                step="0.001"
                value={actualGas}
                onChange={(event) => setActualGas(event.target.value)}
                aria-invalid={Boolean(evaluationErrors.actualGasBbtud)}
              />
              {evaluationErrors.actualGasBbtud && (
                <p className="field-error" role="alert">
                  {evaluationErrors.actualGasBbtud}
                </p>
              )}
              {!result && (
                <p className="request-error">
                  Isi Gas Mix valid terlebih dahulu.
                </p>
              )}
              <button type="submit" disabled={!result}>
                Hitung evaluasi
              </button>
            </form>
            <div className="result-panel">
              <div className="result-grid evaluation-metrics">
                {(
                  [
                    [
                      "Selisih absolut",
                      evaluationResult?.absoluteErrorBbtud,
                      "BBTUD",
                    ],
                    ["Deviasi", evaluationResult?.deviationPercent, "%"],
                    [
                      "Tingkat kesesuaian",
                      evaluationResult?.accuracyPercent,
                      "%",
                    ],
                    [
                      "Correction factor",
                      evaluationResult?.correctionFactor,
                      "rasio",
                    ],
                    ["Signed bias", evaluationResult?.signedBiasPercent, "%"],
                  ] as ResultMetric[]
                ).map(([label, value, unit]) => (
                  <article key={label}>
                    <span>{label}</span>
                    <strong>
                      {typeof value === "number"
                        ? numberFormat.format(value)
                        : "—"}
                    </strong>
                    <small>{unit}</small>
                  </article>
                ))}
              </div>
              <p className="source-note">
                Referensi prediksi:{" "}
                {result
                  ? `Gas Mix · ${result.formulaVersion}`
                  : "belum tersedia"}
                . Hasil tahap ini belum disimpan ke server.
              </p>
            </div>
          </div>
        </section>

        <section id="modules" aria-labelledby="module-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">ROADMAP MODUL</span>
              <h2 id="module-title">Workspace operasional</h2>
            </div>
            <span className="muted">Implementasi PRD bertahap</span>
          </div>
          <div className="module-grid">
            {modules.map((name, index) => (
              <article
                key={name}
                className={
                  index === 0 || index === 1 || index === 5
                    ? "active-module"
                    : ""
                }
              >
                <span className="number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{name}</h3>
                <p>
                  {index === 0
                    ? "GAS-01 hingga GAS-05 tersedia untuk pengujian awal."
                    : index === 1
                      ? "TANK-01 hingga TANK-06 tersedia untuk konversi dan monitoring batas."
                      : index === 5
                        ? "EVAL-01 hingga EVAL-04 tersedia untuk evaluasi interaktif."
                        : "Fondasi modul siap untuk implementasi requirement berikutnya."}
                </p>
                <span className="coming">
                  {index === 0 || index === 1 || index === 5
                    ? "Tahap aktif"
                    : "Dalam pengembangan"}
                </span>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer>ADITYA Credits 2026</footer>
    </div>
  );
}
