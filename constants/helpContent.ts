export const HELP_CONTENT = {
  contractType: {
    title: 'Typ kalkulacji (Umowa)',
    content: 'Praca tymczasowa wymaga doliczenia obowiązkowej rezerwy urlopowej (domyślnie 8.3%), co podwyższa stawkę dla klienta. Umowa zlecenie jest tańsza (brak rezerwy), ale wiążą ją inne limity prawne.'
  },
  contractorVariant: {
    title: 'Wariant zleceniobiorcy',
    content: 'Określa obciążenia ZUS.\n\n• Standard ozusowany: pełny ZUS (najwyższy koszt).\n• Student do 26 lat: brak ZUS społecznego (najczęstszy powód gwałtownego spadku stawki).\n• Zbieg tytułów: pracownik ma ZUS u innego pracodawcy, agencja nie płaci składek społecznych.'
  },
  grossRateHourly: {
    title: 'Stawka brutto pracownika / h',
    content: 'Wynagrodzenie brutto pracownika przed podatkiem i ZUS po jego stronie. To główny czynnik kosztotwórczy. Wzrost o 1 PLN brutto podnosi finalną stawkę dla klienta o ok. 1.5–1.8 PLN/h w zależności od narzutów.'
  },
  marginPercent: {
    title: 'Marża (od kosztu własnego) %',
    content: 'Marża agencji to procent doliczany do KOSZTU agencji (brutto + ZUS + parametry APT), a nie narzut na stawkę klienta. 10% marży oznacza, że agencja zarabia 10 zł na każde 100 zł własnych kosztów.'
  },
  accidentInsuranceRate: {
    title: 'Składka wypadkowa %',
    content: 'Składka ZUS uzależniona od kodu PKD.\n\n• HR KONO S.A.: 1.20%\n• APT WORK: 0.93%\n• Inny: wartość musi zostać uzupełniona na podstawie danych od Działu HR.'
  },
  ppkEmployerRate: {
    title: 'PPK pracodawcy %',
    content: 'Pracownicze Plany Kapitałowe (obowiązkowe 1.5%). Wartość 0% jest poprawna tylko dla podmiotów prawnie zwolnionych z PPK. Wpisanie 0% dla objętych firm zaniży rzeczywisty koszt projektu.'
  },
  contractHorizonMonths: {
    title: 'Horyzont kontraktu',
    content: 'Oczekiwany czas trwania projektu w miesiącach. Koszty jednorazowe (rekrutacja, badania, BHP, legalizacja) są dzielone przez tę liczbę. Krótki horyzont (np. 3 miesiące) drastycznie podnosi stawkę godzinową przez szybką amortyzację tych kosztów.'
  },
  legalization: {
    title: 'Legalizacja / os.',
    content: 'Koszt zalegalizowania pracy cudzoziemca (np. z Ukrainy czy Białorusi). Zwykle wynosi 500–1500 PLN jednorazowo na osobę. Domyślne 0 zł jest poprawne wyłącznie dla obywateli RP.'
  },
  accommodation: {
    title: 'Zakwaterowanie / os. / miesiąc',
    content: 'Największy koszt dodatkowy w projektach zamiejscowych. Każde 100 zł różnicy to zmiana stawki dla klienta o ok. 0.5 PLN/h (przy 200h pracy). Domyślnie refakturowany 1:1 jako osobna pozycja na fakturze.'
  },
  coordinator: {
    title: 'Koordynator projektu / miesiąc',
    content: 'Koszt całkowity koordynatora całego projektu. Dzieli się przez liczbę pracowników. Przy 1000 zł i 10 osobach, koszt na osobę to 100 zł (ok. 0.5 PLN/h). Przy mniejszej liczbie osób obciąża stawkę znacznie mocniej.'
  }
};
