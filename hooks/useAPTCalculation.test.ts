import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useAPTCalculation,
  APTInputs,
  AdditionalCost,
} from './useAPTCalculation';

/**
 * Golden-number suite for the APT pricing engine.
 *
 * Baseline fixture is chosen for clean hand-calculation:
 *   workerCount = 2, hoursPerMonth = 160, grossRateHourly = 30  => gross = 9600
 *   entity HR KONO (wypadkowa 1.20%), margin 18%, PPK 1.5%,
 *   contract 'Umowa zlecenie' (no vacation reserve), no additional costs.
 */
const baseInputs: APTInputs = {
  entity: 'HR KONO S.A.',
  clientName: 'Test Sp. z o.o.',
  position: 'Kompletacja',
  contractType: 'Umowa zlecenie',
  contractorVariant: 'Standard ozusowany',
  workerCount: 2,
  hoursPerMonth: 160,
  grossRateHourly: 30,
  marginPercent: 18,
  accidentInsuranceRate: 1.2,
  ppkEmployerRate: 1.5,
  vacationReserveRate: 8.3,
  additionalCosts: [],
};

const calc = (inputs: APTInputs) =>
  renderHook(() => useAPTCalculation(inputs)).result.current;

const cost = (overrides: Partial<AdditionalCost>): AdditionalCost => ({
  id: 'c1',
  label: 'Koszt',
  amountPerPerson: 0,
  mode: 'w_stawce',
  isPerMonth: true,
  ...overrides,
});

describe('1. Default case golden numbers', () => {
  const r = calc(baseInputs);

  it('gross = workerCount * hours * rate', () => {
    expect(r.gross).toBe(9600);
  });
  it('ZUS components', () => {
    expect(r.zusEmerytalna).toBe(936.96); // 9600 * 9.76%
    expect(r.zusRentowa).toBe(624.0); // 9600 * 6.50%
    expect(r.zusWypadkowa).toBe(115.2); // 9600 * 1.20%
    expect(r.fp_fs).toBe(235.2); // 9600 * 2.45%
    expect(r.fgsp).toBe(9.6); // 9600 * 0.10%
  });
  it('zusTotal', () => {
    expect(r.zusTotal).toBe(1920.96);
  });
  it('ppkAmount', () => {
    expect(r.ppkAmount).toBe(144.0); // 9600 * 1.5%
  });
  it('agencyCost', () => {
    expect(r.agencyCost).toBe(11664.96); // 9600 + 1920.96 + 144 + 0 + 0
  });
  it('baseMonthlyBilling (revenue margin)', () => {
    expect(r.baseMonthlyBilling).toBe(14225.56); // 11664.96 / 0.82
  });
  it('finalHourlyRate', () => {
    expect(r.finalHourlyRate).toBe(44.45); // 14225.56 / 320
  });
  it('marginAmount', () => {
    expect(r.marginAmount).toBe(2560.6); // 14225.56 - 11664.96
  });
  it('marginPerHour', () => {
    expect(r.marginPerHour).toBe(8.0); // 2560.60 / 320
  });
  it('workerNetto', () => {
    expect(r.workerNetto).toBe(24.23); // 30 * 0.8076
  });
});

describe('2. Revenue-based margin: (billing - cost) / billing === m/100', () => {
  for (const m of [0, 18, 50]) {
    it(`margin ${m}%`, () => {
      const r = calc({ ...baseInputs, marginPercent: m });
      const ratio = (r.baseMonthlyBilling - r.agencyCost) / r.baseMonthlyBilling;
      expect(ratio).toBeCloseTo(m / 100, 6);
    });
  }
});

