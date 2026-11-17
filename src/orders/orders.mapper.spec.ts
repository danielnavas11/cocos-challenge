import { Order } from '../database/entities/order';
import { OrderSide, OrderStatus, OrderType } from './domain/order.constants';
import { OrdersMapper } from './orders.mapper';

describe('OrdersMapper', () => {
  it('maps an order entity to the explicit API response DTO', () => {
    const order = {
      id: 2,
      userId: 1,
      instrumentId: 3,
      size: 4,
      price: 12.5,
      type: OrderType.LIMIT,
      side: OrderSide.BUY,
      status: OrderStatus.NEW,
      datetime: new Date('2026-01-01T00:00:00.000Z'),
    } as Order;

    expect(new OrdersMapper().toResponse(order)).toEqual(order);
  });
});
