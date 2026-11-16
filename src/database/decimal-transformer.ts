import type { ValueTransformer } from 'typeorm';

export class DecimalTransformer implements ValueTransformer {
  to(data?: number): number {
    return data;
  }
  from(data?: string): number {
    if (!data) return null;
    return Number.parseFloat(data);
  }
}