describe('3. PPK counted exactly once', () => {
  const r = calc(baseInputs);
  it('agencyCost === gross + zusTotal + ppk + vacation + internal', () => {
    expect(r.agencyCost).toBeCloseTo(
      r.gross + r.zusTotal + r.ppkAmount + r.vacationReserve + r.internalCosts,
      6
    );
  });
  it('zusTotal does NOT include PPK', () => {
    expect(r.zusTotal).toBeCloseTo(
      r.zusEmerytalna + r.zusRentowa + r.zusWypadkowa + r.fp_fs + r.fgsp,
      6
    );
    // PPK (144) must not be part of zusTotal
    expect(r.zusTotal).not.toBeCloseTo(1920.96 + r.ppkAmount, 6);
  });
});

describe('4. Exempt contractor variants zero social ZUS but keep PPK', () => {
  for (const variant of [
    'Student do 26 lat',
    'Zbieg tytułów - bez społecznych',
  ] as const) {
    it(variant, () => {
      const r = calc({ ...baseInputs, contractorVariant: variant });
      expect(r.isExempt).toBe(true);
      expect(r.zusEmerytalna).toBe(0);
      expect(r.zusRentowa).toBe(0);
      expect(r.zusWypadkowa).toBe(0);
      expect(r.fp_fs).toBe(0);
      expect(r.fgsp).toBe(0);
      expect(r.zusTotal).toBe(0);
      expect(r.ppkAmount).toBeGreaterThan(0); // PPK still calculated
    });
  }
});

describe('5. Vacation reserve only for Praca tymczasowa', () => {
  it('Umowa zlecenie => 0', () => {
    const r = calc({ ...baseInputs, contractType: 'Umowa zlecenie' });
    expect(r.vacationReserve).toBe(0);
  });
  it('Praca tymczasowa => gross * rate%', () => {
    const r = calc({ ...baseInputs, contractType: 'Praca tymczasowa' });
    expect(r.vacationReserve).toBe(796.8); // 9600 * 8.3%
  });
});

describe('6. Wypadkowa rate is consumed verbatim from input', () => {
  it('HR KONO rate 1.20%', () => {
    const r = calc({ ...baseInputs, accidentInsuranceRate: 1.2 });
    expect(r.zusWypadkowa).toBe(115.2); // 9600 * 1.20%
  });
  it('APT WORK rate 0.93%', () => {
    const r = calc({ ...baseInputs, accidentInsuranceRate: 0.93 });
    expect(r.zusWypadkowa).toBe(89.28); // 9600 * 0.93%
  });
  it('Inny manual rate 2.00%', () => {
    const r = calc({ ...baseInputs, accidentInsuranceRate: 2.0 });
    expect(r.zusWypadkowa).toBe(192.0); // 9600 * 2.00%
  });
});

describe('7. workerNetto === grossRateHourly * 0.8076', () => {
  for (const rate of [30, 28.1, 50]) {
    it(`rate ${rate}`, () => {
      const r = calc({ ...baseInputs, grossRateHourly: rate });
      expect(r.workerNetto).toBeCloseTo(rate * 0.8076, 2);
    });
  }
});

