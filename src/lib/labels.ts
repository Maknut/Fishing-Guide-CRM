// Words for enum values, in one place so every screen says the same thing.
export const SLOT_LABEL: Record<string, string> = { AM: "Morning", PM: "Afternoon", FULL: "Full day" };
export const SLOT_SHORT: Record<string, string> = { AM: "AM", PM: "PM", FULL: "All day" };

export function slotLabel(slot: string) {
  return SLOT_LABEL[slot] ?? slot;
}

/** "+15550102233" -> "(555) 010-2233". Anything else is shown as stored. */
export function fmtPhone(e164: string | null | undefined): string {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164 ?? "");
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164 ?? "";
}

/** Whatever the guide typed -> "+15550102233", or null when it isn't a 10-digit US number. */
export function toE164(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return ten.length === 10 ? `+1${ten}` : null;
}
