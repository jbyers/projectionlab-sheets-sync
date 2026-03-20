/**
 * ProjectionLab Sheet Sync Chrome Extension
 * Exports Google Sheet account balances in JSON for import into ProjectionLab
 *
 * Updated: 2026-05-21
 * Instructions: https://github.com/jbyers/projectionlab-sheets-sync
 *
 * This AppScript code exports a range of data in the associated Google Sheet
 * as JSON. It exports via an App Script Web App that's only accessible to you
 * when your browser is logged in to Google.
 *
 * Follow the instructions linked above. Review and edit sheetName and
 * sheetRange variables below.
 */
function doGet(e) {
  /**
   * Configuration
   */
  const sheetName = "Sheet1"; // Required: name of the sheet tab
  const sheetRange = "";      // Optional: blank exports the whole sheet, or e.g. "A:C" or "A1:E20"

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const range = sheetRange ? sheet.getRange(sheetRange) : sheet.getDataRange();
  const data = range.getValues();
  const headers = data[0];
  const jsonData = data.slice(1).map(row => {
    let obj = {};
    row.forEach((cell, i) => {
      if (cell === "") {
        return;
      }
      obj[headers[i]] = cell;
    });
    return obj;
  });

  return ContentService.createTextOutput(JSON.stringify(jsonData))
    .setMimeType(ContentService.MimeType.JSON);
}
