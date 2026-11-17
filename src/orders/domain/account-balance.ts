import Decimal from 'decimal.js';
import { Order } from '../../database/entities/order';
import { OrderSide, OrderStatus } from './order.constants';

type BalanceChange = (size: Decimal, price: Decimal) => Decimal;
type OrderChanges = Partial<Record<OrderSide, BalanceChange>>;

const cashChangesByStatus: Partial<Record<OrderStatus, OrderChanges>> = {
  [OrderStatus.FILLED]: {
    [OrderSide.CASH_IN]: (size) => size,
    [OrderSide.CASH_OUT]: (size) => size.negated(),
    [OrderSide.BUY]: (size, price) => size.mul(price).negated(),
    [OrderSide.SELL]: (size, price) => size.mul(price),
  },
  [OrderStatus.NEW]: {
    [OrderSide.BUY]: (size, price) => size.mul(price).negated(),
  },
};

const positionChangesByStatus: Partial<Record<OrderStatus, OrderChanges>> = {
  [OrderStatus.FILLED]: {
    [OrderSide.BUY]: (size) => size,
    [OrderSide.SELL]: (size) => size.negated(),
  },
  [OrderStatus.NEW]: {
    [OrderSide.SELL]: (size) => size.negated(),
  },
};

export class AccountBalance {
  private cash = new Decimal(0);
  private readonly sharesByInstrument = new Map<number, Decimal>();

  static fromOrders(orders: Order[]): AccountBalance {
    const balance = new AccountBalance();
    for (const order of orders) {
      balance.apply(order);
    }
    return balance;
  }

  availableCash(): Decimal {
    return this.cash;
  }

  availableShares(instrumentId: number): Decimal {
    return this.sharesByInstrument.get(instrumentId) ?? new Decimal(0);
  }

  private apply(order: Order): void {
    const size = new Decimal(order.size ?? 0);
    const price = new Decimal(order.price ?? 0);
    const status = order.status as OrderStatus;
    const side = order.side as OrderSide;
    const cashChange = cashChangesByStatus[status]?.[side];
    if (cashChange) {
      this.cash = this.cash.plus(cashChange(size, price));
    }

    const instrumentId = order.instrumentId;
    const positionChange = positionChangesByStatus[status]?.[side];
    if (instrumentId === undefined || !positionChange) {
      return;
    }

    const shares = this.availableShares(instrumentId).plus(
      positionChange(size, price),
    );
    this.sharesByInstrument.set(instrumentId, shares);
  }
}
