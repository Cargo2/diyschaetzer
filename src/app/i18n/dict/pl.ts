import { PL_SHELL } from './pl.shell';
import { PL_WIZARD } from './pl.wizard';
import { PL_OFFERS } from './pl.offers';
import { PL_INVOICES } from './pl.invoices';
import { PL_KONTO } from './pl.konto';

/** Zusammengeführtes polnisches Dictionary (lazy geladen in `I18nService`). */
export const PL_DICT: Record<string, string> = {
  ...PL_SHELL,
  ...PL_WIZARD,
  ...PL_OFFERS,
  ...PL_INVOICES,
  ...PL_KONTO
};
