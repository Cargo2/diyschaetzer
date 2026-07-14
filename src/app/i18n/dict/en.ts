import { EN_SHELL } from './en.shell';
import { EN_WIZARD } from './en.wizard';
import { EN_OFFERS } from './en.offers';
import { EN_INVOICES } from './en.invoices';
import { EN_KONTO } from './en.konto';

/** Zusammengeführtes englisches Dictionary (lazy geladen in `I18nService`). */
export const EN_DICT: Record<string, string> = {
  ...EN_SHELL,
  ...EN_WIZARD,
  ...EN_OFFERS,
  ...EN_INVOICES,
  ...EN_KONTO
};
