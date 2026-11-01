import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../..');
const XLSX_FILE = path.join(ROOT, process.env.TEST_DATA_FILE ?? 'test-data/testdata.xlsx');
const JSON_FILE = path.join(ROOT, 'test-data/testdata.generated.json');
const CONVERTER = path.join(ROOT, 'scripts/excel-to-json.js');

export interface TestRow {
  testID: string;
  testName: string;
  flag: string;
  run: boolean;
  url: string;
  userName: string;
  password: string;
  emailID: string;
  excelRow: number;
}

interface RawRow {
  testID: string;
  testName: string;
  flag: string;
  url: string;
  userName: string;
  password: string;
  emailID: string;
  excelRow: number;
}

interface GeneratedTestData {
  rows: RawRow[];
}

function ensureFresh(): void {
  if (!fs.existsSync(XLSX_FILE)) {
    throw new Error(
      `Excel test data not found: ${XLSX_FILE}\nSet TEST_DATA_FILE or place the workbook at test-data/testdata.xlsx.`,
    );
  }
  if (!fs.existsSync(CONVERTER)) {
    throw new Error(`Excel converter not found: ${CONVERTER}`);
  }

  const workbookTime = fs.statSync(XLSX_FILE).mtimeMs;
  const jsonTime = fs.existsSync(JSON_FILE) ? fs.statSync(JSON_FILE).mtimeMs : 0;
  const converterTime = fs.statSync(CONVERTER).mtimeMs;
  if (jsonTime < workbookTime || jsonTime < converterTime) {
    execFileSync(process.execPath, [CONVERTER, XLSX_FILE, JSON_FILE], { stdio: 'inherit' });
  }
}

const isYes = (flag: string) => ['y', 'yes', 'true'].includes(flag.trim().toLowerCase());

function resolveSecret(value: string, row: RawRow): string {
  const match = /^\$\{ENV:([A-Za-z0-9_]+)\}$/.exec(value);
  if (!match) return value;
  const resolved = process.env[match[1]];
  if (!resolved) {
    throw new Error(
      `${row.testID} (Excel row ${row.excelRow}): environment variable ${match[1]} is not set`,
    );
  }
  return resolved;
}

export function loadRows(options: { resolveSecrets?: boolean } = {}): TestRow[] {
  ensureFresh();
  const { rows } = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8')) as GeneratedTestData;
  const resolveSecrets = options.resolveSecrets !== false;

  return rows.map((raw) => {
    const run = isYes(raw.flag);
    if (run && !/^https?:\/\//i.test(raw.url)) {
      throw new Error(
        `${raw.testID} (Excel row ${raw.excelRow}): url must start with http:// or https:// (got "${raw.url}")`,
      );
    }
    return {
      ...raw,
      run,
      userName: run && resolveSecrets ? resolveSecret(raw.userName, raw) : raw.userName,
      password: run && resolveSecrets ? resolveSecret(raw.password, raw) : raw.password,
      emailID: run && resolveSecrets ? resolveSecret(raw.emailID, raw) : raw.emailID,
    };
  });
}
