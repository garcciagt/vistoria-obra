export function isApontamento(entry: { apontamento?: boolean } | undefined): boolean {
  return entry?.apontamento === true;
}