// Shared formatting utilities

/**
 * Format paise to Indian Rupees (Rs 1,45,000.00)
 */
export function formatPaise(paise: number | undefined | null): string {
  if (paise == null) return "₹0.00";
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Format a weight in grams to a human readable string (e.g. 500g, 1.2kg)
 */
export function formatWeight(grams: number | undefined | null): string {
  if (grams == null) return "";
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2).replace(/\.00$/, '')}kg`;
  }
  return `${grams}g`;
}

/**
 * Format weight range
 */
export function formatWeightRange(minG: number | undefined | null, maxG: number | undefined | null): string {
  if (!minG && !maxG) return "";
  if (minG && !maxG) return `${formatWeight(minG)}+`;
  if (!minG && maxG) return `Up to ${formatWeight(maxG)}`;
  if (minG === maxG) return formatWeight(minG);
  return `${formatWeight(minG)} - ${formatWeight(maxG)}`;
}

/**
 * Format a date string (e.g. ISO) to a readable format
 */
export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

export function formatOnlyDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

export function formatTime(dateStr: string | undefined | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}
