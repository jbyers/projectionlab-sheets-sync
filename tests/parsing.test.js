import { parseBalance, parseJson, parseArray } from "../chrome/lib-parsers.js";
import { parse as parseCsv } from "../chrome/lib-vanillaes-csv.js";

describe("Data Parsers", () => {
  describe("parseBalance", () => {
    // number inputs
    test("returns integer unchanged", () => {
      expect(parseBalance(1000, "checking", "Acct")).toBe(1000);
    });

    test("truncates fractional number", () => {
      expect(parseBalance(1234.99, "checking", "Acct")).toBe(1234);
    });

    test("handles negative number", () => {
      expect(parseBalance(-500, "checking", "Acct")).toBe(-500);
    });

    test("handles zero", () => {
      expect(parseBalance(0, "checking", "Acct")).toBe(0);
    });

    // string inputs — valid characters [0-9.-]
    test("parses numeric string", () => {
      expect(parseBalance("1000", "checking", "Acct")).toBe(1000);
    });

    test("parses negative string", () => {
      expect(parseBalance("-500", "checking", "Acct")).toBe(-500);
    });

    test("parses decimal string and truncates", () => {
      expect(parseBalance("1234.99", "checking", "Acct")).toBe(1234);
    });

    // string inputs — invalid characters
    test("throws for string with letters", () => {
      expect(() => parseBalance("abc", "checking", "Acct")).toThrow(
        'Cannot parse non-numeric balance value "abc" for "checking - Acct"',
      );
    });

    test("throws for string with currency symbol", () => {
      expect(() => parseBalance("$1000", "checking", "Acct")).toThrow(
        'Cannot parse non-numeric balance value "$1000" for "checking - Acct"',
      );
    });

    test("throws for string with commas", () => {
      expect(() => parseBalance("1,000", "checking", "Acct")).toThrow(
        'Cannot parse non-numeric balance value "1,000" for "checking - Acct"',
      );
    });

    // non-string, non-number inputs
    test("throws for null", () => {
      expect(() => parseBalance(null, "checking", "Acct")).toThrow(
        'Cannot parse non-numeric balance value "null" for "checking - Acct"',
      );
    });

    test("throws for boolean", () => {
      expect(() => parseBalance(true, "checking", "Acct")).toThrow(
        'Cannot parse non-numeric balance value "true" for "checking - Acct"',
      );
    });
  });

  describe("parseJson", () => {
    test("should parse a valid JSON array", () => {
      const json = [
        { type: "checking", name: "My Checking", balance: 5000 },
        { type: "savings", name: "My Savings", balance: 12000 },
      ];
      const expected = [
        { type: "checking", name: "My Checking", balance: 5000 },
        { type: "savings", name: "My Savings", balance: 12000 },
      ];
      expect(parseJson(json)).toEqual(expected);
    });

    test("should parse a valid JSON object", () => {
      const json = { type: "checking", name: "My Checking", balance: 5000 };
      const expected = [
        { type: "checking", name: "My Checking", balance: 5000 },
      ];
      expect(parseJson(json)).toEqual(expected);
    });

    test("should handle string balances", () => {
      const json = [
        { type: "savings", name: "My Savings", balance: "12000.21" },
      ];
      const expected = [
        { type: "savings", name: "My Savings", balance: 12000 },
      ];
      expect(parseJson(json)).toEqual(expected);
    });

    test("should skip items with missing name", () => {
      const json = [
        { type: "checking", balance: 5000 },
        { type: "savings", name: "My Savings", balance: 12000 },
      ];
      const expected = [
        { type: "savings", name: "My Savings", balance: 12000 },
      ];
      expect(parseJson(json)).toEqual(expected);
    });

    test("should skip items with missing balance", () => {
      const json = [
        { type: "checking", name: "My Checking" },
        { type: "savings", name: "My Savings", balance: 12000 },
      ];
      const expected = [
        { type: "savings", name: "My Savings", balance: 12000 },
      ];
      expect(parseJson(json)).toEqual(expected);
    });

    test("should throw an error if no valid accounts are found", () => {
      const json = [{ type: "checking" }];
      expect(() => parseJson(json)).toThrow(
        "No valid accounts found in JSON response",
      );
    });
  });

  describe("parseArray (from CSV)", () => {
    test("should parse a valid CSV string", () => {
      const csv = `type,name,balance
checking,"My Checking",5000
savings,"My Savings",12000`;
      const rows = parseCsv(csv);
      const expected = [
        { type: "checking", name: "My Checking", balance: 5000 },
        { type: "savings", name: "My Savings", balance: 12000 },
      ];
      expect(parseArray(rows)).toEqual(expected);
    });

    test("should handle different column order", () => {
      const csv = `name,balance,type
"My Checking",5000,checking`;
      const rows = parseCsv(csv);
      const expected = [
        { type: "checking", name: "My Checking", balance: 5000 },
      ];
      expect(parseArray(rows)).toEqual(expected);
    });

    test("should handle missing type column", () => {
      const csv = `name,balance
"My Checking",5000`;
      const rows = parseCsv(csv);
      const expected = [
        { type: undefined, name: "My Checking", balance: 5000 },
      ];
      expect(parseArray(rows)).toEqual(expected);
    });

    test("should handle string balances", () => {
      const csv = `name,balance
Test,"500.12"`;
      const rows = parseCsv(csv);
      expect(parseArray(rows)[0].balance).toBe(500);
    });

    test("should throw an error for missing name column", () => {
      const csv = `type,balance
checking,5000`;
      const rows = parseCsv(csv);
      expect(() => parseArray(rows)).toThrow(
        'Sheet is missing a "name" column header',
      );
    });

    test("should throw an error for missing balance column", () => {
      const csv = `type,name
checking,"My Checking"`;
      const rows = parseCsv(csv);
      expect(() => parseArray(rows)).toThrow(
        'Sheet is missing a "balance" column header',
      );
    });

    test("should throw an error for no data rows", () => {
      const csv = `type,name,balance`;
      const rows = parseCsv(csv);
      expect(() => parseArray(rows)).toThrow(
        "Sheet has no data rows (need header + at least one data row)",
      );
    });
  });
});
