export const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n || 0);

export const val = (id) => document.getElementById(id)?.value;
export const num = (id) => Number(val(id));
