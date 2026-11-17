import { OrderSide, OrderStatus, OrderType } from '../domain/order.constants';

export class OrderResponseDto {
  id: number;
  userId: number;
  instrumentId: number;
  size: number;
  price: number;
  type: OrderType;
  side: OrderSide;
  status: OrderStatus;
  datetime: Date;
}
