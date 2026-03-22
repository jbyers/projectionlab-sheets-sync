export function parseBalance(balance, type, name) {
  if (typeof balance === "number") {
    return Math.trunc(balance);
  }

  if (typeof balance === "string" && /^[0-9.-]+$/.test(balance)) {
    return Math.trunc(Number(balance));
  }

  throw new Error(
    `Cannot parse non-numeric balance value "${balance}" for "${type} - ${name}"`,
  );
}

export function parseJson(data) {
  const list = Array.isArray(data) ? data : [data];
  const accounts = [];
  for (const item of list) {
    const norm = {};
    for (const [k, v] of Object.entries(item)) norm[k.toLowerCase()] = v;
    const { type, name, balance: rawBalance } = norm;
    if (!name || rawBalance === undefined) continue;
    accounts.push({
      type: type?.trim(),
      name: String(name).trim(),
      balance: parseBalance(rawBalance, type, name),
    });
  }
  if (accounts.length === 0)
    throw new Error("No valid accounts found in JSON response");
  return accounts;
}

export function parseArray(rows) {
  if (rows.length < 2)
    throw new Error(
      "Sheet has no data rows (need header + at least one data row)",
    );

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const typeIdx = headers.indexOf("type");
  const nameIdx = headers.indexOf("name");
  const balanceIdx = headers.indexOf("balance");

  if (nameIdx === -1)
    throw new Error('Sheet is missing a "name" column header');
  if (balanceIdx === -1)
    throw new Error('Sheet is missing a "balance" column header');

  const accounts = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name = row[nameIdx]?.trim();
    const rawBalance = row[balanceIdx]?.trim() ?? "";
    if (!name || rawBalance === "") continue;

    let balance;
    try {
      balance = parseBalance(rawBalance, name);
    } catch {
      throw new Error(
        `Row ${i + 1}: "${rawBalance}" is not a valid number for balance`,
      );
    }

    accounts.push({
      type: typeIdx !== -1 ? row[typeIdx]?.trim() : undefined,
      name,
      balance,
    });
  }

  if (accounts.length === 0)
    throw new Error("No valid data rows found in sheet");
  return accounts;
}
