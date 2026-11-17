import { Injectable } from '@nestjs/common';
import { Order } from '../database/entities/order';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrderSide, OrderStatus, OrderType } from './domain/order.constants';

@Injectable()
export class OrdersMapper {
  toResponse(order: Order): OrderResponseDto {
    return {
      id: order.id,
      userId: order.userId,
      instrumentId: order.instrumentId,
      size: order.size,
      price: order.price,
      type: order.type as OrderType,
      side: order.side as OrderSide,
      status: order.status as OrderStatus,
      datetime: order.datetime,
    };
  }
}
