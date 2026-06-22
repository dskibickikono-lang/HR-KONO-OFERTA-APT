import React from 'react';
import { APTInputs, APTResults } from '../hooks/useAPTCalculation';

export interface VariantColumn {
  /** Etykieta kolumny (pokazywana tylko gdy >1 kolumna). */
  label?: string;
  results: APTResults;
}

interface PDFMainTableProps {
  inputs: APTInputs;
  /** 1..N kolumn (podstawowy + ewentualne warianty stawek). */
  columns: VariantColumn[];
}

/**
 * Tabela główna oferty w formacie "strzałkowym" (inspiracja Gi Group):
 * budowa stawki za rbh od wynagrodzenia brutto, przez narzuty i koszty obsługi,
 * do stawki godzinowej za usługę.
 *
 * Każda kolumna to niezależny scenariusz stawki (np. zmiana dzień/noc/weekend).
 * Wartości per rbh uzgadniają się dokładnie do baseHourlyRate danej kolumny:
 *   (agencyCost / rbh) / (1 - marża%) = baseMonthlyBilling / rbh = baseHourlyRate
 *
 * Refaktury (zakwaterowanie, badania itp.) NIE wchodzą do tej tabeli — są osobnymi
 * pozycjami faktury i prezentowane są w sekcji "Refaktury kosztów".
 */
export const PDFMainTable: React.FC<PDFMainTableProps> = ({ inputs, columns }) => {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(value);

  const totalHours = inputs.workerCount * inputs.hoursPerMonth;
  // Guard przed dzieleniem przez zero (spójny z resztą PDF): brak rbh => '—'.
  const perHour = (monthly: number): string =>
    totalHours > 0 ? formatCurrency(monthly / totalHours) : '—';

  const marginLabel = inputs.marginPercent.toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const multi = columns.length > 1;
  const arrow = <span className="text-[#396542] mr-2 font-bold">→</span>;

  const zusFunds = (r: APTResults) => r.zusTotal + r.ppkAmount + r.vacationReserve;
  // Wiersz pokazujemy, jeśli którakolwiek kolumna ma dany składnik > 0.
  const anyZusFunds = columns.some(c => zusFunds(c.results) > 0);
  const anyOperational = columns.some(c => c.results.internalCosts > 0);

  const valueCell = (key: number, value: string, extra = '') => (
    <td key={key} className={`py-2.5 px-4 text-right font-mono tabular-nums ${extra}`}>{value}</td>
  );

  return (
    <table className="w-full text-sm border border-gray-200">
      <thead className="bg-gradient-to-r from-[#396542] to-[#2c5034] text-white">
        <tr>
          <th className="py-3 px-4 text-left font-semibold">Składnik stawki godzinowej</th>
          {columns.map((col, i) => (
            <th key={i} className="py-3 px-4 text-right font-semibold w-40">
              {multi ? (col.label || `Wariant ${i + 1}`) : 'Za rbh (roboczo-godz.)'}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        <tr>
          <td className="py-2.5 px-4">{arrow}Wynagrodzenie brutto pracownika</td>
          {columns.map((c, i) => valueCell(i, perHour(c.results.gross)))}
        </tr>
        {anyZusFunds && (
          <tr className="text-gray-600">
            <td className="py-2.5 px-4">{arrow}Narzuty ZUS i fundusze</td>
            {columns.map((c, i) => valueCell(i, perHour(zusFunds(c.results))))}
          </tr>
        )}
        {anyOperational && (
          <tr className="text-gray-600">
            <td className="py-2.5 px-4">{arrow}Obsługa i koszty operacyjne</td>
            {columns.map((c, i) => valueCell(i, perHour(c.results.internalCosts)))}
          </tr>
        )}
        <tr className="bg-slate-50 font-semibold border-t-2 border-gray-300">
          <td className="py-2.5 px-4">{arrow}Łączny koszt wynagrodzenia</td>
          {columns.map((c, i) => valueCell(i, perHour(c.results.agencyCost)))}
        </tr>
        <tr>
          <td className="py-2.5 px-4">{arrow}Marża brutto % (od wartości sprzedaży)</td>
          {columns.map((_, i) => valueCell(i, `${marginLabel}%`))}
        </tr>
        <tr className="bg-[#c0a068]/15 border-y-2 border-[#c0a068]">
          <td className="py-3 px-4 font-bold text-[#8a6d2f]">{arrow}Stawka godzinowa za usługę</td>
          {columns.map((c, i) => valueCell(i, perHour(c.results.baseMonthlyBilling), 'font-bold text-lg text-[#8a6d2f]'))}
        </tr>
      </tbody>
    </table>
  );
};

export default PDFMainTable;
