import React from 'react';
import { COMPANY_DETAILS } from '../constants/company';

interface PDFFooterProps {
  /** 'client' dodaje sekcję podpisów; 'internal' dodaje notę o poufności. */
  variant: 'client' | 'internal';
  /** Wstawiane nad linią "Przygotował/a" jeśli podane. */
  preparedBy?: string;
  /** Podmiot — do letterhead agencji w stopce klienta (dane z constants/company.ts). */
  entity?: string;
}

/**
 * Stopka prawna PDF (wspólna dla strony klienta i wewnętrznej).
 * Oświadczenie o stawce minimalnej + nota o orientacyjności danych + termin płatności,
 * a dla wariantu klienta — letterhead agencji i linie podpisu. Styl print-friendly.
 */
export const PDFFooter: React.FC<PDFFooterProps> = ({ variant, preparedBy, entity }) => {
  const company = entity ? COMPANY_DETAILS[entity] : undefined;

  return (
    <div className="pdf-footer mt-12 pt-6 border-t border-slate-300 text-slate-600 text-xs leading-relaxed">
      <div className="space-y-3">
        <div>
          <p className="font-semibold text-slate-700 mb-1 uppercase tracking-wide text-[11px]">Oświadczenie</p>
          <p>
            Niniejsza kalkulacja zawiera stawki brutto pracowników, które zgodnie z przepisami prawa
            zatrudnienia mieszczą się w przedziale wynagrodzeń pracowników etatowych na tych samych lub
            podobnych stanowiskach u Pracodawcy Użytkownika. Nadgodziny i prace nocne rozliczane są
            zgodnie z regulaminem wynagradzania Pracodawcy.
          </p>
        </div>
        <div>
          <p className="font-semibold text-slate-700 mb-1 uppercase tracking-wide text-[11px]">Nota ważna</p>
          <p>
            Dane zawarte w niniejszej kalkulacji mają charakter orientacyjny i mogą różnić się od
            fakturowanych w zależności od faktycznej liczby przepracowanych roboczo-godzin w danym
            miesiącu oraz zmian w treści umowy. Podstawą do wystawienia faktur są: faktyczne zamówienia
            Klienta oraz ewidencja czasu pracy Pracowników. Narzuty ZUS i fundusze społeczne naliczane
            są zgodnie z obowiązującymi przepisami.
          </p>
        </div>
        <p className="font-medium text-slate-700">Termin płatności faktury: 14 dni od daty wystawienia.</p>
        {variant === 'internal' && (
          <p className="text-slate-500 italic">
            Dokument wewnętrzny — marża liczona od wartości sprzedaży. Nie udostępniać Klientowi.
          </p>
        )}
      </div>

      {variant === 'client' && (
        <>
          {company?.name && (
            <div className="mt-8 text-[11px] text-slate-500 leading-snug">
              <p className="font-semibold text-slate-700">{company.name}</p>
              {company.address && <p>{company.address}</p>}
              {(company.nip || company.regon) && (
                <p>
                  {company.nip && `NIP: ${company.nip}`}
                  {company.nip && company.regon && ' · '}
                  {company.regon && `REGON: ${company.regon}`}
                </p>
              )}
            </div>
          )}
          <div className="mt-6 grid grid-cols-2 gap-x-12 gap-y-8 text-slate-700">
            <div>
              <div className="border-b border-slate-400 h-8 flex items-end pb-1">
                {preparedBy ? <span className="font-medium">{preparedBy}</span> : null}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Przygotował/a</p>
            </div>
            <div>
              <div className="border-b border-slate-400 h-8" />
              <p className="mt-1 text-[11px] text-slate-500">Data</p>
            </div>
            <div>
              <div className="border-b border-slate-400 h-8" />
              <p className="mt-1 text-[11px] text-slate-500">Podpis Klienta</p>
            </div>
            <div>
              <div className="border-b border-slate-400 h-8" />
              <p className="mt-1 text-[11px] text-slate-500">Pieczęć</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PDFFooter;
