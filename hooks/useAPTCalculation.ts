import { useMemo } from 'react';

export type ContractType = 'Umowa zlecenie' | 'Praca tymczasowa';
export type ContractorVariant = 'Standard ozusowany' | 'Student do 26 lat' | 'Zbieg tytułów - bez społecznych';
export type CostMode = 'w_stawce' | 'refaktura_z_marza' | 'refaktura_1do1' | 'po_stronie_klienta';
export type Entity = 'HR KONO S.A.' | 'APT WORK Sp. z o.o.' | 'Inny';

export interface AdditionalCost {
  id: string;
  label: string;
  amountPerPerson: number;        // 0 = hidden from PDF
  mode: CostMode;
  isPerMonth: boolean;            // true = per person/month, false = per person one-time
  isProjectLevel?: boolean;       // true = not multiplied by workerCount (e.g. koordinator)
}

export interface APTInputs {
  entity: Entity;
  clientName: string;
  position: string;               // stanowisko np. "Kompletacja zamówień"
  contractType: ContractType;
  contractorVariant: ContractorVariant;
  workerCount: number;
  hoursPerMonth: number;
  grossRateHourly: number;        // stawka brutto pracownika/h
  marginPercent: number;          // np. 18 (nie 0.18!)
  contractHorizonMonths: number;  // horyzont amortyzacji kosztów jednorazowych, np. 3
  accidentInsuranceRate: number;  // wypadkowa % np. 1.67
  ppkEmployerRate: number;        // PPK pracodawcy % np. 1.5
  vacationReserveRate: number;    // rezerwa urlopowa % np. 8.3
  additionalCosts: AdditionalCost[];
}

export interface APTResults {
  isExempt: boolean;
  gross: number;
  zusEmerytalna: number;
  zusRentowa: number;
  zusWypadkowa: number;
  fp_fs: number;
  fgsp: number;
  zusTotal: number;
  ppkAmount: number;
  vacationReserve: number;
  internalCosts: number;
  agencyCost: number;
  baseMonthlyBilling: number;
  baseHourlyRate: number;
  refakturaZMarzaTotal: number;
  refakturaZMarzaBilled: number;
  refaktura1to1Total: number;
  clientSideCosts: AdditionalCost[];
  totalMonthlyBilling: number;
  finalHourlyRate: number;
  marginAmount: number;
  marginPerHour: number;
  workerNetto: number;
}

export const round2 = (num: number): number => {
  return Number(num.toFixed(2));
};

