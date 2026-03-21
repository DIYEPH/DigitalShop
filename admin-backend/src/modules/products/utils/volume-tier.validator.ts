export type VolumeTierInput = {
  min_quantity: number;
  discount_bps: number;
  is_active: boolean;
};

export type VolumeTierValidationResult = {
  isValid: boolean;
  errors: string[];
};

export function validateVolumeTiers(tiers: VolumeTierInput[]): VolumeTierValidationResult {
  const errors: string[] = [];

  const quantities = tiers.map((t) => t.min_quantity);
  const duplicates = quantities.filter((q, i) => quantities.indexOf(q) !== i);
  if (duplicates.length > 0) {
    errors.push(`Duplicate quantities found: ${[...new Set(duplicates)].join(', ')}`);
  }

  const sorted = [...quantities].sort((a, b) => a - b);
  if (!quantities.every((q, i) => q === sorted[i])) {
    errors.push('Quantities must be in ascending order');
  }

  const sortedTiers = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);
  for (let i = 1; i < sortedTiers.length; i++) {
    if (sortedTiers[i].discount_bps < sortedTiers[i - 1].discount_bps) {
      errors.push('Discount must increase with quantity');
    }
  }

  return { isValid: errors.length === 0, errors };
}
