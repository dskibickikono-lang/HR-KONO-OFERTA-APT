import React, { useState } from 'react';
import APTOffer from './components/APTOffer';
import APTCalculatorForm from './components/APTCalculatorForm';
import { APTInputs, APTResults } from './hooks/useAPTCalculation';

export type CalculationData = {
  inputs: APTInputs;
  results: APTResults;
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
            className="fixed top-8 left-8 bg-slate-800 text-white px-6 py-2 rounded-full shadow-xl hover:bg-slate-700 transition-all z-50 print:hidden font-bold flex items-center gap-2"
          >
            ← Wróć do edycji
          </button>
          {data && <APTOffer data={data} />}
        </div>
      )}
    </div>
  );
};

export default App;
