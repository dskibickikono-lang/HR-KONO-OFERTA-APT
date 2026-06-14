import React, { useState, useEffect } from 'react';
import { useAPTCalculation, APTInputs, APTResults, AdditionalCost, Entity, ContractType, ContractorVariant } from '../hooks/useAPTCalculation';
import { CostRow } from './CostRow';
import { Building2, FileText, Calculator } from 'lucide-react';

const DEFAULT_ADDITIONAL_COSTS: AdditionalCost[] = [
  { id: 'rekrutacja', label: 'Rekrutacja i onboarding / os.', amountPerPerson: 350, mode: 'w_stawce', isPerMonth: false },
  { id: 'badania', label: 'Badania lekarskie / os.', amountPerPerson: 120, mode: 'refaktura_1do1', isPerMonth: false },
  { id: 'bhp', label: 'BHP i odzież / os.', amountPerPerson: 270, mode: 'w_stawce', isPerMonth: false },
  { id: 'legalizacja', label: 'Legalizacja / os.', amountPerPerson: 0, mode: 'refaktura_1do1', isPerMonth: false },
  { id: 'zakwaterowanie', label: 'Zakwaterowanie / os. / miesiąc', amountPerPerson: 700, mode: 'refaktura_1do1', isPerMonth: true },
  { id: 'transport', label: 'Transport / os. / miesiąc', amountPerPerson: 150, mode: 'refaktura_1do1', isPerMonth: true },
  { id: 'koordynator', label: 'Koordynator projektu / miesiąc', amountPerPerson: 1000, mode: 'w_stawce', isPerMonth: true, isProjectLevel: true },
];

interface Props {
  onGenerate: (data: { inputs: APTInputs, results: APTResults }) => void;
  initialData?: { inputs: APTInputs, results: APTResults } | null;
}

