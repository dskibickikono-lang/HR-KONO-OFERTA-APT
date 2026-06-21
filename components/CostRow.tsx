import React from 'react';
import { AdditionalCost, CostMode } from '../hooks/useAPTCalculation';
import { HelpPopover } from './HelpPopover';
import { HELP_CONTENT } from '../constants/helpContent';

interface CostRowProps {
  cost: AdditionalCost;
  onChange: (updated: AdditionalCost) => void;
}

const MODE_LABELS: Record<CostMode, string> = {
  'w_stawce': 'Wliczone w stawkę',
  'refaktura_z_marza': 'Refaktura z marżą',
  'refaktura_1do1': 'Refaktura 1:1',
  'po_stronie_klienta': 'Po stronie klienta',
};

const MODE_COLORS: Record<CostMode, string> = {
  'w_stawce': 'bg-green-100 text-green-800',
  'refaktura_z_marza': 'bg-blue-100 text-blue-800',
  'refaktura_1do1': 'bg-purple-100 text-purple-800',
  'po_stronie_klienta': 'bg-gray-100 text-gray-800',
};

export const COST_ROW_LAYOUT_CLASSES = {
  container: 'flex items-center gap-4',
  label: 'flex-1',
  amount: 'w-32',
  mode: 'w-48',
  status: 'w-32',
};

export const CostRow: React.FC<CostRowProps> = ({ cost, onChange }) => {
  const getHelpContent = (id: string) => {
    switch (id) {
      case 'legalizacja': return HELP_CONTENT.legalization;
      case 'zakwaterowanie': return HELP_CONTENT.accommodation;
      case 'koordynator': return HELP_CONTENT.coordinator;
      default: return null;
    }
  };

  const help = getHelpContent(cost.id);

  return (
    <div className={`${COST_ROW_LAYOUT_CLASSES.container} py-2 border-b border-gray-100 last:border-0`}>
      <div className={COST_ROW_LAYOUT_CLASSES.label}>
        <div className="flex items-center">
          <label className="text-sm font-medium text-gray-700">{cost.label}</label>
          {help && <HelpPopover title={help.title} content={help.content} />}
        </div>
      </div>

      <div className={COST_ROW_LAYOUT_CLASSES.amount}>
        <input
          type="number"
          min="0"
          step="0.01"
          value={cost.amountPerPerson}
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange({ ...cost, amountPerPerson: Number.isFinite(n) ? n : 0 });
          }}
          className="w-full px-3 py-1.5 border border-gray-300 rounded text-right text-sm focus:ring-2 focus:ring-[#396542] outline-none"
        />
      </div>

      <div className={`${COST_ROW_LAYOUT_CLASSES.mode} relative`}>
        <select
          value={cost.mode}
          onChange={(e) => onChange({ ...cost, mode: e.target.value as CostMode })}
          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#396542] outline-none appearance-none"
        >
          {Object.entries(MODE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      <div className={`${COST_ROW_LAYOUT_CLASSES.status} flex justify-end`}>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${MODE_COLORS[cost.mode]} whitespace-nowrap`}>
          {MODE_LABELS[cost.mode]}
        </span>
      </div>
    </div>
  );
};
