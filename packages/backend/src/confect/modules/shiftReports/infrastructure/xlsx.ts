import { strToU8, zipSync } from 'fflate';

/** Zips workbook XML parts, keyed by path, into `.xlsx` bytes. */
export function encodeXlsx(parts: Record<string, string>): Uint8Array {
  return zipSync(
    Object.fromEntries(
      Object.entries(parts).map(([path, xml]) => [path, strToU8(xml)])
    )
  );
}
