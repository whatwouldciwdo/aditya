export type FgcCount = 0 | 1 | 2 | 3 | 4;

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
