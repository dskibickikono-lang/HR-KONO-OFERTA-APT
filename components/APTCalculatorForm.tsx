import React, { useState, useEffect } from 'react';
import { useAPTCalculation, calculateReverse, getMarginStatus, APTInputs, APTResults, AdditionalCost, Entity, ContractType, ContractorVariant, ViewMode, MarginStatus } from '../hooks/useAPTCalculation';
import { CostRow, COST_ROW_LAYOUT_CLASSES } from './CostRow';
import { Building2, FileText, Calculator, AlertTriangle, ChevronDown, ChevronUp, User, CalendarClock, Eye, Unlock } from 'lucide-react';
import { HelpPopover } from './HelpPopover';
import { HELP_CONTENT } from '../constants/helpContent';

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
  onGenerate: (data: { inputs: APTInputs, results: APTResults, viewMode: ViewMode }) => void;
  initialData?: { inputs: APTInputs, results: APTResults } | null;
}

// Domyślna ważność oferty: dziś + 30 dni, format YYYY-MM-DD dla <input type="date">.
const getDefaultValidUntil = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
};

const DEFAULT_INPUTS: APTInputs = {
  entity: 'HR KONO S.A.',
  clientName: '',
  position: '',
  preparedBy: '',
  validUntil: getDefaultValidUntil(),
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
const SESSION_ADVANCED_KEY = 'apt_calc_advanced_expanded';
const SESSION_PRICING_MODE_KEY = 'apt_calc_pricing_mode';
const SESSION_VIEW_MODE_KEY = 'apt_calc_view_mode';
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
  // Merge z DEFAULT_INPUTS: gwarantuje, że nowo dodane (opcjonalne) pola jak
  // preparedBy/validUntil mają wartość także przy danych zapisanych przed ich wprowadzeniem.
  if (initialData?.inputs) return { ...DEFAULT_INPUTS, ...initialData.inputs };
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (
        parsed &&
        parsed.version === SESSION_VERSION &&
        validateAPTInputs(parsed.data)
      ) {
        return { ...DEFAULT_INPUTS, ...parsed.data };
      }
    }
  } catch (e) {
    console.warn('Failed to parse session storage, falling back to defaults.');
  }
  return DEFAULT_INPUTS;
};

