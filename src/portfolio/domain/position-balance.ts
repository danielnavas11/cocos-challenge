import Decimal from 'decimal.js';
import { Instrument } from '../../database/entities/instrument';

export class PositionBalance {
  quantity = new Decimal(0);
  costBasis = new Decimal(0);

  constructor(readonly instrument: Instrument) {}

  buy(size: Decimal, price: Decimal): void {
    this.quantity = this.quantity.plus(size);
    this.costBasis = this.costBasis.plus(size.mul(price));
  }

  sell(size: Decimal): void {
    const quantityToClose = Decimal.min(size, Decimal.max(this.quantity, 0));
    if (this.quantity.gt(0)) {
      const averageCost = this.costBasis.div(this.quantity);
      this.costBasis = this.costBasis.minus(averageCost.mul(quantityToClose));
    }
    this.quantity = this.quantity.minus(size);
  }

  isOpen(): boolean {
    return this.quantity.gt(0);
  }
}
