import 'reflect-metadata';
import { OrdersController } from './orders.controller';
import { OrdersMapper } from './orders.mapper';
import { OrdersModule } from './orders.module';
import { OrdersService } from './orders.service';
import {
  ORDER_SIDE_HANDLERS,
  ORDER_TYPE_STRATEGIES,
} from './strategies/order-strategy.tokens';
import { UnitOfWorkService } from '../database/unit-of-work.service';

describe('OrdersModule', () => {
  it('registers the orders API, strategies and transaction provider', () => {
    expect(Reflect.getMetadata('controllers', OrdersModule)).toContain(
      OrdersController,
    );
    expect(Reflect.getMetadata('providers', OrdersModule)).toEqual(
      expect.arrayContaining([
        OrdersService,
        OrdersMapper,
        UnitOfWorkService,
        expect.objectContaining({ provide: ORDER_SIDE_HANDLERS }),
        expect.objectContaining({ provide: ORDER_TYPE_STRATEGIES }),
      ]),
    );
  });
});
