import React from 'react';
import { APTInputs, APTResults } from '../hooks/useAPTCalculation';

interface PDFMainTableProps {
  inputs: APTInputs;
  results: APTResults;
}

/**
 * Tabela główna oferty w formacie "strzałkowym" (inspiracja Gi Group):
 * budowa stawki za rbh od wynagrodzenia brutto, przez narzuty i koszty obsługi,
 * do stawki godzinowej za usługę.
 *
 * Wartości per rbh uzgadniają się dokładnie do baseHourlyRate:
 *   (agencyCost / rbh) / (1 - marża%) = baseMonthlyBilling / rbh = baseHourlyRate
 *
 * Refaktury (zakwaterowanie, badania itp.) NIE wchodzą do tej tabeli — są osobnymi
 * pozycjami faktury i prezentowane są w sekcji "Refaktury kosztów".
 */
export const PDFMainTable: React.FC<PDFMainTableProps> = ({ inputs, results }) => {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(value);

  const totalHours = inputs.workerCount * inputs.hoursPerMonth;
  // Guard przed dzieleniem przez zero (spójny z resztą PDF): brak rbh => '—'.
  const perHour = (monthly: number): string =>
    totalHours > 0 ? formatCurrency(monthly / totalHours) : '—';

  const zusAndFunds = results.zusTotal + results.ppkAmount + results.vacationReserve;
  const marginLabel = inputs.marginPercent.toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const arrow = <span className="text-[#396542] mr-2 font-bold">→</span>;

  return (
    <table className="w-full text-sm border border-gray-200">
      <thead className="bg-gradient-to-r from-[#396542] to-[#2c5034] text-white">
        <tr>
          <th className="py-3 px-4 text-left font-semibold">Składnik stawki godzinowej</th>
          <th className="py-3 px-4 text-right font-semibold w-44">Za rbh (roboczo-godz.)</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        <tr>
          <td className="py-2.5 px-4">{arrow}Wynagrodzenie brutto pracownika</td>
          <td className="py-2.5 px-4 text-right font-mono tabular-nums">{perHour(results.gross)}</td>
        </tr>
        {zusAndFunds > 0 && (
          <tr className="text-gray-600">
            <td className="py-2.5 px-4">{arrow}Narzuty ZUS i fundusze</td>
            <td className="py-2.5 px-4 text-right font-mono tabular-nums">{perHour(zusAndFunds)}</td>
          </tr>
        )}
        {results.internalCosts > 0 && (
          <tr className="text-gray-600">
            <td className="py-2.5 px-4">{arrow}Obsługa i koszty operacyjne</td>
            <td className="py-2.5 px-4 text-right font-mono tabular-nums">{perHour(results.internalCosts)}</td>
          </tr>
        )}
        <tr className="bg-slate-50 font-semibold border-t-2 border-gray-300">
          <td className="py-2.5 px-4">{arrow}Łączny koszt wynagrodzenia</td>
          <td className="py-2.5 px-4 text-right font-mono tabular-nums">{perHour(results.agencyCost)}</td>
        </tr>
        <tr>
          <td className="py-2.5 px-4">{arrow}Marża brutto % (od wartości sprzedaży)</td>
          <td className="py-2.5 px-4 text-right font-mono tabular-nums">{marginLabel}%</td>
        </tr>
        <tr className="bg-[#c0a068]/15 border-y-2 border-[#c0a068]">
          <td className="py-3 px-4 font-bold text-[#8a6d2f]">{arrow}Stawka godzinowa za usługę</td>
          <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-lg text-[#8a6d2f]">
            {perHour(results.baseMonthlyBilling)}
          </td>
        </tr>
      </tbody>
    </table>
  );
};

export default PDFMainTable;
