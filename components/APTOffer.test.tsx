import { describe, it, expect, afterEach } from 'vitest';
import { render, renderHook, cleanup } from '@testing-library/react';
import APTOffer from './APTOffer';
import { useAPTCalculation, APTInputs } from '../hooks/useAPTCalculation';

afterEach(cleanup);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(
    value
  );

const inputs: APTInputs = {
  entity: 'HR KONO S.A.',
  clientName: 'Test Sp. z o.o.',
  position: 'Kompletacja',
  contractType: 'Umowa zlecenie',
  contractorVariant: 'Standard ozusowany',
  workerCount: 1,
  hoursPerMonth: 100,
  grossRateHourly: 20,
  marginPercent: 20, // marginFactor 0.8
  accidentInsuranceRate: 1.2,
  ppkEmployerRate: 1.5,
  vacationReserveRate: 8.3,
  additionalCosts: [
    {
      id: 'r1',
      label: 'Odzież robocza',
      amountPerPerson: 1000,
      mode: 'refaktura_z_marza',
      isPerMonth: true,
    },
  ],
};

/** Find the table row whose first cell contains the given label, return its cells. */
const findRowCells = (container: HTMLElement, label: string): string[] => {
  const rows = Array.from(container.querySelectorAll('tr'));
  const row = rows.find((tr) => tr.textContent?.includes(label));
  if (!row) throw new Error(`Row with label "${label}" not found`);
  return Array.from(row.querySelectorAll('td')).map(
    (td) => td.textContent ?? ''
  );
};

describe('HIGH-1: refaktura_z_marza row must display the BILLED (marked-up) value', () => {
  // EXPECTED-TO-FAIL until HIGH-1 fix (STEP 2): page 1 currently renders the
  // nominal amount (1000) while the invoice total bills it at 1000 / 0.8 = 1250.
  it('refaktura row "Wartość miesięczna" equals refakturaZMarzaBilled', () => {
    const results = renderHook(() => useAPTCalculation(inputs)).result.current;
    expect(results.refakturaZMarzaBilled).toBeCloseTo(1250, 2); // sanity

    const { container } = render(<APTOffer data={{ inputs, results }} />);
    const cells = findRowCells(container, 'Odzież robocza');

    // cells[0] = label, cells[1] = "Wartość miesięczna"
    expect(cells[1]).toBe(formatCurrency(results.refakturaZMarzaBilled));
  });

  it('sum of billed line items reconciles to totalMonthlyBilling', () => {
    const results = renderHook(() => useAPTCalculation(inputs)).result.current;
    const { container } = render(<APTOffer data={{ inputs, results }} />);
    const refakturaCellValue = findRowCells(container, 'Odzież robocza')[1];

    // base billing (shown on agency cost -> client value) + displayed refaktura
    // should equal the bold client invoice total.
    expect(refakturaCellValue).toBe(formatCurrency(results.refakturaZMarzaBilled));
    expect(results.totalMonthlyBilling).toBeCloseTo(
      results.baseMonthlyBilling + results.refakturaZMarzaBilled,
      2
    );
  });
});

describe('MED-1: no Infinity/NaN in PDF when hoursPerMonth = 0', () => {
  it('per-RBH cells render "—" instead of Infinity', () => {
    const zeroHours: APTInputs = { ...inputs, hoursPerMonth: 0 };
    const results = renderHook(() => useAPTCalculation(zeroHours)).result.current;
    const { container } = render(<APTOffer data={{ inputs: zeroHours, results }} />);
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/Infinity/);
    expect(text).not.toMatch(/NaN/);
    expect(text).toContain('—'); // guarded per-RBH cells
  });
});
