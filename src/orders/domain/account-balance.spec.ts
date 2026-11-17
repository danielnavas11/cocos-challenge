import { Order } from '../../database/entities/order';
import { AccountBalance } from './account-balance';
import { OrderSide, OrderStatus } from './order.constants';

describe('AccountBalance', () => {
  it('calculates filled cash flows and reserves NEW buys and sells', () => {
    const orders = [
      {
        side: OrderSide.CASH_IN,
        status: OrderStatus.FILLED,
        size: 1000,
        price: 1,
      },
      {
        side: OrderSide.BUY,
        status: OrderStatus.FILLED,
        instrumentId: 7,
        size: 10,
        price: 20,
      },
      {
        side: OrderSide.SELL,
        status: OrderStatus.FILLED,
        instrumentId: 7,
        size: 3,
        price: 25,
      },
      {
        side: OrderSide.CASH_OUT,
        status: OrderStatus.FILLED,
        size: 50,
        price: 1,
      },
      {
        side: OrderSide.BUY,
        status: OrderStatus.NEW,
        instrumentId: 8,
        size: 4,
        price: 30,
      },
      {
        side: OrderSide.SELL,
        status: OrderStatus.NEW,
        instrumentId: 7,
        size: 2,
        price: 40,
      },
      {
        side: OrderSide.BUY,
        status: OrderStatus.REJECTED,
        instrumentId: 7,
        size: 100,
        price: 1,
      },
    ] as Order[];

    const balance = AccountBalance.fromOrders(orders);

    expect(balance.availableCash().toNumber()).toBe(705);
    expect(balance.availableShares(7).toNumber()).toBe(5);
    expect(balance.availableShares(8).toNumber()).toBe(0);
  });

  it('uses decimal arithmetic for accumulated cash', () => {
    const balance = AccountBalance.fromOrders([
      {
        side: OrderSide.CASH_IN,
        status: OrderStatus.FILLED,
        size: 1,
        price: 1,
      },
      {
        side: OrderSide.BUY,
        status: OrderStatus.FILLED,
        instrumentId: 1,
        size: 1,
        price: 0.1,
      },
      {
        side: OrderSide.BUY,
        status: OrderStatus.FILLED,
        instrumentId: 2,
        size: 1,
        price: 0.2,
      },
    ] as Order[]);

    expect(balance.availableCash().toString()).toBe('0.7');
  });
});
