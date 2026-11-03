export const LEGACY_TANK_DEFINITIONS = {
  RWT: {
    nwl: 11.295,
    hwi: 11.395,
    ofl: 11.445,
    capacityNwl: 5500,
    factorM: 486.941,
  },
  MWT: {
    nwl: 14.967,
    hwi: 15.067,
    ofl: 15.117,
    capacityNwl: 2500,
    factorM: 167.034,
  },
} as const;

export type LegacyTankCode = keyof typeof LEGACY_TANK_DEFINITIONS;
export type LegacyTankStatus =
  "NORMAL" | "NWL" | "HIGH" | "WARNING" | "CRITICAL";

/** Characterization of status boundaries in the current HTML baseline. */
export function getLegacyTankStatus(
  code: LegacyTankCode,
  level: number,
): LegacyTankStatus {
  const tank = LEGACY_TANK_DEFINITIONS[code];

  if (!Number.isFinite(level))
    throw new TypeError("level harus berupa angka finite");
  if (level >= tank.ofl) return "CRITICAL";
  if (level > tank.hwi) return "WARNING";
  if (level >= tank.nwl + 0.005) return "HIGH";
  if (Math.abs(level - tank.nwl) <= 0.005) return "NWL";
  return "NORMAL";
}
