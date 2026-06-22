import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import APTOffer from './components/APTOffer';
import APTCalculatorForm from './components/APTCalculatorForm';
import { APTInputs, APTResults, ViewMode } from './hooks/useAPTCalculation';

export type CalculationData = {
  inputs: APTInputs;
  results: APTResults;
  viewMode?: ViewMode;
};

const App: React.FC = () => {
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [data, setData] = useState<CalculationData | null>(null);

  const handleGenerate = (calculatedData: CalculationData) => {
    setData(calculatedData);
    setView('preview');
  };

  return (
    <div className="w-full min-h-screen bg-slate-50">
      {view === 'edit' ? (
        <APTCalculatorForm onGenerate={handleGenerate} initialData={data} />
      ) : (
        <div className="relative">
          <button 
            onClick={() => setView('edit')}
            aria-label="Wróć do edycji formularza"
            className="fixed top-8 left-8 bg-slate-800 text-white px-6 py-2 rounded-full shadow-xl hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400 transition-all z-50 print:hidden font-bold flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" /> Wróć do edycji
          </button>
          {data && <APTOffer data={data} />}
        </div>
      )}
    </div>
  );
};

export default App;
