/** Normaliza teléfono AR para comparar (solo dígitos, sin 54/549/0/15). */
export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("549")) digits = digits.slice(3);
  else if (digits.startsWith("54")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.startsWith("15") && digits.length > 10) digits = digits.slice(2);
  return digits;
}

/** Variantes habituales guardadas en Firestore. */
export function phoneLookupVariants(phone: string): string[] {
  const n = normalizePhone(phone);
  if (!n) return [];
  const variants = new Set<string>([n, `54${n}`, `549${n}`]);
  if (n.length >= 10) {
    variants.add(`0${n}`);
    variants.add(`15${n.slice(-8)}`);
  }
  return [...variants];
}