describe('8. Cost-mode routing', () => {
  it('w_stawce => affects internalCosts (and agencyCost)', () => {
    const r = calc({
      ...baseInputs,
      additionalCosts: [cost({ mode: 'w_stawce', amountPerPerson: 100 })],
    });
    expect(r.internalCosts).toBe(200); // 100 * 2 workers
    expect(r.agencyCost).toBe(11664.96 + 200);
  });

  it('refaktura_z_marza => billed separately WITH margin', () => {
    const r = calc({
      ...baseInputs,
      additionalCosts: [
        cost({ mode: 'refaktura_z_marza', amountPerPerson: 500 }),
      ],
    });
    expect(r.refakturaZMarzaTotal).toBe(1000); // 500 * 2
    expect(r.refakturaZMarzaBilled).toBeCloseTo(1000 / 0.82, 2); // 1219.51
    expect(r.internalCosts).toBe(0); // not in agency cost
    expect(r.agencyCost).toBe(11664.96);
    expect(r.totalMonthlyBilling).toBeCloseTo(
      r.baseMonthlyBilling + 1000 / 0.82,
      2
    );
  });

  it('refaktura_1do1 => billed separately WITHOUT margin', () => {
    const r = calc({
      ...baseInputs,
      additionalCosts: [cost({ mode: 'refaktura_1do1', amountPerPerson: 500 })],
    });
    expect(r.refaktura1to1Total).toBe(1000); // 500 * 2, no margin
    expect(r.totalMonthlyBilling).toBeCloseTo(r.baseMonthlyBilling + 1000, 2);
  });

  it('po_stronie_klienta => excluded from all billing', () => {
    const r = calc({
      ...baseInputs,
      additionalCosts: [
        cost({ mode: 'po_stronie_klienta', amountPerPerson: 500 }),
      ],
    });
    expect(r.clientSideCosts).toHaveLength(1);
    expect(r.internalCosts).toBe(0);
    expect(r.refakturaZMarzaTotal).toBe(0);
    expect(r.refaktura1to1Total).toBe(0);
    expect(r.agencyCost).toBe(11664.96);
    expect(r.totalMonthlyBilling).toBe(r.baseMonthlyBilling);
  });
});

describe('9. isPerMonth semantics: one-time cost is amortized, not recurring', () => {
  // EXPECTED-TO-FAIL until HIGH-2 fix (STEP 3): hook currently ignores
  // isPerMonth and adds the full one-time amount every month.
  it('one-time w_stawce cost amortized over contract horizon', () => {
    const inputs = {
      ...baseInputs,
      workerCount: 1,
      additionalCosts: [
        cost({ mode: 'w_stawce', amountPerPerson: 300, isPerMonth: false }),
      ],
      contractHorizonMonths: 3,
    } as unknown as APTInputs;
    const r = calc(inputs);
    expect(r.internalCosts).toBe(100); // 300 / 3 months, NOT 300
  });

  it('recurring (isPerMonth=true) cost is NOT amortized', () => {
    const inputs = {
      ...baseInputs,
      workerCount: 1,
      additionalCosts: [
        cost({ mode: 'w_stawce', amountPerPerson: 300, isPerMonth: true }),
      ],
      contractHorizonMonths: 3,
    } as unknown as APTInputs;
    const r = calc(inputs);
    expect(r.internalCosts).toBe(300); // full monthly amount
  });
});

describe('10. Edge cases produce finite, non-misleading output', () => {
  it('margin = 100 does not crash and stays finite', () => {
    const r = calc({ ...baseInputs, marginPercent: 100 });
    expect(Number.isFinite(r.baseMonthlyBilling)).toBe(true);
    expect(Number.isFinite(r.totalMonthlyBilling)).toBe(true);
  });
  it('margin > 100 stays finite', () => {
    const r = calc({ ...baseInputs, marginPercent: 150 });
    expect(Number.isFinite(r.baseMonthlyBilling)).toBe(true);
  });
  it('hoursPerMonth = 0 -> finite rates (no Infinity)', () => {
    const r = calc({ ...baseInputs, hoursPerMonth: 0 });
    expect(r.gross).toBe(0);
    expect(Number.isFinite(r.finalHourlyRate)).toBe(true);
    expect(Number.isFinite(r.baseHourlyRate)).toBe(true);
    expect(Number.isFinite(r.marginPerHour)).toBe(true);
  });
  it('workerCount = 0 -> finite outputs', () => {
    const r = calc({ ...baseInputs, workerCount: 0 });
    expect(r.gross).toBe(0);
    expect(Number.isFinite(r.agencyCost)).toBe(true);
    expect(Number.isFinite(r.totalMonthlyBilling)).toBe(true);
  });
  it('NaN inputs do not silently become misleading numbers', () => {
    const r = calc({ ...baseInputs, grossRateHourly: NaN });
    // gross becomes NaN; assert engine does not fabricate a finite price
    expect(Number.isNaN(r.gross)).toBe(true);
  });
});
