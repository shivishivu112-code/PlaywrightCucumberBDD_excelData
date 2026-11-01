/**
 * Converts the Excel test sheet into JSON that the tests read synchronously.
 * Usage: node scripts/excel-to-json.js [xlsxPath] [jsonPath]
 */
const ExcelJS = require('exceljs');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const xlsxPath = path.resolve(ROOT, process.env.TEST_DATA_FILE ?? 'test-data/testdata.xlsx');
const jsonPath = path.resolve(ROOT, 'test-data/testdata.generated.json');
const sheetName = process.env.TEST_DATA_SHEET ?? 'Tests';

const COLUMNS = {
  testid: 'testID',
  testname: 'testName',
  flag: 'flag',
  url: 'url',
  username: 'userName',
  password: 'password',
  passsword: 'password',
  emailid: 'emailID',
  email: 'emailID',
};
const REQUIRED = ['testID', 'flag'];
const normalize = (text) => String(text ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

function cellText(cell) {
  const value = cell.value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('').trim();
    }
    if (value.result !== undefined && value.result !== null) return String(value.result).trim();
    if (value.text !== undefined) {
      return String(typeof value.text === 'object' ? cellText({ value: value.text }) : value.text).trim();
    }
    if (value.hyperlink) return String(value.hyperlink).replace(/^mailto:/i, '').trim();
    return '';
  }
  return String(value).trim();
}

async function main(inputXlsxPath, outputJsonPath) {
  const resolvedXlsxPath = inputXlsxPath
    ? path.resolve(inputXlsxPath)
    : xlsxPath;
  const resolvedJsonPath = outputJsonPath
    ? path.resolve(outputJsonPath)
    : jsonPath;

  if (!fs.existsSync(resolvedXlsxPath)) {
    throw new Error(
      `Excel file not found: ${resolvedXlsxPath}\nPass the workbook path as the first argument or set TEST_DATA_FILE.`,
    );
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(resolvedXlsxPath);
  const sheet = workbook.getWorksheet(sheetName) ?? workbook.worksheets[0];
  if (!sheet) throw new Error(`No worksheet found in ${resolvedXlsxPath}`);

  const columnIndex = {};
  sheet.getRow(1).eachCell((cell, column) => {
    const property = COLUMNS[normalize(cellText(cell))];
    if (property) columnIndex[property] = column;
  });
  const missing = REQUIRED.filter((property) => !columnIndex[property]);
  if (missing.length) {
    throw new Error(
      `Missing required column(s) in "${sheet.name}": ${missing.join(', ')}. Row 1 must contain headers.`,
    );
  }

  const rows = [];
  const seen = new Set();
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record = { excelRow: rowNumber };
    for (const property of ['testID', 'testName', 'flag', 'url', 'userName', 'password', 'emailID']) {
      record[property] = columnIndex[property] ? cellText(row.getCell(columnIndex[property])) : '';
    }
    if (!record.testID && !record.testName && !record.flag) return;
    if (!record.testID) throw new Error(`Row ${rowNumber}: testID is empty`);
    if (seen.has(record.testID)) throw new Error(`Row ${rowNumber}: duplicate testID "${record.testID}"`);
    seen.add(record.testID);
    rows.push(record);
  });

  fs.mkdirSync(path.dirname(resolvedJsonPath), { recursive: true });
  fs.writeFileSync(
    resolvedJsonPath,
    `${JSON.stringify({ source: resolvedXlsxPath, sheet: sheet.name, rows }, null, 2)}\n`,
  );
  console.log(
    `[excel] ${rows.length} row(s) read from "${sheet.name}" -> ${path.relative(ROOT, resolvedJsonPath)}`,
  );
}

if (require.main === module) {
  main(process.argv[2], process.argv[3]).catch((error) => {
    console.error(`[excel] ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = async function globalSetup() {
  await main();
};
