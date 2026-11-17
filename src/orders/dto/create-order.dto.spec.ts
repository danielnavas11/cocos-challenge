import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateOrderDto } from './create-order.dto';
import { OrderSide, OrderType } from '../domain/order.constants';

const validOrder = {
  userId: 1,
  instrumentId: 5,
  side: OrderSide.BUY,
  type: OrderType.MARKET,
  size: 2,
};

async function validationErrors(input: Record<string, unknown>) {
  return validate(plainToInstance(CreateOrderDto, input));
}

describe('CreateOrderDto', () => {
  it('accepts one positive integer size and transforms numeric input', async () => {
    const dto = plainToInstance(CreateOrderDto, { ...validOrder, size: '2' });
    expect(dto.size).toBe(2);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('requires exactly one of size or amount', async () => {
    expect(
      await validationErrors({ ...validOrder, size: undefined }),
    ).not.toHaveLength(0);
    expect(
      await validationErrors({ ...validOrder, amount: 20 }),
    ).not.toHaveLength(0);
    expect(
      await validationErrors({
        ...validOrder,
        size: undefined,
        amount: undefined,
      }),
    ).not.toHaveLength(0);
  });

  it('requires a limit price and validates positive precision', async () => {
    expect(
      await validationErrors({ ...validOrder, type: OrderType.LIMIT }),
    ).not.toHaveLength(0);
    expect(
      await validationErrors({
        ...validOrder,
        type: OrderType.LIMIT,
        price: 0,
      }),
    ).not.toHaveLength(0);
    expect(
      await validationErrors({
        ...validOrder,
        type: OrderType.LIMIT,
        price: 10.123,
      }),
    ).not.toHaveLength(0);
    expect(
      await validationErrors({
        ...validOrder,
        type: OrderType.LIMIT,
        price: 10.12,
      }),
    ).toHaveLength(0);
  });

  it('allows cash sides without a user-provided instrument id', async () => {
    const input = {
      userId: 1,
      side: OrderSide.CASH_IN,
      type: OrderType.MARKET,
      amount: 100,
    };
    expect(await validationErrors(input)).toHaveLength(0);
  });
});
