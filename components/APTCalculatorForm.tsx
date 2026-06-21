import React, { useState, useEffect } from 'react';
import { useAPTCalculation, APTInputs, APTResults, AdditionalCost, Entity, ContractType, ContractorVariant } from '../hooks/useAPTCalculation';
import { CostRow, COST_ROW_LAYOUT_CLASSES } from './CostRow';
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

const DEFAULT_INPUTS: APTInputs = {
  entity: 'HR KONO S.A.',
  clientName: '',
  position: '',
  contractType: 'Umowa zlecenie',
  contractorVariant: 'Standard ozusowany',
  workerCount: 1,
  hoursPerMonth: 168,
  grossRateHourly: 31.40,
  marginPercent: 18,
  contractHorizonMonths: 3,
  accidentInsuranceRate: 1.20,
  ppkEmployerRate: 1.5,
  vacationReserveRate: 8.3,
  additionalCosts: DEFAULT_ADDITIONAL_COSTS,
};

const SESSION_STORAGE_KEY = 'apt_calc_session';
const SESSION_VERSION = 1;

const validateAPTInputs = (data: any): data is APTInputs => {
  if (!data || typeof data !== 'object') return false;

  // Basic structural validation to ensure it's a valid APTInputs object
  const requiredKeys: (keyof APTInputs)[] = [
    'entity', 'clientName', 'position', 'contractType', 'contractorVariant',
    'workerCount', 'hoursPerMonth', 'grossRateHourly', 'marginPercent',
    'contractHorizonMonths', 'accidentInsuranceRate', 'ppkEmployerRate',
    'vacationReserveRate', 'additionalCosts'
  ];

  for (const key of requiredKeys) {
    if (!(key in data)) return false;
  }

  if (typeof data.workerCount !== 'number' || typeof data.clientName !== 'string') return false;
  if (!Array.isArray(data.additionalCosts)) return false;

  return true;
};

const getInitialInputs = (initialData?: { inputs: APTInputs } | null): APTInputs => {
  if (initialData?.inputs) return initialData.inputs;
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (
        parsed &&
        parsed.version === SESSION_VERSION &&
        validateAPTInputs(parsed.data)
      ) {
        return parsed.data;
      }
    }
  } catch (e) {
    console.warn('Failed to parse session storage, falling back to defaults.');
  }
  return DEFAULT_INPUTS;
};

