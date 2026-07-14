import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PL_DICT } from './dict/pl';
import { EN_DICT } from './dict/en';
import {
  WIZARD_STEPS,
  ROOM_TYPE_OPTIONS,
  SINK_OPTIONS,
  VANITY_CABINET_OPTIONS,
  SHOWER_BATH_OPTIONS,
  SHOWER_TYPE_OPTIONS,
  BATHTUB_TYPE_OPTIONS,
  HEATING_OPTIONS,
  TOILET_OPTIONS,
  TILING_OPTIONS,
  TILE_QUALITY_OPTIONS,
  TILE_SIZE_OPTIONS,
  EXTRAS_SELECTION_OPTIONS,
  EXTRA_OPTIONS,
  EXISTING_COVERING_OPTIONS,
  WORK_STATUS_OPTIONS,
  SUBSTRATE_OPTIONS,
  SCOPE_OPTIONS
} from '../components/wizard/wizard.component';

/**
 * Coverage-Spec: hält die Dictionaries und die gewrappten Templates ehrlich.
 *
 * Scannt die (aktuell und künftig) gewrappten Bereiche nach Übersetzungs-Keys
 * – sowohl `'…' | t` (Pipe) als auch `t('…')` (Methodenaufruf) – und prüft:
 *  (a) jeder verwendete Key existiert in PL_DICT UND EN_DICT,
 *  (b) jeder Dictionary-Key wird auch tatsächlich verwendet (oder ist als
 *      dynamischer Key allowlisted) – sonst schleichen sich tote Einträge ein.
 *
 * Dateien, die noch keine `| t`-Nutzung haben, liefern schlicht 0 Keys.
 */

/** Glob-fähige Quell-Liste der gewrappten Bereiche (relativ zum Repo-Root). */
const SCANNED_FILES = [
  'src/app/layout/app-shell/app-shell.component.html',
  'src/app/components/wizard/wizard.component.ts',
  'src/app/components/wizard/wizard.component.html',
  'src/app/pages/contractor-offers/*.html',
  'src/app/pages/contractor-invoices/*.html',
  'src/app/pages/profile/konto-*.html'
];

/**
 * Importierbare Konstanten-Arrays, deren Text-Felder als Keys gelten
 * (dynamisch übersetzte Inhalte, z. B. Wizard-Schritt-Titel). T2 trägt hier die
 * Wizard-Arrays ein, z. B. `{ source: WIZARD_STEPS, field: 'title' }`.
 */
/** Wandelt ein beliebiges Wizard-Konstanten-Array (ohne Index-Signatur) in die generische Quellform um. */
function asRecordArray(source: readonly object[]): readonly Record<string, unknown>[] {
  return source as unknown as readonly Record<string, unknown>[];
}

const WIZARD_OPTION_SOURCES: readonly (readonly Record<string, unknown>[])[] = [
  ROOM_TYPE_OPTIONS,
  SINK_OPTIONS,
  VANITY_CABINET_OPTIONS,
  SHOWER_BATH_OPTIONS,
  SHOWER_TYPE_OPTIONS,
  BATHTUB_TYPE_OPTIONS,
  HEATING_OPTIONS,
  TOILET_OPTIONS,
  TILING_OPTIONS,
  TILE_QUALITY_OPTIONS,
  TILE_SIZE_OPTIONS,
  EXTRAS_SELECTION_OPTIONS,
  EXTRA_OPTIONS,
  EXISTING_COVERING_OPTIONS,
  WORK_STATUS_OPTIONS,
  SUBSTRATE_OPTIONS,
  SCOPE_OPTIONS
].map(asRecordArray);

const DYNAMIC_SOURCES: { source: readonly Record<string, unknown>[]; field: string }[] = [
  { source: asRecordArray(WIZARD_STEPS), field: 'eyebrow' },
  { source: asRecordArray(WIZARD_STEPS), field: 'title' },
  { source: asRecordArray(WIZARD_STEPS), field: 'description' },
  ...WIZARD_OPTION_SOURCES.flatMap((source) => [
    { source, field: 'title' },
    { source, field: 'description' }
  ])
];

/** Allowlist für Dictionary-Keys, die nur dynamisch (nicht per Regex greifbar) genutzt werden. */
const DYNAMIC_KEYS: readonly string[] = [];

const PIPE_RE = /'((?:[^'\\]|\\.)*)'\s*\|\s*t\b/g;
const CALL_RE = /\bt\(\s*'((?:[^'\\]|\\.)*)'\s*\)/g;

function findRepoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, 'angular.json'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return process.cwd();
}

/** Erweitert Muster wie `dir/konto-*.html` zu konkreten, existierenden Dateien. */
function expandFiles(root: string, patterns: readonly string[]): string[] {
  const out: string[] = [];
  for (const pat of patterns) {
    if (!pat.includes('*')) {
      out.push(join(root, pat));
      continue;
    }
    const slash = pat.lastIndexOf('/');
    const dirAbs = join(root, pat.slice(0, slash));
    const fileGlob = pat.slice(slash + 1);
    if (!existsSync(dirAbs)) {
      continue;
    }
    const re = new RegExp(
      '^' + fileGlob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'
    );
    for (const name of readdirSync(dirAbs)) {
      if (re.test(name)) {
        out.push(join(dirAbs, name));
      }
    }
  }
  return out;
}

/** Wandelt den rohen (escapten) String-Inhalt in den tatsächlichen Key um (`\'` → `'`). */
function unescape(raw: string): string {
  return raw.replace(/\\(.)/g, '$1');
}

function extractKeysFromSource(source: string, target: Set<string>): void {
  for (const re of [PIPE_RE, CALL_RE]) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(source)) !== null) {
      target.add(unescape(match[1]));
    }
  }
}

function collectUsedKeys(): Set<string> {
  const root = findRepoRoot();
  const used = new Set<string>();

  for (const file of expandFiles(root, SCANNED_FILES)) {
    if (!existsSync(file)) {
      continue;
    }
    extractKeysFromSource(readFileSync(file, 'utf8'), used);
  }

  for (const { source, field } of DYNAMIC_SOURCES) {
    for (const item of source) {
      const value = item[field];
      if (typeof value === 'string') {
        used.add(value);
      }
    }
  }

  return used;
}

describe('i18n coverage', () => {
  const usedKeys = collectUsedKeys();

  it('findet überhaupt gewrappte Keys (Sanity-Check)', () => {
    expect(usedKeys.size).toBeGreaterThan(0);
  });

  it('jeder verwendete Key existiert in PL_DICT und EN_DICT', () => {
    const missing: string[] = [];
    for (const key of usedKeys) {
      const inPl = Object.prototype.hasOwnProperty.call(PL_DICT, key);
      const inEn = Object.prototype.hasOwnProperty.call(EN_DICT, key);
      if (!inPl || !inEn) {
        missing.push(`${key} → ${inPl ? '' : 'PL '}${inEn ? '' : 'EN'}`.trim());
      }
    }
    expect(missing, `Fehlende Übersetzungen:\n${missing.join('\n')}`).toEqual([]);
  });

  it('jeder Dictionary-Key wird verwendet (oder ist allowlisted)', () => {
    const allowed = new Set<string>([...usedKeys, ...DYNAMIC_KEYS]);
    const dictKeys = new Set<string>([...Object.keys(PL_DICT), ...Object.keys(EN_DICT)]);
    const orphaned: string[] = [];
    for (const key of dictKeys) {
      if (!allowed.has(key)) {
        orphaned.push(key);
      }
    }
    expect(orphaned, `Ungenutzte Dictionary-Keys:\n${orphaned.join('\n')}`).toEqual([]);
  });
});
