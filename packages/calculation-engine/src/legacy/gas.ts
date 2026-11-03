export type FgcCount = 0 | 1 | 2 | 3 | 4;

export interface LegacyGasMixResult {
  totalGasBbtud: number;
  pheBbtud: number;
  pgnBbtud: number;
  gtNetMw: number;
  stNetMw: number;
  totalNetMw: number;
}

const PGN_ENERGY_BY_FGC: Readonly<Record<FgcCount, number>> = {
  0: 0,
  1: 14.67,
  2: 28.118,
  3: 41.938,
  4: 53.874,
};

/** Characterization of the current HTML baseline; not an approved engineering formula. */
export function calculateLegacyGasTotal(loadMw: number): number {
  if (!Number.isFinite(loadMw)) {
    throw new TypeError("loadMw harus berupa angka finite");
  }

  return 0.00008 * loadMw ** 2 + 0.1785 * loadMw + 13.409;
}

/** Characterization of the current HTML baseline; not an approved engineering formula. */
export function getLegacyPgnEnergy(fgcCount: FgcCount): number {
  return PGN_ENERGY_BY_FGC[fgcCount];
}

/** Characterization of the current HTML baseline; not an approved engineering formula. */
export function calculateLegacyGasMix(
  loadMw: number,
  fgcCount: FgcCount,
): LegacyGasMixResult {
  const totalGasBbtud = calculateLegacyGasTotal(loadMw);
  const pgnBbtud = getLegacyPgnEnergy(fgcCount);
  const gtNetMw = loadMw - 8;
  const stNetMw = 0.4639 * loadMw + 10.283;

  return {
    totalGasBbtud,
    pheBbtud: totalGasBbtud - pgnBbtud,
    pgnBbtud,
    gtNetMw,
    stNetMw,
    totalNetMw: gtNetMw + stNetMw,
  };
}
