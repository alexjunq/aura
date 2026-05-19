/**
 * Convert a title to a URL-safe slug.
 *
 * - Lowercase ASCII.
 * - Diacritics stripped via Unicode NFKD normalization
 *   (combining marks U+0300..U+036F).
 * - Runs of non-alphanumerics collapsed to a single `-`.
 * - Leading/trailing `-` trimmed.
 * - Empty result becomes "piece".
 */
export function slugify(input: string): string {
  const stripped = input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  const slug = stripped.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug.length === 0 ? 'piece' : slug;
}

/**
 * Pick the next available slug given a base and a list of slugs already taken
 * within the same scope (e.g. within a tenant). Appends -2, -3, … as needed.
 */
export function dedupeSlug(base: string, taken: ReadonlySet<string> | readonly string[]): string {
  const takenSet = taken instanceof Set ? taken : new Set(taken);
  if (!takenSet.has(base)) return base;
  let n = 2;
  while (takenSet.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
