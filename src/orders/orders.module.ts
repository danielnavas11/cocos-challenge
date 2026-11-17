import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Instrument } from '../database/entities/instrument';
import { Market } from '../database/entities/market';
import { Order } from '../database/entities/order';
import { User } from '../database/entities/user';
import { CashInOrderHandler } from './strategies/orders/cash-in-order.handler';
import { CashOutOrderHandler } from './strategies/orders/cash-out-order.handler';
import { BuyOrderHandler } from './strategies/orders/buy-order.handler';
import { SellOrderHandler } from './strategies/orders/sell-order.handler';
import { LimitOrderStrategy } from './strategies/types/limit-order.strategy';
import { MarketOrderStrategy } from './strategies/types/market-order.strategy';
import {
  ORDER_SIDE_HANDLERS,
  ORDER_TYPE_STRATEGIES,
} from './strategies/order-strategy.tokens';
import { OrderSideHandler } from './strategies/orders/order-side-handler.interface';
import { OrderTypeStrategy } from './strategies/types/order-type-strategy.interface';
import { OrderSide, OrderType } from './domain/order.constants';
import { OrdersController } from './orders.controller';
import { OrdersMapper } from './orders.mapper';
import { OrdersService } from './orders.service';
import { UnitOfWorkService } from '../database/unit-of-work.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Instrument, Order, Market])],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrdersMapper,
    MarketOrderStrategy,
    LimitOrderStrategy,
    BuyOrderHandler,
    SellOrderHandler,
    CashInOrderHandler,
    CashOutOrderHandler,
    UnitOfWorkService,
    {
      provide: ORDER_TYPE_STRATEGIES,
      useFactory: (market: MarketOrderStrategy, limit: LimitOrderStrategy) =>
        new Map<OrderType, OrderTypeStrategy>([
          [OrderType.MARKET, market],
          [OrderType.LIMIT, limit],
        ]),
      inject: [MarketOrderStrategy, LimitOrderStrategy],
    },
    {
      provide: ORDER_SIDE_HANDLERS,
      useFactory: (
        buy: BuyOrderHandler,
        sell: SellOrderHandler,
        cashIn: CashInOrderHandler,
        cashOut: CashOutOrderHandler,
      ) =>
        new Map<OrderSide, OrderSideHandler>([
          [OrderSide.BUY, buy],
          [OrderSide.SELL, sell],
          [OrderSide.CASH_IN, cashIn],
          [OrderSide.CASH_OUT, cashOut],
        ]),
      inject: [
        BuyOrderHandler,
        SellOrderHandler,
        CashInOrderHandler,
        CashOutOrderHandler,
      ],
    },
  ],
})
export class OrdersModule {}
