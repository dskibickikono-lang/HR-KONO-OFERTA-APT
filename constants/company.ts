// Dane rejestrowe spółek do stopki (letterhead) oferty PDF.
// UZUPEŁNIJ realnymi wartościami — puste pola NIE są renderowane, żeby nigdy
// nie wydrukować klientowi placeholderów typu "NIP: ______".

export interface CompanyDetails {
  name: string;
  address?: string;
  nip?: string;
  regon?: string;
}

export const COMPANY_DETAILS: Record<string, CompanyDetails> = {
  'HR KONO S.A.': {
    name: 'HR KONO S.A.',
    // address: 'ul. ___, __-___ ___',
    // nip: '___',
    // regon: '___',
  },
  'APT WORK Sp. z o.o.': {
    name: 'APT WORK Sp. z o.o.',
    // address: 'ul. ___, __-___ ___',
    // nip: '___',
    // regon: '___',
  },
  'Inny': {
    name: '',
  },
};
