/**
 * ProjectionLab Sheet Sync Chrome Extension
 * Exports Google Sheet account balances in JSON for import into ProjectionLab
 *
 * Updated: 2026-05-22
 * Instructions: https://github.com/jbyers/projectionlab-sheets-sync
 *
 * This AppScript code exports a range of data in the associated Google Sheet
 * as JSON. It exports via an App Script Web App that's only accessible to you
 * when your browser is logged in to Google.
 *
 * Follow the instructions linked above. Review and edit SHEET_NAME and
 * SHEET_RANGE variables below.
 */

const SHEET_NAME = "Sheet1"; // Required: name of the sheet tab
const SHEET_RANGE = ""; // Optional: blank exports the whole sheet, or e.g. "A:C" or "A1:E20"

// biome-ignore lint:correctness/noUnusedFunctions: called by Google Apps Script runtime
function doGet(_e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    return outputJson({
      result: "ERROR",
      message: `Sheet "${SHEET_NAME}" not found`,
    });
  }

  const range = SHEET_RANGE
    ? sheet.getRange(SHEET_RANGE)
    : sheet.getDataRange();
  const data = range.getValues();
  const headers = data[0];
  const jsonData = data.slice(1).map((row) => {
    const obj = {};
    row.forEach((cell, i) => {
      if (cell === "") {
        return;
      }
      obj[headers[i]] = cell;
    });
    return obj;
  });

  return outputJson(jsonData);
}

function outputJson(jsonData) {
  return ContentService.createTextOutput(JSON.stringify(jsonData)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
