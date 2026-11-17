import { BadRequestException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { CreateOrderDto } from '../dto/create-order.dto';
import { MAX_ORDER_SIZE } from '../../constants';

export class OrderSize {
  static resolve(input: CreateOrderDto, price: Decimal): number {
    let size: Decimal | null = null;

    if (input.size !== undefined) {
      size = new Decimal(input.size);
    } else if (input.amount !== undefined) {
      size = new Decimal(input.amount).dividedToIntegerBy(price);
    }

    if (!size) {
      throw new BadRequestException('Debe indicar size o amount');
    }
    if (size.gt(MAX_ORDER_SIZE)) {
      throw new BadRequestException('La cantidad supera el máximo permitido');
    }
    return size.toNumber();
  }
}
