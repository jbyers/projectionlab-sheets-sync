![Node.js test suite](https://github.com/jbyers/projectionlab-sheets-sync/actions/workflows/node.js.yml/badge.svg)

# ProjectionLab Sheets Sync

Chrome extension that syncs account balances from a Google Sheet into ProjectionLab using the [Plugin API](https://app.projectionlab.com/docs/module-PluginAPI.html).

## How it works

The extension fetches the contents of your Google Sheet via a private Apps Scripts Web App (a simple, free, secure way to serve the data in your Sheet). It then syncs with your open ProjectionLab tab using the Plugin API and reports the results.

The extension can also sync from any URL that serves CSV or JSON in the right format. This requires manually installing the extension; see details below.

## Google Sheet format

Your Sheet needs a header row with **type**, **name**, and **balance** columns:

| Type | Name | Balance |
|------|------|---------|
| Savings | Chase Checking| $5,608 |
| Investment | Vanguard ETF | $10,490 |
| Investment | Schwab 401k | $19,172 |
| Asset | Honda Pilot |$24,500 |
| Debt| Amex Blue| $1,703 |

Here's an example Sheet: https://docs.google.com/spreadsheets/d/1BeASbUYSPzkoU909Wu6x8QWGHCxaK79QQDANh5ZGINk/edit

Notes:
- Header case and order don't matter
- Type must be "Asset", "Debt", "Investment", or "Savings"
- Account names must be a case-insensitive match with the account names in ProjectionLab
- Account balances must be numeric, and cannot include currency symbols (this works by default for Google Sheets when balances are a numeric type, including currency)
- Duplicate names within a type in either the Sheet or ProjectionLabs will trigger a fatal error and stop the sync
- Balances present in the Sheet but missing in ProjectionLab will generate a warning
- Balances present in ProjectionLab but missing from the Sheet will do nothing

## Setup

### 1. Install the extension

1. Visit the Chrome Web Store: https://chromewebstore.google.com/
2. Install the extension

### 2. ProjectionLab API Key

1. Log in to ProjectionLab, go to **Account Settings → Plugin API**
2. Enable the plugin API and copy the key
3. Open the extension by clicking on it in the Chrome extensions menu
4. Paste the API key in the popup under **ProjectionLab API Key**. Settings are saved automatically.

### 3. Google Sheets setup

 1. Create a Google Sheet with a table of account types, names, and balances you wish to sync
 2. In the Sheet, click **Extensions → Apps Script**
 3. Paste the code in [AppScript.js](https://raw.githubusercontent.com/jbyers/projectionlab-sheets-sync/refs/heads/main/sheets/AppScript.js) into the default file `Code.js`
 4. Update the `sheetName` variable below to match the name of the sheet you wish to export
 5. Optionally set `sheetRange` to restrict the rows and columns you export
 6. Click **Save** and **Deploy**
 7. Select `Web App`, `Execute as Me`, and grant access to `Only myself`
 8. Test by pasting the web app URL `https://script.google.com/...` into your browser: if you see JSON with types, names, and balances, it's working
 9. Open the extension, paste the web app URL into the `Data URL` field. Settings are saved automatically.

### 4. Sync

1. When the extension is open and ProjectionLab is open and logged in, check **Dry Run** and click **Sync Now**
2. Look through the logs and address any errors; when you're happy, uncheck **Dry Run** and click **Sync Now**

## Security and reliability

* Because the Chrome Extension runs as you, and calls the Apps Script web app URL with your Google credentials, this approach is secure by default
* Unless you set `sheetRange` the Apps Script web app will export all of the data in the sheet; it's better to create a new tab with just the values you wish to sync
* The public extension has access only to ProjectionLab and Google Apps Scripts URLs (the downloaded version from GitHub has access to all URLs, see below):
  * `https://app.projectionlab.com/*`
  * `https://script.google.com/macros/*`
  * `https://script.googleusercontent.com/macros/*`

## Advanced: CSV or JSON setup

You can replace the Google Sheets Data URL with any endpoint that serves CSV or JSON in the correct format. Because I don't want the public version of the extension to ask for access to all websites, you must download and install the extension from GitHub locally:

https://github.com/jbyers/projectionlab-sheets-sync/releases

The only change is to `manifest.json`:

```
  "host_permissions": [
    "<all_urls>"
  ]
```

CSV must mirror the format of the Sheet above:

```
Type,Name,Balance
Savings,Chase Checking,5608
```

Similarly, JSON is an array of dicts:
```
[
   {
      "type": "Savings,
      "name": "Chase Checking",
      "balance": 5608
   }
]
```

## Tests

Unit tests validate CSV and JSON parsing. Run as:

```bash
yarn install
yarn test
```
