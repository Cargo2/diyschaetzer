import { PL_SHELL } from './pl.shell';
import { PL_WIZARD } from './pl.wizard';
import { PL_OFFERS } from './pl.offers';
import { PL_INVOICES } from './pl.invoices';
import { PL_KONTO } from './pl.konto';
import { PL_MATERIAL } from './pl.material';
import { PL_SUMMARY } from './pl.summary';
import { PL_ASSUMPTIONS } from './pl.assumptions';
import { PL_LEADS } from './pl.leads';

/** Zusammengeführtes polnisches Dictionary (lazy geladen in `I18nService`). */
export const PL_DICT: Record<string, string> = {
  ...PL_SHELL,
  ...PL_WIZARD,
  ...PL_OFFERS,
  ...PL_INVOICES,
  ...PL_KONTO,
  ...PL_MATERIAL,
  ...PL_SUMMARY,
  ...PL_ASSUMPTIONS,
  ...PL_LEADS
};
