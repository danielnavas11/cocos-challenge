import { Order } from '../entities/order';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FILLED_ORDER_STATUS } from '../../portfolio/domain/portfolio.constants';
import { IOrdersRepository } from './index';

@Injectable()
export class OrdersRepository implements IOrdersRepository {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}
  findFilledOrders(userId: number): Promise<Order[]> {
    return this.orderRepository.find({
      where: { userId, status: FILLED_ORDER_STATUS },
      order: { datetime: 'ASC', id: 'ASC' },
    });
  }
}