export const calculateForward = (inputs: APTInputs): APTResults => {
  const {
    contractType,
    contractorVariant,
    workerCount,
    hoursPerMonth,
    grossRateHourly,
    marginPercent,
    contractHorizonMonths,
    accidentInsuranceRate,
    ppkEmployerRate,
    vacationReserveRate,
    additionalCosts
  } = inputs;

  // Horyzont amortyzacji kosztów jednorazowych. Guard: <=0 / NaN => 1 (brak amortyzacji).
  const horizon = contractHorizonMonths > 0 ? contractHorizonMonths : 1;

  const isExempt = contractorVariant !== 'Standard ozusowany';
  const gross = workerCount * hoursPerMonth * grossRateHourly;

  // ZUS pracodawcy (osobno, bez PPK w tej sumie)
  const zusEmerytalna = isExempt ? 0 : (gross * 9.76) / 100;
  const zusRentowa = isExempt ? 0 : (gross * 6.50) / 100;
  const zusWypadkowa = isExempt ? 0 : (gross * accidentInsuranceRate) / 100;
  const fp_fs = isExempt ? 0 : (gross * 2.45) / 100;
  const fgsp = isExempt ? 0 : (gross * 0.10) / 100;
  const zusTotal = zusEmerytalna + zusRentowa + zusWypadkowa + fp_fs + fgsp;

  // PPK osobno
  const ppkAmount = (gross * ppkEmployerRate) / 100;

  // Rezerwa urlopowa - TYLKO dla Praca tymczasowa
  const vacationReserve = contractType === 'Praca tymczasowa' ? (gross * vacationReserveRate) / 100 : 0;

  // Koszty dodatkowe wliczone w stawkę (mode = 'w_stawce')
  let internalCosts = 0;
  let refakturaZMarzaTotal = 0;
  let refaktura1to1Total = 0;
  const clientSideCosts: AdditionalCost[] = [];

  additionalCosts.forEach(cost => {
    let costValue = cost.amountPerPerson;
    if (!cost.isProjectLevel) {
      costValue *= workerCount;
    }
    // Koszt jednorazowy (isPerMonth=false) rozkładamy na horyzont kontraktu,
    // żeby nie obciążał każdej miesięcznej faktury pełną kwotą (HIGH-2).
    if (!cost.isPerMonth) {
      costValue = costValue / horizon;
    }

    if (cost.mode === 'w_stawce') {
      internalCosts += costValue;
    } else if (cost.mode === 'refaktura_z_marza') {
      refakturaZMarzaTotal += costValue;
    } else if (cost.mode === 'refaktura_1do1') {
      refaktura1to1Total += costValue;
    } else if (cost.mode === 'po_stronie_klienta') {
      clientSideCosts.push(cost);
    }
  });

  // Koszt własny agencji
  const agencyCost = gross + zusTotal + ppkAmount + vacationReserve + internalCosts;

  // Stawka bazowa (marża od wartości sprzedaży)
  const marginFactor = 1 - marginPercent / 100;
  const baseMonthlyBilling = marginFactor > 0 ? agencyCost / marginFactor : 0;
  const totalHours = workerCount * hoursPerMonth;
  const baseHourlyRate = totalHours > 0 ? baseMonthlyBilling / totalHours : 0;

  // Refaktury z marżą
  const refakturaZMarzaBilled = marginFactor > 0 ? refakturaZMarzaTotal / marginFactor : 0;

  // Łączna wartość faktury
  const totalMonthlyBilling = baseMonthlyBilling + refakturaZMarzaBilled + refaktura1to1Total;
  const finalHourlyRate = totalHours > 0 ? totalMonthlyBilling / totalHours : 0;

  // Marża agencji
  const marginAmount = baseMonthlyBilling - agencyCost;
  const marginPerHour = totalHours > 0 ? marginAmount / totalHours : 0;

  // Worker netto
  const workerNetto = grossRateHourly * 0.8076;

  return {
    isExempt,
    gross: round2(gross),
    zusEmerytalna: round2(zusEmerytalna),
    zusRentowa: round2(zusRentowa),
    zusWypadkowa: round2(zusWypadkowa),
    fp_fs: round2(fp_fs),
    fgsp: round2(fgsp),
    zusTotal: round2(zusTotal),
    ppkAmount: round2(ppkAmount),
    vacationReserve: round2(vacationReserve),
    internalCosts: round2(internalCosts),
    agencyCost: round2(agencyCost),
    baseMonthlyBilling: round2(baseMonthlyBilling),
    baseHourlyRate: round2(baseHourlyRate),
    refakturaZMarzaTotal: round2(refakturaZMarzaTotal),
    refakturaZMarzaBilled: round2(refakturaZMarzaBilled),
    refaktura1to1Total: round2(refaktura1to1Total),
    clientSideCosts,
    totalMonthlyBilling: round2(totalMonthlyBilling),
    finalHourlyRate: round2(finalHourlyRate),
    marginAmount: round2(marginAmount),
    marginPerHour: round2(marginPerHour),
    workerNetto: round2(workerNetto),
  };
};

export const calculateReverse = (inputs: APTInputs, targetFinalHourlyRate: number): number => {
  // We use a binary search to find the gross hourly rate that produces the target final hourly rate.
  // This is computationally efficient, completely decouples inverse logic complexity, and satisfies reverse(forward(x)) = x
  let low = 0;
  let high = targetFinalHourlyRate * 2; // initial upper bound guess
  let bestGross = 0;

  // Guard against non-scaling parameters (0 workers, 0 hours, 100% margin) that would cause infinite loops
  if (inputs.workerCount <= 0 || inputs.hoursPerMonth <= 0 || inputs.marginPercent >= 100) {
    return 0;
  }

  // Expand high bound if necessary
  let expandIters = 50;
  while (calculateForward({ ...inputs, grossRateHourly: high }).finalHourlyRate < targetFinalHourlyRate && expandIters > 0) {
    if (high === 0) high = 100;
    else high *= 2;
    expandIters--;
  }

  // Binary search for precision
  const tolerance = 0.001;
  let maxIters = 100;

  while (high - low > tolerance && maxIters > 0) {
    const mid = (low + high) / 2;
    const testResult = calculateForward({ ...inputs, grossRateHourly: mid });

    if (testResult.finalHourlyRate < targetFinalHourlyRate) {
      low = mid;
    } else {
      high = mid;
    }
    maxIters--;
  }

  bestGross = round2((low + high) / 2);
  return bestGross;
};

export const useAPTCalculation = (inputs: APTInputs): APTResults => {
  return useMemo(() => calculateForward(inputs), [inputs]);
};
