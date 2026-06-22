import React from 'react';
import { Printer } from 'lucide-react';
import { APTInputs, APTResults, AdditionalCost } from '../hooks/useAPTCalculation';
import { PDFFooter } from './PDFFooter';
import { PDFMainTable } from './PDFMainTable';

interface Props {
  data: {
    inputs: APTInputs;
    results: APTResults;
  };
}

const APTOffer: React.FC<Props> = ({ data }) => {
  const { inputs, results } = data;

  // Horyzont amortyzacji kosztów jednorazowych (guard zgodny z hookiem).
  const horizon = inputs.contractHorizonMonths > 0 ? inputs.contractHorizonMonths : 1;
  const oneTimeCosts = inputs.additionalCosts.filter(
    cost => !cost.isPerMonth && cost.amountPerPerson > 0
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(value);
  };

  // Guard przed dzieleniem przez zero (MED-1): brak godzin => '—'.
  const totalHours = inputs.workerCount * inputs.hoursPerMonth;
  const perRbh = (value: number) =>
    totalHours > 0 ? formatCurrency(value / totalHours) : '—';

  const formatDate = () => {
    const today = new Date();
    return today.toLocaleDateString('pl-PL');
  };

  // Data ważności oferty (validUntil w formacie YYYY-MM-DD) -> format pl-PL; null gdy brak.
  const formatValidUntil = (): string | null => {
    if (!inputs.validUntil) return null;
    const d = new Date(inputs.validUntil);
    return Number.isNaN(d.getTime()) ? inputs.validUntil : d.toLocaleDateString('pl-PL');
  };

  // Koszty wliczone w stawkę godzinową (sekcja "po stronie agencji").
  const inStawceCosts = inputs.additionalCosts.filter(
    c => c.mode === 'w_stawce' && c.amountPerPerson > 0
  );
  // Koszty refakturowane jako osobne pozycje faktury (z marżą lub 1:1).
  const refakturaCosts = inputs.additionalCosts.filter(
    c => (c.mode === 'refaktura_z_marza' || c.mode === 'refaktura_1do1') && c.amountPerPerson > 0
  );
  const refakturaTotalBilled = results.refakturaZMarzaBilled + results.refaktura1to1Total;

  // Miesięczna wartość refaktury fakturowana klientowi: z marżą dla z_marza, 1:1 dla 1do1.
  // Koszty jednorazowe amortyzowane na horyzont kontraktu (spójne z hookiem).
  const billedMonthlyForCost = (cost: AdditionalCost): number => {
    const baseVal = cost.isProjectLevel ? cost.amountPerPerson : cost.amountPerPerson * inputs.workerCount;
    const monthlyVal = cost.isPerMonth ? baseVal : baseVal / horizon;
    const marginFactor = 1 - inputs.marginPercent / 100;
    return cost.mode === 'refaktura_z_marza' && marginFactor > 0 ? monthlyVal / marginFactor : monthlyVal;
  };

  return (
    <div className="bg-white min-h-screen">
      <style>
        {`
          @media print {
            body { background: white; margin: 0; padding: 0; }
            .print-page { padding: 20mm; margin: 0; border: none; box-shadow: none; max-width: none; width: 100%; min-height: 100vh; }
            .page-break { page-break-before: always; }
            button { display: none !important; }
            .no-print { display: none !important; }
          }
        `}
      </style>

      {/* PAGE 1 — DLA KLIENTA */}
      <div className="print-page max-w-4xl mx-auto p-8 my-8 bg-white shadow-lg border border-gray-100">
        {/* Nagłówek oferty — profesjonalna ramka (on-brand: zieleń HR KONO / złoto APT) */}
        <div className="mb-8 border-t-4 border-[#396542] bg-white shadow-sm rounded-b-lg px-8 py-6">
          <div className="flex justify-between items-start gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-[#396542] text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                HK
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#396542] leading-tight">HR KONO S.A. / APT WORK Sp. z o.o.</h1>
                <p className="text-gray-500 text-sm font-medium">{inputs.entity}</p>
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="text-gray-500">Data wystawienia</p>
              <p className="font-semibold text-gray-800">{formatDate()}</p>
              {formatValidUntil() && (
                <p className="mt-1 inline-block bg-[#c0a068]/15 text-[#8a6d2f] font-semibold px-2 py-0.5 rounded">
                  Ważna do: {formatValidUntil()}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-gray-200">
            <p className="text-xs uppercase tracking-widest text-[#c0a068] font-semibold mb-1">Oferta cenowa dla</p>
            <h2 className="text-xl font-bold text-gray-900">{inputs.clientName || '_______________'}</h2>
          </div>
        </div>

        {/* Zawartość oferty */}
        <div className="mb-10 bg-slate-50 border-l-4 border-[#396542] rounded-r-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500 block text-xs uppercase tracking-wide">Stanowisko</span>
              <p className="font-semibold text-gray-900">{inputs.position || 'Nie podano'}</p>
            </div>
            <div>
              <span className="text-gray-500 block text-xs uppercase tracking-wide">Liczba osób</span>
              <p className="font-semibold text-gray-900">{inputs.workerCount}</p>
            </div>
            <div>
              <span className="text-gray-500 block text-xs uppercase tracking-wide">Godziny / m-c</span>
              <p className="font-semibold text-gray-900">{inputs.hoursPerMonth}</p>
            </div>
            <div>
              <span className="text-gray-500 block text-xs uppercase tracking-wide">Typ umowy</span>
              <p className="font-semibold text-gray-900">{inputs.contractType}</p>
            </div>
          </div>
        </div>

        {/* Tabela główna — format strzałkowy (inspiracja Gi Group) */}
        <div className="mb-8">
          <PDFMainTable inputs={inputs} results={results} />
          <p className="text-xs text-gray-500 mt-2">
            Stawka za usługę obejmuje wynagrodzenie pracownika, narzuty ZUS i fundusze oraz obsługę
            agencji. Refaktury kosztów (poniżej) fakturowane są jako osobne pozycje.
          </p>
        </div>

        {/* Trzy sekcje kosztów: po stronie agencji / refaktury / po stronie klienta */}
        <div className="mb-8 space-y-5">
          <div className="cost-section">
            <h3 className="text-sm font-bold uppercase tracking-wide text-[#396542] border-b-2 border-[#396542]/20 pb-1 mb-3">
              W stawce godzinowej (po stronie agencji)
            </h3>
            <ul className="text-sm text-gray-700 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-[#396542] font-bold mt-0.5">✓</span>Pełna obsługa administracyjno-kadrowa i płacowa
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#396542] font-bold mt-0.5">✓</span>Rozliczenia ZUS i zaliczek podatkowych pracowników
              </li>
              {inStawceCosts.map(cost => (
                <li key={cost.id} className="flex items-start gap-2">
                  <span className="text-[#396542] font-bold mt-0.5">✓</span>{cost.label.split(' /')[0]}
                </li>
              ))}
            </ul>
          </div>

          {refakturaCosts.length > 0 && (
            <div className="cost-section">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#396542] border-b-2 border-[#396542]/20 pb-1 mb-3">
                Refaktury kosztów (osobne pozycje faktury)
              </h3>
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 uppercase tracking-wide">
                  <tr className="border-b border-gray-200">
                    <th className="py-1.5 text-left font-medium">Pozycja</th>
                    <th className="py-1.5 text-right font-medium w-40">Wartość miesięczna</th>
                    <th className="py-1.5 text-right font-medium w-44">Tryb rozliczenia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {refakturaCosts.map(cost => (
                    <tr key={cost.id} className="text-gray-700">
                      <td className="py-2">
                        {cost.label.split(' /')[0]}
                        {!cost.isPerMonth && (
                          <span className="text-xs text-gray-400"> (jednorazowy, amort. / {horizon} mc)</span>
                        )}
                      </td>
                      <td className="py-2 text-right font-mono tabular-nums">{formatCurrency(billedMonthlyForCost(cost))}</td>
                      <td className="py-2 text-right text-xs">
                        {cost.mode === 'refaktura_z_marza' ? `z marżą ${inputs.marginPercent}%` : 'bez marży (1:1)'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {results.clientSideCosts.length > 0 && (
            <div className="cost-section">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#396542] border-b-2 border-[#396542]/20 pb-1 mb-3">
                Po stronie klienta
              </h3>
              <ul className="text-sm text-gray-700 space-y-1.5">
                {results.clientSideCosts.map(cost => (
                  <li key={cost.id} className="flex items-start gap-2">
                    <span className="text-gray-400 font-bold mt-0.5">•</span>{cost.label.split(' /')[0]}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Dolna linia — wartość faktury miesięcznej + stawki godzinowe */}
        <div className="mb-4 rounded-xl border-2 border-[#396542] overflow-hidden">
          <div className="bg-[#396542] text-white px-5 py-4 flex items-center justify-between gap-4">
            <span className="font-semibold">Szacowana wartość faktury / miesiąc</span>
            <span className="text-2xl font-bold font-mono tabular-nums">{formatCurrency(results.totalMonthlyBilling)}</span>
          </div>
          <div className="bg-[#c0a068]/10 px-5 py-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-gray-600">Stawka godzinowa za usługę</span>
              <span className="font-bold font-mono tabular-nums text-[#8a6d2f]">{perRbh(results.baseMonthlyBilling)}</span>
            </div>
            {refakturaTotalBilled > 0.005 && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-600">Średnia stawka łączna z refakturami</span>
                <span className="font-bold font-mono tabular-nums text-[#8a6d2f]">{perRbh(results.totalMonthlyBilling)}</span>
              </div>
            )}
          </div>
        </div>

        <PDFFooter variant="client" preparedBy={inputs.preparedBy} />

        <div className="mt-8 flex justify-center no-print">
          <button
            onClick={() => window.print()}
            className="bg-[#c0a068] text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:bg-[#b09058] active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c0a068]/50 transition-all flex items-center gap-2"
          >
            <Printer className="w-5 h-5" /> Drukuj / Zapisz PDF
          </button>
        </div>
      </div>

      {/* PAGE 2 — WEWNĘTRZNA / OPS */}
      <div className="print-page page-break max-w-4xl mx-auto p-8 my-8 bg-white shadow-lg border border-red-200">
        <div className="bg-red-50 text-red-800 p-4 rounded-lg mb-8 text-center border border-red-200">
          <h1 className="text-2xl font-bold">KALKULACJA TECHNICZNA — DOKUMENT WEWNĘTRZNY</h1>
          <p className="text-sm mt-1">Nie dołączać do oferty dla klienta</p>
        </div>

        {results.isExempt && (
          <div className="bg-amber-50 text-amber-800 p-4 rounded-lg mb-8 border border-amber-200 font-medium">
            UWAGA: Wariant {inputs.contractorVariant} — narzuty ZUS pracodawcy = 0 zł
          </div>
        )}

        <div className="grid grid-cols-2 gap-12">
          <div>
            <h2 className="text-lg font-bold mb-4 border-b border-gray-200 pb-2">Struktura Kosztów Agencji (miesięcznie)</h2>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-2">Wynagrodzenie brutto</td>
                  <td className="py-2 text-right font-medium">{formatCurrency(results.gross)}</td>
                </tr>
                <tr className="text-gray-600">
                  <td className="py-2 pl-4">Emerytalna pracodawcy (9.76%)</td>
                  <td className="py-2 text-right">{formatCurrency(results.zusEmerytalna)}</td>
                </tr>
                <tr className="text-gray-600">
                  <td className="py-2 pl-4">Rentowa pracodawcy (6.50%)</td>
                  <td className="py-2 text-right">{formatCurrency(results.zusRentowa)}</td>
                </tr>
                <tr className="text-gray-600">
                  <td className="py-2 pl-4">Wypadkowa ({inputs.accidentInsuranceRate}%)</td>
                  <td className="py-2 text-right">{formatCurrency(results.zusWypadkowa)}</td>
                </tr>
                <tr className="text-gray-600">
                  <td className="py-2 pl-4">FP + FS (2.45%)</td>
                  <td className="py-2 text-right">{formatCurrency(results.fp_fs)}</td>
                </tr>
                <tr className="text-gray-600">
                  <td className="py-2 pl-4">FGŚP (0.10%)</td>
                  <td className="py-2 text-right">{formatCurrency(results.fgsp)}</td>
                </tr>
                <tr className="font-semibold bg-gray-50">
                  <td className="py-2 pl-4">RAZEM ZUS/fundusze</td>
                  <td className="py-2 text-right">{formatCurrency(results.zusTotal)}</td>
                </tr>
                <tr>
                  <td className="py-2">PPK pracodawcy ({inputs.ppkEmployerRate}%)</td>
                  <td className="py-2 text-right">{formatCurrency(results.ppkAmount)}</td>
                </tr>
                {inputs.contractType === 'Praca tymczasowa' && (
                  <tr>
                    <td className="py-2">Rezerwa urlopowa ({inputs.vacationReserveRate}%)</td>
                    <td className="py-2 text-right">{formatCurrency(results.vacationReserve)}</td>
                  </tr>
                )}
                <tr>
                  <td className="py-2">Koszty operacyjne (w stawce)</td>
                  <td className="py-2 text-right">{formatCurrency(results.internalCosts)}</td>
                </tr>
                <tr className="font-bold text-base border-t-2 border-gray-300">
                  <td className="py-3">KOSZT WŁASNY AGENCJI</td>
                  <td className="py-3 text-right">{formatCurrency(results.agencyCost)}</td>
                </tr>
              </tbody>
            </table>

            {oneTimeCosts.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-bold mb-2 border-b border-gray-200 pb-1">
                  Koszty jednorazowe — amortyzacja / {horizon} mies.
                </h3>
                <table className="w-full text-xs">
                  <thead className="text-gray-500">
                    <tr>
                      <th className="py-1 text-left font-medium">Pozycja</th>
                      <th className="py-1 text-right font-medium">Kwota jednorazowa</th>
                      <th className="py-1 text-right font-medium">Mies. ({horizon} mc)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {oneTimeCosts.map(cost => {
                      const raw = cost.isProjectLevel
                        ? cost.amountPerPerson
                        : cost.amountPerPerson * inputs.workerCount;
                      return (
                        <tr key={cost.id} className="text-gray-600">
                          <td className="py-1">{cost.label}</td>
                          <td className="py-1 text-right">{formatCurrency(raw)}</td>
                          <td className="py-1 text-right">{formatCurrency(raw / horizon)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-bold mb-4 border-b border-gray-200 pb-2">Analiza Rentowności</h2>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Wartość sprzedaży bazowa (miesiąc)</span>
                <span className="font-medium">{formatCurrency(results.baseMonthlyBilling)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Refaktury z marżą (sprzedaż)</span>
                <span className="font-medium">{formatCurrency(results.refakturaZMarzaBilled)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Refaktury 1:1</span>
                <span className="font-medium">{formatCurrency(results.refaktura1to1Total)}</span>
              </div>
              <div className="border-t border-gray-200 my-2 pt-2 flex justify-between items-center font-bold">
                <span>Łączna wartość faktury</span>
                <span>{formatCurrency(results.totalMonthlyBilling)}</span>
              </div>

              <div className="mt-8 bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="font-bold mb-4 text-[#396542]">MARŻA AGENCJI</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Marża brutto (od sprzedaży) %</span>
                    <span className="font-bold">{inputs.marginPercent}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Marża brutto (od sprzedaży) zł/miesiąc</span>
                    <span className="font-bold">{formatCurrency(results.marginAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Marża brutto (od sprzedaży) zł/rbh</span>
                    <span className="font-bold text-lg text-[#396542]">{formatCurrency(results.marginPerHour)}</span>
                  </div>
                </div>
                <div className="mt-4 text-xs text-gray-500 text-center">
                  Model marży: od wartości sprzedaży
                </div>
              </div>
            </div>
          </div>
        </div>
        <PDFFooter variant="internal" preparedBy={inputs.preparedBy} />
      </div>
    </div>
  );
};

export default APTOffer;