const APTCalculatorForm: React.FC<Props> = ({ onGenerate, initialData }) => {
  const [inputs, setInputs] = useState<APTInputs>(initialData?.inputs || {
    entity: 'HR KONO S.A.',
    clientName: '',
    position: '',
    contractType: 'Umowa zlecenie',
    contractorVariant: 'Standard ozusowany',
    workerCount: 1,
    hoursPerMonth: 168,
    grossRateHourly: 31.40,
    marginPercent: 18,
    accidentInsuranceRate: 1.20,
    ppkEmployerRate: 1.5,
    vacationReserveRate: 8.3,
    additionalCosts: DEFAULT_ADDITIONAL_COSTS,
  });

  const results = useAPTCalculation(inputs);

  // Auto-set accident insurance rate when entity changes
  useEffect(() => {
    if (inputs.entity === 'HR KONO S.A.') {
      setInputs(prev => ({ ...prev, accidentInsuranceRate: 1.20 }));
    } else if (inputs.entity === 'APT WORK Sp. z o.o.') {
      setInputs(prev => ({ ...prev, accidentInsuranceRate: 0.93 }));
    }
  }, [inputs.entity]);

  const handleInputChange = (field: keyof APTInputs, value: any) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const handleCostChange = (updatedCost: AdditionalCost) => {
    setInputs(prev => ({
      ...prev,
      additionalCosts: prev.additionalCosts.map(c => c.id === updatedCost.id ? updatedCost : c)
    }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(value);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-3 mb-8 text-[#396542]">
        <Building2 className="w-8 h-8" />
        <h1 className="text-3xl font-bold">Kalkulator APT</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Dane podstawowe */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#c0a068]" />
              Dane podstawowe
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Podmiot zatrudniający</label>
                <select
                  value={inputs.entity}
                  onChange={(e) => handleInputChange('entity', e.target.value as Entity)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#396542] outline-none"
                >
                  <option value="HR KONO S.A.">HR KONO S.A.</option>
                  <option value="APT WORK Sp. z o.o.">APT WORK Sp. z o.o.</option>
                  <option value="Inny">Inny</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa klienta</label>
                <input
                  type="text"
                  value={inputs.clientName}
                  onChange={(e) => handleInputChange('clientName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#396542] outline-none"
                  placeholder="Wpisz nazwę klienta"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stanowisko/czynności</label>
                <input
                  type="text"
                  value={inputs.position}
                  onChange={(e) => handleInputChange('position', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#396542] outline-none"
                  placeholder="np. Kompletacja zamówień"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Typ kalkulacji</label>
                <select
                  value={inputs.contractType}
                  onChange={(e) => handleInputChange('contractType', e.target.value as ContractType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#396542] outline-none"
                >
                  <option value="Umowa zlecenie">Umowa zlecenie</option>
                  <option value="Praca tymczasowa">Praca tymczasowa</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wariant zleceniobiorcy</label>
                <select
                  value={inputs.contractorVariant}
                  onChange={(e) => handleInputChange('contractorVariant', e.target.value as ContractorVariant)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#396542] outline-none"
                >
                  <option value="Standard ozusowany">Standard ozusowany</option>
                  <option value="Student do 26 lat">Student do 26 lat</option>
                  <option value="Zbieg tytułów - bez społecznych">Zbieg tytułów - bez społecznych</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Liczba pracowników</label>
                  <input
                    type="number"
                    min="1"
                    value={inputs.workerCount}
                    onChange={(e) => handleInputChange('workerCount', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#396542] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Godziny / mc / os.</label>
                  <input
                    type="number"
                    min="1"
                    value={inputs.hoursPerMonth}
                    onChange={(e) => handleInputChange('hoursPerMonth', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#396542] outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stawka brutto pracownika / h</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={inputs.grossRateHourly}
                  onChange={(e) => handleInputChange('grossRateHourly', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#396542] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marża agencji %</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={inputs.marginPercent}
                  onChange={(e) => handleInputChange('marginPercent', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#396542] outline-none"
                />
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Składka wypadkowa %
                  {inputs.entity !== 'Inny' && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">AUTO</span>
                  )}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={inputs.entity !== 'Inny'}
                  value={inputs.accidentInsuranceRate}
                  onChange={(e) => handleInputChange('accidentInsuranceRate', Number(e.target.value))}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#396542] outline-none ${inputs.entity !== 'Inny' ? 'bg-gray-100' : ''}`}
                />
              </div>
            </div>
          </div>

          {/* Parametry APT */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-[#c0a068]" />
              Parametry APT
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PPK pracodawcy %</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={inputs.ppkEmployerRate}
                  onChange={(e) => handleInputChange('ppkEmployerRate', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#396542] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rezerwa urlopowa % (APT)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={inputs.vacationReserveRate}
                  onChange={(e) => handleInputChange('vacationReserveRate', Number(e.target.value))}
                  disabled={inputs.contractType !== 'Praca tymczasowa'}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#396542] outline-none ${inputs.contractType !== 'Praca tymczasowa' ? 'bg-gray-100 opacity-60' : ''}`}
                />
                {inputs.contractType !== 'Praca tymczasowa' && (
                   <p className="text-xs text-gray-500 mt-1">Dostępne tylko dla "Praca tymczasowa"</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Koszty dodatkowe */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#c0a068]" />
              Koszty dodatkowe
            </h2>
            <div className="space-y-2">
              {inputs.additionalCosts.map(cost => (
                <CostRow key={cost.id} cost={cost} onChange={handleCostChange} />
              ))}
            </div>
          </div>
        </div>

        {/* Live Preview Panel (Right Column) */}
        <div className="lg:col-span-1">
          <div className="bg-[#396542] text-white p-6 rounded-xl shadow-lg sticky top-8">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-[#c0a068]" />
              Podsumowanie
            </h2>

            <div className="space-y-6">
              <div className="bg-white/10 p-4 rounded-lg">
                <div className="text-sm opacity-80 mb-1">Stawka godzinowa (dla klienta)</div>
                <div className="text-3xl font-bold text-[#c0a068]">
                  {formatCurrency(results.finalHourlyRate)}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="opacity-80 text-sm">Łączna wartość faktury / mc</span>
                  <span className="font-semibold">{formatCurrency(results.totalMonthlyBilling)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="opacity-80 text-sm">Koszt własny agencji / mc</span>
                  <span className="font-semibold">{formatCurrency(results.agencyCost)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="opacity-80 text-sm">Marża</span>
                  <span className="font-semibold text-[#c0a068]">
                    {formatCurrency(results.marginAmount)} / {formatCurrency(results.marginPerHour)}/rbh
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="opacity-80 text-sm">Pracownik otrzymuje netto / h</span>
                  <span className="font-semibold">{formatCurrency(results.workerNetto)}</span>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-semibold mb-2 opacity-80">Rozbicie kosztów (dla {inputs.workerCount} os.)</h3>
                <div className="bg-white/5 rounded-lg text-xs">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="py-2 px-2 text-left">Pozycja</th>
                        <th className="py-2 px-2 text-right">Łącznie</th>
                        <th className="py-2 px-2 text-right">Na osobę</th>
                        <th className="py-2 px-2 text-right">Na RBH</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-white/10">
                        <td className="py-2 px-2">Brutto</td>
                        <td className="py-2 px-2 text-right">{formatCurrency(results.gross)}</td>
                        <td className="py-2 px-2 text-right">{formatCurrency(results.gross / inputs.workerCount)}</td>
                        <td className="py-2 px-2 text-right">{formatCurrency(inputs.grossRateHourly)}</td>
                      </tr>
                      {results.zusTotal > 0 && (
                        <tr className="border-b border-white/10">
                          <td className="py-2 px-2">ZUS</td>
                          <td className="py-2 px-2 text-right">{formatCurrency(results.zusTotal)}</td>
                          <td className="py-2 px-2 text-right">{formatCurrency(results.zusTotal / inputs.workerCount)}</td>
                          <td className="py-2 px-2 text-right">{formatCurrency(results.zusTotal / (inputs.workerCount * inputs.hoursPerMonth))}</td>
                        </tr>
                      )}
                       <tr className="border-b border-white/10">
                          <td className="py-2 px-2">Koszty APT</td>
                          <td className="py-2 px-2 text-right">{formatCurrency(results.internalCosts)}</td>
                          <td className="py-2 px-2 text-right">{formatCurrency(results.internalCosts / inputs.workerCount)}</td>
                          <td className="py-2 px-2 text-right">{formatCurrency(results.internalCosts / (inputs.workerCount * inputs.hoursPerMonth))}</td>
                        </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <button
                onClick={() => onGenerate({ inputs, results })}
                className="w-full bg-[#c0a068] text-white py-3 px-4 rounded-lg font-bold hover:bg-[#b09058] transition-colors mt-6 shadow-lg"
              >
                Generuj Ofertę PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default APTCalculatorForm;
