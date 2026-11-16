import Decimal from 'decimal.js';
import { Instrument } from '../../database/entities/instrument';
import { Order } from '../../database/entities/order';
import { CURRENCY_INSTRUMENT_TYPE } from './portfolio.constants';
import { PositionBalance } from './position-balance';

type CashFlow = (size: Decimal, price: Decimal) => Decimal;
type PositionUpdate = (
  balance: PositionBalance,
  size: Decimal,
  price: Decimal,
) => void;

const cashFlowBySide: Record<string, CashFlow> = {
  CASH_IN: (size) => size,
  CASH_OUT: (size) => size.negated(),
  BUY: (size, price) => size.mul(price).negated(),
  SELL: (size, price) => size.mul(price),
};

const positionUpdateBySide: Record<string, PositionUpdate> = {
  BUY: (balance, size, price) => balance.buy(size, price),
  SELL: (balance, size) => balance.sell(size),
};

export class PortfolioLedger {
  private constructor(
    readonly availableCash: Decimal,
    private readonly balances: Map<number, PositionBalance>,
  ) {}

  static fromOrders(
    orders: Order[],
    instrumentsById: Map<number, Instrument>,
  ): PortfolioLedger {
    let availableCash = new Decimal(0);
    const balances = new Map<number, PositionBalance>();

    for (const order of orders) {
      const size = new Decimal(order.size ?? 0);
      const price = new Decimal(order.price ?? 0);
      const cashFlow = cashFlowBySide[order.side ?? ''];
      if (cashFlow) {
        availableCash = availableCash.plus(cashFlow(size, price));
      }

      const updatePosition = positionUpdateBySide[order.side ?? ''];
      const instrument = instrumentsById.get(order.instrumentId);
      if (
        !updatePosition ||
        !instrument ||
        instrument.type === CURRENCY_INSTRUMENT_TYPE
      ) {
        continue;
      }

      const balance =
        balances.get(instrument.id) ?? new PositionBalance(instrument);
      updatePosition(balance, size, price);
      balances.set(instrument.id, balance);
    }

    return new PortfolioLedger(availableCash, balances);
  }

  activePositions(): PositionBalance[] {
    return [...this.balances.values()].filter((balance) => balance.isOpen());
  }
}
