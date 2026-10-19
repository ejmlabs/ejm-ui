export interface DisclosureState {
  open: boolean;
}
export type DisclosureAction = { type: "toggle" } | { type: "open" } | { type: "close" };

export const createDisclosureState = (open = false): DisclosureState => ({ open });

export function disclosureReducer(s: DisclosureState, a: DisclosureAction): DisclosureState {
  const open = a.type === "toggle" ? !s.open : a.type === "open";
  return open === s.open ? s : { open };
}