const APTCalculatorForm: React.FC<Props> = ({ onGenerate, initialData }) => {
  const [inputs, setInputs] = useState<APTInputs>(getInitialInputs(initialData));

  useEffect(() => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
      version: SESSION_VERSION,
      data: inputs
    }));
  }, [inputs]);

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

  // Pusty / niepoprawny input liczbowy => 0 zamiast NaN (MED-3).
  const toNumber = (value: string): number => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  // Guardy przed dzieleniem przez zero w podglądzie (MED-1).
  const totalHours = inputs.workerCount * inputs.hoursPerMonth;
  const perPerson = (value: number) =>
    inputs.workerCount > 0 ? formatCurrency(value / inputs.workerCount) : '—';
  const perRbh = (value: number) =>
    totalHours > 0 ? formatCurrency(value / totalHours) : '—';

  const marginOfCostPercentage = results.agencyCost > 0 ? (results.marginAmount / results.agencyCost) * 100 : 0;

  let marginHealthConfig = { label: 'Uwaga', color: 'bg-yellow-500 text-black' };
  if (marginOfCostPercentage < 8) {
    marginHealthConfig = { label: 'Ryzyko', color: 'bg-red-500 text-white' };
  } else if (marginOfCostPercentage > 12) {
    marginHealthConfig = { label: 'Zdrowa', color: 'bg-emerald-500 text-white' };
  }

  const isFormValid = inputs.workerCount >= 1 &&
                      inputs.hoursPerMonth >= 0 &&
                      inputs.grossRateHourly >= 0 &&
                      inputs.marginPercent >= 0 &&
                      inputs.marginPercent < 100 &&
                      inputs.contractHorizonMonths >= 1 &&
                      inputs.accidentInsuranceRate >= 0 &&
                      inputs.ppkEmployerRate >= 0 &&
                      inputs.vacationReserveRate >= 0 &&
                      inputs.additionalCosts.every(cost => cost.amountPerPerson >= 0);

  const handleReset = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setInputs(DEFAULT_INPUTS);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3 text-[#396542]">
          <Building2 className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Kalkulator APT</h1>
        </div>
        <button
          onClick={handleReset}
          className="text-sm text-gray-500 hover:text-gray-800 underline decoration-gray-300 underline-offset-4 transition-colors"
          title="Przywróć wartości domyślne"
        >
          Resetuj kalkulator
        </button>
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
                    onChange={(e) => handleInputChange('workerCount', toNumber(e.target.value))}
                    className={`w-full px-3 py-2 border ${inputs.workerCount < 1 ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-[#396542] outline-none`}
                  />
                  {inputs.workerCount < 1 && <span className="text-xs text-red-500">Min. 1 pracownik</span>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Godziny / mc / os.</label>
                  <input
                    type="number"
                    min="0"
                    value={inputs.hoursPerMonth}
                    onChange={(e) => handleInputChange('hoursPerMonth', toNumber(e.target.value))}
                    className={`w-full px-3 py-2 border ${inputs.hoursPerMonth < 0 ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-[#396542] outline-none`}
                  />
                  {inputs.hoursPerMonth < 0 && <span className="text-xs text-red-500">Nie może być mniejsze niż 0</span>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stawka brutto pracownika / h</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={inputs.grossRateHourly}
                  onChange={(e) => handleInputChange('grossRateHourly', toNumber(e.target.value))}
                  className={`w-full px-3 py-2 border ${inputs.grossRateHourly < 0 ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-[#396542] outline-none`}
                />
                {inputs.grossRateHourly < 0 && <span className="text-xs text-red-500">Nie może być mniejsze niż 0</span>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marża agencji %</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={inputs.marginPercent}
                  onChange={(e) => handleInputChange('marginPercent', toNumber(e.target.value))}
                  className={`w-full px-3 py-2 border ${inputs.marginPercent < 0 || inputs.marginPercent >= 100 ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-[#396542] outline-none`}
                />
                {inputs.marginPercent < 0 && <span className="text-xs text-red-500">Nie może być mniejsza niż 0</span>}
                {inputs.marginPercent >= 100 && <span className="text-xs text-red-500">Marża od wartości sprzedaży musi być &lt; 100%</span>}
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
                  onChange={(e) => handleInputChange('accidentInsuranceRate', toNumber(e.target.value))}
                  className={`w-full px-3 py-2 border ${inputs.accidentInsuranceRate < 0 ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-[#396542] outline-none ${inputs.entity !== 'Inny' ? 'bg-gray-100' : ''}`}
                />
                {inputs.accidentInsuranceRate < 0 && <span className="text-xs text-red-500">Nie może być mniejsza niż 0</span>}
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
                  onChange={(e) => handleInputChange('ppkEmployerRate', toNumber(e.target.value))}
                  className={`w-full px-3 py-2 border ${inputs.ppkEmployerRate < 0 ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-[#396542] outline-none`}
                />
                {inputs.ppkEmployerRate < 0 && <span className="text-xs text-red-500">Nie może być mniejsze niż 0</span>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rezerwa urlopowa % (APT)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={inputs.vacationReserveRate}
                  onChange={(e) => handleInputChange('vacationReserveRate', toNumber(e.target.value))}
                  disabled={inputs.contractType !== 'Praca tymczasowa'}
                  className={`w-full px-3 py-2 border ${inputs.vacationReserveRate < 0 ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-[#396542] outline-none ${inputs.contractType !== 'Praca tymczasowa' ? 'bg-gray-100 opacity-60' : ''}`}
                />
                {inputs.vacationReserveRate < 0 && <span className="text-xs text-red-500">Nie może być mniejsza niż 0</span>}
                {inputs.contractType !== 'Praca tymczasowa' && (
                   <p className="text-xs text-gray-500 mt-1">Dostępne tylko dla "Praca tymczasowa"</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Horyzont kontraktu (miesiące)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={inputs.contractHorizonMonths}
                  onChange={(e) => handleInputChange('contractHorizonMonths', toNumber(e.target.value))}
                  className={`w-full px-3 py-2 border ${inputs.contractHorizonMonths < 1 ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-[#396542] outline-none`}
                />
                <p className="text-xs text-gray-500 mt-1">Koszty jednorazowe rozkładane na tę liczbę miesięcy</p>
                {inputs.contractHorizonMonths < 1 && <span className="text-xs text-red-500">Min. 1 miesiąc</span>}
              </div>
            </div>
          </div>

          {/* Section 2: Koszty dodatkowe */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#c0a068]" />
              Koszty dodatkowe
            </h2>
            <div className={`${COST_ROW_LAYOUT_CLASSES.container} py-2 mb-2 border-b-2 border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider`}>
              <div className={COST_ROW_LAYOUT_CLASSES.label}>Nazwa kosztu</div>
              <div className={`${COST_ROW_LAYOUT_CLASSES.amount} text-right pr-2`}>Kwota (PLN)</div>
              <div className={COST_ROW_LAYOUT_CLASSES.mode}>Sposób rozliczenia</div>
              <div className={`${COST_ROW_LAYOUT_CLASSES.status} text-right pr-2`}>Status</div>
            </div>
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

            {(inputs.clientName || inputs.position) && (
              <div className="mb-6 pb-4 border-b border-white/20">
                {inputs.clientName && (
                  <div className="font-medium text-lg leading-tight mb-1">{inputs.clientName}</div>
                )}
                {inputs.position && (
                  <div className="text-sm text-[#c0a068] opacity-90">{inputs.position}</div>
                )}
              </div>
            )}

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
                <div className="flex justify-between items-center border-b border-white/10 pb-2 text-[#c0a068]">
                  <span className="opacity-90 text-sm">Wartość kontraktu</span>
                  <span className="font-bold">{formatCurrency(results.totalMonthlyBilling * inputs.contractHorizonMonths)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="opacity-80 text-sm">Koszt własny agencji / mc</span>
                  <span className="font-semibold">{formatCurrency(results.agencyCost)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <div className="flex flex-col">
                    <span className="opacity-80 text-sm">Marża (od kosztu)</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xl font-bold text-white">{marginOfCostPercentage.toFixed(2)}%</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${marginHealthConfig.color}`}>
                        {marginHealthConfig.label}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col">
                    <span className="font-semibold text-[#c0a068]">{formatCurrency(results.marginAmount)}</span>
                    <span className="text-xs text-[#c0a068] opacity-80">{formatCurrency(results.marginPerHour)} / rbh</span>
                  </div>
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
                        <td className="py-2 px-2 text-right">{perPerson(results.gross)}</td>
                        <td className="py-2 px-2 text-right">{formatCurrency(inputs.grossRateHourly)}</td>
                      </tr>
                      {results.zusTotal > 0 && (
                        <tr className="border-b border-white/10">
                          <td className="py-2 px-2">ZUS</td>
                          <td className="py-2 px-2 text-right">{formatCurrency(results.zusTotal)}</td>
                          <td className="py-2 px-2 text-right">{perPerson(results.zusTotal)}</td>
                          <td className="py-2 px-2 text-right">{perRbh(results.zusTotal)}</td>
                        </tr>
                      )}
                       <tr className="border-b border-white/10">
                          <td className="py-2 px-2">Koszty APT</td>
                          <td className="py-2 px-2 text-right">{formatCurrency(results.internalCosts)}</td>
                          <td className="py-2 px-2 text-right">{perPerson(results.internalCosts)}</td>
                          <td className="py-2 px-2 text-right">{perRbh(results.internalCosts)}</td>
                        </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {(() => {
                const hintId = 'generate-btn-hint';
                return (
                  <>
                    <button
                      onClick={() => onGenerate({ inputs, results })}
                      disabled={!isFormValid}
                      aria-disabled={!isFormValid}
                      aria-describedby={!isFormValid ? hintId : undefined}
                      title={!isFormValid ? "Wypełnij poprawnie wszystkie wymagane pola" : undefined}
                      className={`w-full text-white py-3 px-4 rounded-lg font-bold transition-colors mt-6 shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c0a068]/50 ${isFormValid ? 'bg-[#c0a068] hover:bg-[#b09058]' : 'bg-gray-400 cursor-not-allowed'}`}
                    >
                      Generuj Ofertę PDF
                    </button>
                    {!isFormValid && (
                      <p id={hintId} className="mt-2 text-xs text-gray-500 text-center">
                        Wypełnij poprawnie wszystkie wymagane pola
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default APTCalculatorForm;
