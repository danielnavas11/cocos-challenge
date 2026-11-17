import { BadRequestException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { OrderSize } from './order-size';
import { CreateOrderDto } from '../dto/create-order.dto';

describe('OrderSize', () => {
  it('returns an explicitly supplied size', () => {
    expect(
      OrderSize.resolve({ size: 4 } as CreateOrderDto, new Decimal(10)),
    ).toBe(4);
  });

  it('floors an amount divided by its applicable price', () => {
    expect(
      OrderSize.resolve({ amount: 25 } as CreateOrderDto, new Decimal(10)),
    ).toBe(2);
  });

  it('rejects an amount-derived size beyond the database integer range', () => {
    expect(() =>
      OrderSize.resolve(
        { amount: 30_000_000_000 } as CreateOrderDto,
        new Decimal(1),
      ),
    ).toThrow(BadRequestException);
  });

  it('rejects input without size or amount', () => {
    expect(() =>
      OrderSize.resolve({} as CreateOrderDto, new Decimal(1)),
    ).toThrow(BadRequestException);
  });
});
