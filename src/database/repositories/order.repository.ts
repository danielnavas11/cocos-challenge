import { Order } from '../entities/order';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { OrderStatus } from '../../orders/domain/order.constants';
import { IOrdersRepository } from './index';

@Injectable()
export class OrdersRepository implements IOrdersRepository {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}
  findFilledOrders(userId: number): Promise<Order[]> {
    return this.orderRepository.find({
      where: { userId, status: OrderStatus.FILLED },
      order: { datetime: 'ASC', id: 'ASC' },
    });
  }

  findActiveOrders(userId: number): Promise<Order[]> {
    return this.orderRepository.find({
      where: { userId, status: In([OrderStatus.FILLED, OrderStatus.NEW]) },
      order: { datetime: 'ASC', id: 'ASC' },
    });
  }

  findByIdForUpdate(orderId: number): Promise<Order | null> {
    return this.orderRepository
      .createQueryBuilder('order')
      .setLock('pessimistic_write')
      .where('order.id = :orderId', { orderId })
      .getOne();
  }

  save(order: Order): Promise<Order> {
    return this.orderRepository.save(order);
  }
}
