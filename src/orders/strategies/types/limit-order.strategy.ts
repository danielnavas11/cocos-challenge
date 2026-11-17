import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { OrderStatus, OrderType } from '../../domain/order.constants';
import { CreateOrderDto } from '../../dto/create-order.dto';
import { OrderTypeStrategy } from './order-type-strategy.interface';

@Injectable()
export class LimitOrderStrategy implements OrderTypeStrategy {
  readonly type = OrderType.LIMIT;
  readonly status = OrderStatus.NEW;

  async resolvePrice(input: CreateOrderDto): Promise<Decimal> {
    return new Decimal(input.price);
  }
}
