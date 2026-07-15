import { EN_SHELL } from './en.shell';
import { EN_WIZARD } from './en.wizard';
import { EN_OFFERS } from './en.offers';
import { EN_INVOICES } from './en.invoices';
import { EN_KONTO } from './en.konto';
import { EN_MATERIAL } from './en.material';
import { EN_SUMMARY } from './en.summary';
import { EN_ASSUMPTIONS } from './en.assumptions';
import { EN_LEADS } from './en.leads';

/** Zusammengeführtes englisches Dictionary (lazy geladen in `I18nService`). */
export const EN_DICT: Record<string, string> = {
  ...EN_SHELL,
  ...EN_WIZARD,
  ...EN_OFFERS,
  ...EN_INVOICES,
  ...EN_KONTO,
  ...EN_MATERIAL,
  ...EN_SUMMARY,
  ...EN_ASSUMPTIONS,
  ...EN_LEADS
};