const APTCalculatorForm: React.FC<Props> = ({ onGenerate, initialData }) => {
  const [inputs, setInputs] = useState<APTInputs>(getInitialInputs(initialData));
  const [advancedExpanded, setAdvancedExpanded] = useState<boolean>(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_ADVANCED_KEY);
      return stored === 'true';
    } catch {
      return false;
    }
  });

  const [isReverseMode, setIsReverseMode] = useState<boolean>(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_PRICING_MODE_KEY);
      return stored === 'true';
    } catch {
      return false;
    }
  });
  const [targetHourlyRate, setTargetHourlyRate] = useState<string>('');

  // Tryb widoku panelu podsumowania: 'internal' (pełne dane) vs 'client' (bezpieczny
  // do pokazania klientowi — bez kosztu własnego i marży PLN). Persystowany w sesji.
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      return sessionStorage.getItem(SESSION_VIEW_MODE_KEY) === 'client' ? 'client' : 'internal';
    } catch {
      return 'internal';
    }
  });

  useEffect(() => {
    sessionStorage.setItem(SESSION_ADVANCED_KEY, String(advancedExpanded));
  }, [advancedExpanded]);

  useEffect(() => {
    sessionStorage.setItem(SESSION_PRICING_MODE_KEY, String(isReverseMode));
  }, [isReverseMode]);

  useEffect(() => {
    sessionStorage.setItem(SESSION_VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
      version: SESSION_VERSION,
      data: inputs
    }));
  }, [inputs]);

  // Compute the derived gross rate synchronously
  let displayGrossRate = inputs.grossRateHourly;
  const parsedTarget = Number(targetHourlyRate);
  if (isReverseMode && targetHourlyRate !== '' && Number.isFinite(parsedTarget) && parsedTarget >= 0) {
    displayGrossRate = calculateReverse(inputs, parsedTarget);
  }

  // Use the derived gross rate for calculations
  const results = useAPTCalculation({ ...inputs, grossRateHourly: displayGrossRate });

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

  // Marża OD WARTOŚCI SPRZEDAŻY (model Gi Group): zysk / wartość faktury bazowej.
  // Z definicji równa się wpisanej marginPercent, ale liczymy ją z wyników, aby badge
  // nigdy nie rozjechał się z polem wejściowym ani z formułą billing = koszt / (1 - marża%).
  const marginOnSalesPercentage = results.baseMonthlyBilling > 0
    ? (results.marginAmount / results.baseMonthlyBilling) * 100
    : 0;

  // Status marży z pojedynczego źródła (hook) — spójny z wizualizacją w PDF.
  const marginStatus = getMarginStatus(marginOnSalesPercentage);
  const STATUS_GRADIENT: Record<MarginStatus, string> = {
    risk: 'bg-gradient-to-r from-rose-400 to-rose-600 text-white',
    warning: 'bg-gradient-to-r from-amber-400 to-amber-600 text-white',
    healthy: 'bg-gradient-to-r from-emerald-400 to-emerald-600 text-white',
  };
  const marginHealthConfig = { label: marginStatus.label, color: STATUS_GRADIENT[marginStatus.status] };

  // Listy kosztów dla widoku klienta (spójne z PDF: w stawce / refaktury / po stronie klienta).
  const inStawceCosts = inputs.additionalCosts.filter(
    c => c.mode === 'w_stawce' && c.amountPerPerson > 0
  );
  const refakturaCostsView = inputs.additionalCosts.filter(
    c => (c.mode === 'refaktura_z_marza' || c.mode === 'refaktura_1do1') && c.amountPerPerson > 0
  );

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

  const hasOneTimeCost = inputs.additionalCosts.some(cost => !cost.isPerMonth && cost.amountPerPerson > 0);
  const positionLower = inputs.position.toLowerCase();
  const positionHasForeignKeywords = ['ukraina', 'ukrainiec', 'ukrainka', 'białoruś', 'cudzoziemiec', 'obcokrajowiec', 'zagraniczny'].some(keyword => positionLower.includes(keyword));
  const legalCost = inputs.additionalCosts.find(c => c.id === 'legalizacja')?.amountPerPerson || 0;

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
                {positionHasForeignKeywords && legalCost === 0 && (
                  <div className="flex items-start gap-1 mt-1 text-yellow-600 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>Pole legalizacji wynosi 0 zł. Czy wszyscy pracownicy to obywatele polscy?</span>
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">Typ kalkulacji</label>
                  <HelpPopover title={HELP_CONTENT.contractType.title} content={HELP_CONTENT.contractType.content} />
                </div>
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
                <div className="flex items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">Wariant zleceniobiorcy</label>
                  <HelpPopover title={HELP_CONTENT.contractorVariant.title} content={HELP_CONTENT.contractorVariant.content} />
                </div>
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
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Tryb kalkulacji stawki</label>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => {
                        if (isReverseMode) {
                          setInputs(prev => ({ ...prev, grossRateHourly: displayGrossRate }));
                        }
                        setIsReverseMode(false);
                      }}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${!isReverseMode ? 'bg-white shadow-sm font-semibold text-[#396542]' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Od pracownika
                    </button>
                    <button
                      onClick={() => setIsReverseMode(true)}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${isReverseMode ? 'bg-white shadow-sm font-semibold text-[#396542]' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Od klienta (Reverse)
                    </button>
                  </div>
                </div>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Godziny / miesiąc / osoba</label>
                  <input
                    type="number"
                    min="0"
                    value={inputs.hoursPerMonth}
                    onChange={(e) => handleInputChange('hoursPerMonth', toNumber(e.target.value))}
                    className={`w-full px-3 py-2 border ${inputs.hoursPerMonth < 0 ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-[#396542] outline-none`}
                  />
                  {inputs.hoursPerMonth < 0 && <span className="text-xs text-red-500">Nie może być mniejsze niż 0</span>}
                  {inputs.hoursPerMonth >= 0 && (inputs.hoursPerMonth < 40 || inputs.hoursPerMonth > 240) && (
                    <div className="flex items-start gap-1 mt-1 text-yellow-600 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>Wartość poza typowym zakresem (40–240 h). Czy to poprawne?</span>
                    </div>
                  )}
                </div>
              </div>
              {isReverseMode ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center mb-1">
                      <label className="block text-sm font-medium text-[#c0a068]">Docelowa stawka klienta / h</label>
                      <HelpPopover title={HELP_CONTENT.grossRateHourly.title} content={HELP_CONTENT.grossRateHourly.content} />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={targetHourlyRate}
                      onChange={(e) => setTargetHourlyRate(e.target.value)}
                      className="w-full px-3 py-2 border border-[#c0a068] rounded-md focus:ring-2 focus:ring-[#396542] outline-none bg-[#c0a068]/5"
                      placeholder="np. 50.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Stawka brutto (wyliczona)</label>
                    <input
                      type="number"
                      value={displayGrossRate}
                      readOnly
                      disabled
                      className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Stawka brutto pracownika / h</label>
                    <HelpPopover title={HELP_CONTENT.grossRateHourly.title} content={HELP_CONTENT.grossRateHourly.content} />
                  </div>
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
              )}
              <div>
                <div className="flex items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">Marża brutto % — od wartości sprzedaży</label>
                  <HelpPopover title={HELP_CONTENT.marginPercent.title} content={HELP_CONTENT.marginPercent.content} />
                </div>
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
                <div className="flex items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Składka wypadkowa %
                    {inputs.entity !== 'Inny' && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">AUTO</span>
                    )}
                  </label>
                  <HelpPopover title={HELP_CONTENT.accidentInsuranceRate.title} content={HELP_CONTENT.accidentInsuranceRate.content} />
                </div>
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

              {/* Metadane oferty: kto przygotował + do kiedy ważna (wyłącznie do PDF, bez wpływu na kalkulację) */}
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 mt-2 border-t border-gray-100">
                <div>
                  <label htmlFor="preparedBy" className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                    <User className="w-4 h-4 text-[#c0a068]" />
                    Przygotował/a
                  </label>
                  <input
                    id="preparedBy"
                    type="text"
                    value={inputs.preparedBy ?? ''}
                    onChange={(e) => handleInputChange('preparedBy', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-slate-100 focus:bg-white focus:ring-2 focus:ring-[#396542] outline-none transition-colors"
                    placeholder="Imię i nazwisko handlowca"
                  />
                </div>
                <div>
                  <label htmlFor="validUntil" className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                    <CalendarClock className="w-4 h-4 text-[#c0a068]" />
                    Oferta ważna do
                  </label>
                  <input
                    id="validUntil"
                    type="date"
                    value={inputs.validUntil ?? ''}
                    onChange={(e) => handleInputChange('validUntil', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-slate-100 focus:bg-white focus:ring-2 focus:ring-[#396542] outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Parametry pracodawcy */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setAdvancedExpanded(!advancedExpanded)}
            >
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-[#c0a068]" />
                <h2 className="text-xl font-semibold">Parametry pracodawcy</h2>
                {(!advancedExpanded && (
                  inputs.ppkEmployerRate !== DEFAULT_INPUTS.ppkEmployerRate ||
                  inputs.vacationReserveRate !== DEFAULT_INPUTS.vacationReserveRate ||
                  inputs.contractHorizonMonths !== DEFAULT_INPUTS.contractHorizonMonths
                )) && (
                  <span className="ml-2 w-2 h-2 rounded-full bg-yellow-500" title="Zmieniono wartości domyślne" />
                )}
              </div>
              <div className="flex items-center gap-4">
                {!advancedExpanded && (
                  <div className="hidden md:flex text-sm text-gray-500 gap-4">
                    <span>PPK: {inputs.ppkEmployerRate}%</span>
                    <span>Urlop: {inputs.vacationReserveRate}%</span>
                    <span>Horyzont: {inputs.contractHorizonMonths} mc</span>
                  </div>
                )}
                {advancedExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </div>
            </div>

            {advancedExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <div className="flex items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">PPK pracodawcy %</label>
                  <HelpPopover title={HELP_CONTENT.ppkEmployerRate.title} content={HELP_CONTENT.ppkEmployerRate.content} />
                </div>
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
                <div className="flex items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">Horyzont kontraktu (miesiące)</label>
                  <HelpPopover title={HELP_CONTENT.contractHorizonMonths.title} content={HELP_CONTENT.contractHorizonMonths.content} />
                </div>
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
                {inputs.contractHorizonMonths > 0 && inputs.contractHorizonMonths <= 2 && hasOneTimeCost && (
                  <div className="flex items-start gap-1 mt-1 text-yellow-600 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>Krótki horyzont znacząco podwyższa stawkę godzinową przez wysoką amortyzację kosztów jednorazowych.</span>
                  </div>
                )}
              </div>
            </div>
            )}
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
            <div className="flex items-center justify-between gap-2 mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Calculator className="w-5 h-5 text-[#c0a068]" />
                Podsumowanie
              </h2>
              <div className="flex bg-white/10 rounded-lg p-0.5 text-xs" role="group" aria-label="Tryb widoku panelu">
                <button
                  type="button"
                  onClick={() => setViewMode('internal')}
                  aria-pressed={viewMode === 'internal'}
                  title="Pełne dane (koszt własny, marża PLN, rozbicie)"
                  className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${viewMode === 'internal' ? 'bg-white text-[#396542] font-semibold shadow-sm' : 'text-white/70 hover:text-white'}`}
                >
                  <Unlock className="w-3.5 h-3.5" /> Wewn.
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('client')}
                  aria-pressed={viewMode === 'client'}
                  title="Bezpieczny widok do pokazania klientowi"
                  className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${viewMode === 'client' ? 'bg-white text-[#396542] font-semibold shadow-sm' : 'text-white/70 hover:text-white'}`}
                >
                  <Eye className="w-3.5 h-3.5" /> Klient
                </button>
              </div>
            </div>

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
              {/* Stawka godzinowa — etykieta i wartość zależą od trybu widoku */}
              {viewMode === 'internal' ? (
                <div className="bg-white/10 p-4 rounded-lg">
                  <div className="text-sm opacity-80 mb-1">Stawka godzinowa łączna (z refakturami)</div>
                  <div className="text-3xl font-bold text-[#c0a068]">
                    {formatCurrency(results.finalHourlyRate)}
                  </div>
                </div>
              ) : (
                <div className="bg-[#c0a068]/20 border-2 border-[#c0a068] p-4 rounded-lg text-center">
                  <div className="text-sm opacity-90 mb-1">Stawka godzinowa za usługę</div>
                  <div className="text-4xl font-bold text-[#c0a068]">
                    {formatCurrency(results.baseHourlyRate)}
                  </div>
                </div>
              )}

              {viewMode === 'internal' ? (
                <>
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
                        <span className="opacity-80 text-sm">Marża brutto (od sprzedaży)</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xl font-bold text-white">{marginOnSalesPercentage.toFixed(2)}%</span>
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
                            <th className="py-2 px-2 text-right">Na rbh (roboczo-godz.)</th>
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
                          {results.ppkAmount > 0 && (
                            <tr className="border-b border-white/10 text-white/70">
                              <td className="py-2 px-2 pl-4">└ PPK</td>
                              <td className="py-2 px-2 text-right">{formatCurrency(results.ppkAmount)}</td>
                              <td className="py-2 px-2 text-right">{perPerson(results.ppkAmount)}</td>
                              <td className="py-2 px-2 text-right">{perRbh(results.ppkAmount)}</td>
                            </tr>
                          )}
                          {results.vacationReserve > 0 && (
                            <tr className="border-b border-white/10 text-white/70">
                              <td className="py-2 px-2 pl-4">└ Urlop</td>
                              <td className="py-2 px-2 text-right">{formatCurrency(results.vacationReserve)}</td>
                              <td className="py-2 px-2 text-right">{perPerson(results.vacationReserve)}</td>
                              <td className="py-2 px-2 text-right">{perRbh(results.vacationReserve)}</td>
                            </tr>
                          )}
                          {results.additionalCostBreakdown.map(cost => (
                            <tr key={cost.id} className="border-b border-white/10 text-white/70">
                              <td className="py-2 px-2 pl-4">└ {cost.label.split(' /')[0]}</td>
                              <td className="py-2 px-2 text-right">{formatCurrency(cost.billedMonthlyTotal)}</td>
                              <td className="py-2 px-2 text-right">{perPerson(cost.billedMonthlyTotal)}</td>
                              <td className="py-2 px-2 text-right">{formatCurrency(cost.perRbh)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-5">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-white/10 pb-2">
                      <span className="opacity-80 text-sm">Marża brutto (od sprzedaży)</span>
                      <span className="font-semibold">{marginOnSalesPercentage.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/10 pb-2">
                      <span className="opacity-80 text-sm">Szacowana wartość faktury / mc</span>
                      <span className="font-semibold">{formatCurrency(results.totalMonthlyBilling)}</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-[#c0a068] mb-2">W stawce zawarte</h3>
                    <ul className="text-sm space-y-1">
                      <li className="flex items-start gap-2"><span className="text-[#c0a068]">✓</span>Obsługa administracyjno-kadrowa i płacowa</li>
                      {inStawceCosts.map(c => (
                        <li key={c.id} className="flex items-start gap-2"><span className="text-[#c0a068]">✓</span>{c.label.split(' /')[0]}</li>
                      ))}
                    </ul>
                  </div>

                  {refakturaCostsView.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-[#c0a068] mb-2">Refaktury (osobne pozycje faktury)</h3>
                      <ul className="text-sm space-y-1">
                        {refakturaCostsView.map(c => (
                          <li key={c.id} className="flex items-start gap-2">
                            <span className="text-[#c0a068]">→</span>
                            <span>{c.label.split(' /')[0]} <span className="opacity-60 text-xs">({c.mode === 'refaktura_z_marza' ? 'z marżą' : '1:1'})</span></span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {results.clientSideCosts.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-[#c0a068] mb-2">Po stronie klienta</h3>
                      <ul className="text-sm space-y-1">
                        {results.clientSideCosts.map(c => (
                          <li key={c.id} className="flex items-start gap-2"><span className="opacity-70">•</span>{c.label.split(' /')[0]}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {(() => {
                const hintId = 'generate-btn-hint';
                return (
                  <>
                    <button
                      onClick={() => onGenerate({ inputs, results, viewMode })}
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
