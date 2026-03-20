# Privacy Policy — ProjectionLab Sheets Sync

**Last updated: March 22, 2026**

## Overview

ProjectionLab Sheets Sync is a Chrome extension that reads account balances from a user-supplied Google Sheet (via Google Apps Script URL) and writes them to the user's ProjectionLab account via the ProjectionLab Plugin API. All data processing occurs locally within your browser. The developer does not operate any server that receives, stores, or processes your data. There are no 3rd party scripts called in the extension, and the source code is available on Github.

---

## Data Collected

### Authentication Information
- **ProjectionLab API Key** — entered by the user and used exclusively to authenticate requests to the ProjectionLab Plugin API running in the user's own browser tab.

### Financial and Payment Information
- **Account balances and account names** — fetched at sync time from the user-supplied URL (typically a Google Apps Script Web App). This data reflects the financial account names and balances the user has chosen to expose via that URL.

### Configuration Data
- **Data URL** — the URL of the user's Google Sheet or Apps Script endpoint.
- **Dry-run preference** — a boolean setting controlling whether the extension writes changes to ProjectionLab.

---

## How Data Is Stored

Settings (API key, data URL, dry-run preference) are stored using `chrome.storage.sync`. This means Chrome may synchronize these values across your signed-in Chrome browsers via Google's encrypted sync infrastructure. The developer has no access to this storage and receives no copy of its contents.

No data is written to any external server.

---

## How Data Is Used

Data collected by this extension is used solely to perform its single stated purpose: synchronizing account balances from a user-configured Google Sheet into the user's ProjectionLab account.

Specifically:
- The **data URL** is used to fetch account balance data from the user's own Google Sheet App Script Web App endpoint.
- The **API key** is passed directly to the ProjectionLab Plugin API (running in the user's browser tab on `app.projectionlab.com`) to authorize read and write operations on the user's ProjectionLab data.
- **Account names and balances** are read from the Google Sheet response and written to ProjectionLab. This data is never transmitted anywhere other than between the user's Google Sheet, the extension's popup, and the user's ProjectionLab tab — all within the user's own browser session.

---

## Data Sharing

This extension does not:
- Sell or transfer user data to third parties.
- Use or transfer user data for purposes unrelated to its single purpose of syncing account balances.
- Use or transfer user data to determine creditworthiness or for lending purposes.
- Share user data with advertisers, analytics providers, or any other third party.
- Track usage using developer-controlled analytics or reporting of any kind.

---

## Third-Party Services

The extension communicates only with services that the user explicitly configures and controls:

| Service | Purpose | Policy |
|---|---|---|
| User-supplied Google Apps Script / Google Sheet URL | Source of account balance data | Governed by Google's Privacy Policy and the user's own Google account |
| `app.projectionlab.com` | Target of balance updates via the ProjectionLab Plugin API | Governed by ProjectionLab's Privacy Policy |

No data is sent to any service controlled by the developer of this extension.

---

## Permissions Justification

| Permission | Reason |
|---|---|
| `storage` | Persist user settings (API key, data URL, dry-run flag) across browser sessions using `chrome.storage.sync` |
| `scripting` | Inject the sync function into the user's ProjectionLab tab to call `window.projectionlabPluginAPI` |
| `tabs` | Locate the open ProjectionLab tab to target the script injection |
| Host permission: `app.projectionlab.com` | Required to inject the sync script into ProjectionLab |
| Host permissions: `script.google.com`, `script.googleusercontent.com` | Required to fetch balance data from Google Apps Script endpoints |

---

## Data Retention

The extension retains only what is stored in `chrome.storage.sync` (API key, data URL, dry-run preference). This data persists until the user clears it via Chrome's extension storage management or uninstalls the extension. No other data is retained.

---

## Changes to This Policy

If this policy is updated materially, the "Last updated" date above will be revised. Continued use of the extension after a policy change constitutes acceptance of the updated policy.

---

## Contact

For questions or concerns about this privacy policy, use the contact information found on the Chrome Web Store.
