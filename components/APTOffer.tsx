import React from 'react';
import { APTInputs, APTResults } from '../hooks/useAPTCalculation';

interface Props {
  data: {
    inputs: APTInputs;
    results: APTResults;
  };
}

const APTOffer: React.FC<Props> = ({ data }) => {
  const { inputs, results } = data;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(value);
  };

  const formatDate = () => {
    const today = new Date();
    return today.toLocaleDateString('pl-PL');
  };

  const getBilledAdditionalCosts = () => {
    return inputs.additionalCosts.filter(
      cost => cost.mode !== 'po_stronie_klienta' && cost.amountPerPerson > 0
    );
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
        <div className="flex justify-between items-start mb-12 border-b-2 border-[#396542] pb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#396542] mb-1">HR KONO OFFER SYSTEM</h1>
            <p className="text-gray-600 font-medium">{inputs.entity}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500">Data wystawienia: {formatDate()}</p>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Oferta dla: {inputs.clientName || '_______________'}</h2>
          <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
            <div>
              <span className="text-gray-500">Stanowisko:</span>
              <p className="font-semibold">{inputs.position || 'Nie podano'}</p>
            </div>
            <div>
              <span className="text-gray-500">Typ umowy:</span>
              <p className="font-semibold">{inputs.contractType}</p>
            </div>
            <div>
              <span className="text-gray-500">Ilość osób:</span>
              <p className="font-semibold">{inputs.workerCount}</p>
            </div>
            <div>
              <span className="text-gray-500">Ilość godzin/m-c:</span>
              <p className="font-semibold">{inputs.hoursPerMonth}</p>
            </div>
          </div>
        </div>

        <div className="mb-12">
          <table className="w-full text-sm">
            <thead className="bg-[#396542] text-white">
              <tr>
                <th className="py-3 px-4 text-left">Pozycja</th>
                <th className="py-3 px-4 text-right w-32">Wartość miesięczna</th>
                <th className="py-3 px-4 text-right w-32">Na osobę</th>
                <th className="py-3 px-4 text-right w-32">Na RBH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="py-3 px-4 font-medium">Wynagrodzenie brutto pracowników</td>
                <td className="py-3 px-4 text-right">{formatCurrency(results.gross)}</td>
                <td className="py-3 px-4 text-right">{formatCurrency(results.gross / inputs.workerCount)}</td>
                <td className="py-3 px-4 text-right">{formatCurrency(inputs.grossRateHourly)}</td>
              </tr>
              {results.zusTotal > 0 && (
                <tr>
                  <td className="py-3 px-4 font-medium">ZUS i fundusze pracodawcy</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(results.zusTotal)}</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(results.zusTotal / inputs.workerCount)}</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(results.zusTotal / (inputs.workerCount * inputs.hoursPerMonth))}</td>
                </tr>
              )}
              {results.ppkAmount > 0 && (
                <tr>
                  <td className="py-3 px-4 font-medium">PPK pracodawcy</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(results.ppkAmount)}</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(results.ppkAmount / inputs.workerCount)}</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(results.ppkAmount / (inputs.workerCount * inputs.hoursPerMonth))}</td>
                </tr>
              )}
              {inputs.contractType === 'Praca tymczasowa' && results.vacationReserve > 0 && (
                <tr>
                  <td className="py-3 px-4 font-medium">Rezerwa urlopowa / koszty APT</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(results.vacationReserve)}</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(results.vacationReserve / inputs.workerCount)}</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(results.vacationReserve / (inputs.workerCount * inputs.hoursPerMonth))}</td>
                </tr>
              )}

              {/* Additional Billed Costs */}
              {getBilledAdditionalCosts().map(cost => {
                const isProject = cost.isProjectLevel;
                const totalVal = isProject ? cost.amountPerPerson : cost.amountPerPerson * inputs.workerCount;
                return (
                  <tr key={cost.id} className="text-gray-600">
                    <td className="py-3 px-4">
                      {cost.label}
                      {cost.mode === 'refaktura_1do1' && ' (refaktura 1:1)'}
                      {cost.mode === 'refaktura_z_marza' && ' (refaktura z marżą)'}
                    </td>
                    <td className="py-3 px-4 text-right">{formatCurrency(totalVal)}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(totalVal / inputs.workerCount)}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(totalVal / (inputs.workerCount * inputs.hoursPerMonth))}</td>
                  </tr>
                );
              })}

              <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
                <td className="py-3 px-4">KOSZT WŁASNY AGENCJI</td>
                <td className="py-3 px-4 text-right">{formatCurrency(results.agencyCost)}</td>
                <td className="py-3 px-4 text-right">{formatCurrency(results.agencyCost / inputs.workerCount)}</td>
                <td className="py-3 px-4 text-right">{formatCurrency(results.agencyCost / (inputs.workerCount * inputs.hoursPerMonth))}</td>
              </tr>

              <tr className="bg-[#396542]/10 font-bold text-lg">
                <td className="py-4 px-4 text-[#396542]">WARTOŚĆ FAKTURY DLA KLIENTA</td>
                <td className="py-4 px-4 text-right text-[#396542]">{formatCurrency(results.totalMonthlyBilling)}</td>
                <td className="py-4 px-4 text-right text-[#396542]">{formatCurrency(results.totalMonthlyBilling / inputs.workerCount)}</td>
                <td className="py-4 px-4 text-right text-[#396542]"></td>
              </tr>
              <tr>
                <td colSpan={4} className="py-6 text-center">
                  <div className="inline-block border-2 border-[#c0a068] rounded-xl p-4 bg-[#c0a068]/10">
                    <div className="text-sm text-gray-600 font-medium mb-1">STAWKA SPRZEDAŻOWA RBH</div>
                    <div className="text-4xl font-bold text-[#c0a068]">
                      {formatCurrency(results.finalHourlyRate)}
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {results.clientSideCosts.length > 0 && (
          <div className="mb-8">
            <h3 className="font-bold text-gray-800 mb-2 border-b border-gray-200 pb-2">Po stronie Klienta:</h3>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              {results.clientSideCosts.map(cost => (
                <li key={cost.id}>{cost.label}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-16 pt-8 border-t border-gray-200 text-sm">
          <p className="mb-8 font-medium">Termin płatności: 14 dni od daty wystawienia faktury</p>

          <div className="flex justify-between mt-16">
            <div className="w-64 border-t border-gray-400 text-center pt-2 text-gray-500">
              data i podpis przedstawiciela Agencji
            </div>
            <div className="w-64 border-t border-gray-400 text-center pt-2 text-gray-500">
              data i podpis Klienta
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center no-print">
          <button
            onClick={() => window.print()}
            className="bg-[#c0a068] text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:bg-[#b09058] transition-colors"
          >
            Drukuj / Zapisz PDF
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
                    <span className="text-gray-600">Marża agencji %</span>
                    <span className="font-bold">{inputs.marginPercent}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Marża agencji zł/miesiąc</span>
                    <span className="font-bold">{formatCurrency(results.marginAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Marża agencji zł/rbh</span>
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
      </div>
    </div>
  );
};

export default APTOffer;
