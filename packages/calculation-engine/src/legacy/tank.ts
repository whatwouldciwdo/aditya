import type {
  TankCalculationInput,
  TankCalculationResult,
  TankCode,
  TankDefinition,
  TankStatus,
} from "@aditya/shared-types";

export const LEGACY_TANK_FORMULA_VERSION =
  "legacy-tank-characterization-v1" as const;
export const LEGACY_TANK_PARAMETER_VERSION =
  "legacy-tank-parameters-v1" as const;
export const LEGACY_TANK_NWL_TOLERANCE_M = 0.005;

export const LEGACY_TANK_DEFINITIONS = {
  RWT: {
    name: "Raw Water Tank",
    nwl: 11.295,
    hwi: 11.395,
    ofl: 11.445,
    capacityNwl: 5500,
    factorM: 486.941,
  },
  MWT: {
    name: "Make-up Water Tank",
    nwl: 14.967,
    hwi: 15.067,
    ofl: 15.117,
    capacityNwl: 2500,
    factorM: 167.034,
  },
} as const;

export type LegacyTankCode = keyof typeof LEGACY_TANK_DEFINITIONS;
export type LegacyTankStatus = TankStatus;

export function getLegacyTankDefinition(code: TankCode): TankDefinition {
  const tank = LEGACY_TANK_DEFINITIONS[code];
  return {
    tankCode: code,
    name: tank.name,
    nwlM: tank.nwl,
    hwiM: tank.hwi,
    oflM: tank.ofl,
    capacityNwlM3: tank.capacityNwl,
    factorM3PerM: tank.factorM,
    nwlToleranceM: LEGACY_TANK_NWL_TOLERANCE_M,
    parameterVersion: LEGACY_TANK_PARAMETER_VERSION,
  };
}

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
  if (Math.abs(level - tank.nwl) <= LEGACY_TANK_NWL_TOLERANCE_M) return "NWL";
  if (level > tank.nwl) return "HIGH";
  return "NORMAL";
}

export function calculateLegacyTank(
  input: TankCalculationInput,
): TankCalculationResult {
  if (!Number.isFinite(input.value))
    throw new TypeError("value harus berupa angka finite");
  if (input.value < 0) throw new RangeError("value tidak boleh negatif");

  const tank = LEGACY_TANK_DEFINITIONS[input.tankCode];
  const levelM =
    input.inputType === "LEVEL" ? input.value : input.value / tank.factorM;
  const volumeM3 =
    input.inputType === "VOLUME" ? input.value : input.value * tank.factorM;

  return {
    input,
    definition: getLegacyTankDefinition(input.tankCode),
    levelM,
    levelMm: levelM * 1000,
    volumeM3,
    volumeLiter: volumeM3 * 1000,
    capacityPercent: (volumeM3 / tank.capacityNwl) * 100,
    oflPercent: (levelM / tank.ofl) * 100,
    status: getLegacyTankStatus(input.tankCode, levelM),
    overflowWarning: levelM >= tank.ofl,
    formulaVersion: LEGACY_TANK_FORMULA_VERSION,
  };
}
