import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Order } from './entities/order';
import {
  IInstrumentRepository,
  IMarketRepository,
  IOrdersRepository,
  IUserRepository,
} from './repositories';
import { OrdersRepository } from './repositories/order.repository';
import { UserRepository } from './repositories/user.repository';
import { InstrumentRepository } from './repositories/instrument.repository';
import { User } from './entities/user';
import { Instrument } from './entities/instrument';
import { MarketRepository } from './repositories/market.repository';
import { Market } from './entities/market';

export interface OrderTransaction {
  orders: IOrdersRepository;
  users: IUserRepository;
  instruments: IInstrumentRepository;
  markets: IMarketRepository;
}
@Injectable()
export class UnitOfWorkService {
  constructor(private readonly dataSource: DataSource) {}

  async doTransactional<T>(
    fn: (transaction: OrderTransaction) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      const transaction: OrderTransaction = {
        orders: new OrdersRepository(manager.getRepository(Order)),
        users: new UserRepository(manager.getRepository(User)),
        instruments: new InstrumentRepository(
          manager.getRepository(Instrument),
        ),
        markets: new MarketRepository(manager.getRepository(Market)),
      };
      return fn(transaction);
    });
  }
}
