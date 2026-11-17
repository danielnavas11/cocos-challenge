import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Instrument } from '../database/entities/instrument';
import { Market } from '../database/entities/market';
import { Order } from '../database/entities/order';
import { OrderSide, OrderStatus, OrderType } from './domain/order.constants';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersMapper } from './orders.mapper';
import { OrdersService } from './orders.service';
import { BuyOrderHandler } from './strategies/orders/buy-order.handler';
import { CashInOrderHandler } from './strategies/orders/cash-in-order.handler';
import { CashOutOrderHandler } from './strategies/orders/cash-out-order.handler';
import { SellOrderHandler } from './strategies/orders/sell-order.handler';
import { LimitOrderStrategy } from './strategies/types/limit-order.strategy';
import { MarketOrderStrategy } from './strategies/types/market-order.strategy';
import { OrderSideHandler } from './strategies/orders/order-side-handler.interface';
import { OrderTypeStrategy } from './strategies/types/order-type-strategy.interface';
import {
  OrderTransaction,
  UnitOfWorkService,
} from '../database/unit-of-work.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let transaction: OrderTransaction;
  let activeOrders: Order[];
  let userExists: boolean;
  let foundOrder: Order | null;

  const asset = { id: 5, ticker: 'ACME', type: 'ACCIONES' } as Instrument;
  const currency = { id: 1, ticker: 'ARS', type: 'MONEDA' } as Instrument;
  /* eslint-disable @typescript-eslint/no-unused-vars */
  beforeEach(() => {
    activeOrders = [];
    userExists = true;
    foundOrder = null;
    transaction = {
      users: {
        lockById: jest.fn(async () => userExists),
        existsById: jest.fn(async (userId: number): Promise<boolean> => true),
      },
      orders: {
        findActiveOrders: jest.fn(async () => activeOrders),
        findByIdForUpdate: jest.fn(async () => foundOrder),
        save: jest.fn(async (order: Order) => ({
          ...order,
          id: order.id ?? 90,
        })),
        findFilledOrders: jest.fn(
          async (userId: number): Promise<Order[]> => [],
        ),
      },
      instruments: {
        findById: jest.fn(async () => asset),
        findCurrency: jest.fn(async () => currency),
        findByIds: jest.fn(
          async (instrumentIds: number[]): Promise<Instrument[]> => [],
        ),
        searchByTickerOrName: jest.fn(
          async (query: string): Promise<Instrument[]> => [],
        ),
      },
      markets: {
        findLatestByInstrumentIds: jest.fn(
          async () => new Map([[5, { close: 10 } as Market]]),
        ),
      },
    };
    const unitOfWork = {
      doTransactional: jest.fn((work) => work(transaction)),
    } as unknown as UnitOfWorkService;
    service = new OrdersService(
      unitOfWork,
      new Map<OrderSide, OrderSideHandler>([
        [OrderSide.BUY, new BuyOrderHandler()],
        [OrderSide.SELL, new SellOrderHandler()],
        [OrderSide.CASH_IN, new CashInOrderHandler()],
        [OrderSide.CASH_OUT, new CashOutOrderHandler()],
      ]),
      new Map<OrderType, OrderTypeStrategy>([
        [OrderType.MARKET, new MarketOrderStrategy()],
        [OrderType.LIMIT, new LimitOrderStrategy()],
      ]),
      new OrdersMapper(),
    );
  });

  const create = (overrides: Partial<CreateOrderDto> = {}) =>
    service.create({
      userId: 10,
      instrumentId: 5,
      side: OrderSide.BUY,
      type: OrderType.MARKET,
      size: 2,
      ...overrides,
    });

  const cashIn = (size: number): Order =>
    ({
      side: OrderSide.CASH_IN,
      status: OrderStatus.FILLED,
      size,
      price: 1,
      instrumentId: 1,
    }) as Order;

  it('fills MARKET buys at the latest close when funds are sufficient', async () => {
    activeOrders = [cashIn(100)];

    const result = await create();

    expect(result).toMatchObject({
      userId: 10,
      instrumentId: 5,
      size: 2,
      price: 10,
      type: OrderType.MARKET,
      side: OrderSide.BUY,
      status: OrderStatus.FILLED,
    });
    expect(transaction.orders.save).toHaveBeenCalled();
  });

  it('persists insufficient BUYs as REJECTED', async () => {
    activeOrders = [cashIn(10)];

    const result = await create({ size: 2 });

    expect(result.status).toBe(OrderStatus.REJECTED);
    expect(transaction.orders.save).toHaveBeenCalled();
  });

  it('persists SELLs without enough shares as REJECTED', async () => {
    activeOrders = [cashIn(100)];

    const result = await create({ side: OrderSide.SELL, size: 1 });

    expect(result.status).toBe(OrderStatus.REJECTED);
  });

  it('persists an amount smaller than one market share as REJECTED with size zero', async () => {
    activeOrders = [cashIn(100)];

    const result = await create({ size: undefined, amount: 9 });

    expect(result).toMatchObject({ size: 0, status: OrderStatus.REJECTED });
  });

  it('saves valid LIMIT orders as NEW and reserves their cash on later orders', async () => {
    activeOrders = [cashIn(100)];
    const limit = await create({ type: OrderType.LIMIT, price: 30, size: 2 });
    expect(limit.status).toBe(OrderStatus.NEW);

    activeOrders = [...activeOrders, { ...limit } as Order];
    const laterBuy = await create({ size: 5 });
    expect(laterBuy.status).toBe(OrderStatus.REJECTED);
  });

  it('reserves pending SELL shares when checking a later SELL', async () => {
    activeOrders = [
      cashIn(100),
      {
        side: OrderSide.BUY,
        status: OrderStatus.FILLED,
        instrumentId: 5,
        size: 3,
        price: 10,
      } as Order,
      {
        side: OrderSide.SELL,
        status: OrderStatus.NEW,
        instrumentId: 5,
        size: 2,
        price: 10,
      } as Order,
    ];

    const result = await create({ side: OrderSide.SELL, size: 2 });
    expect(result.status).toBe(OrderStatus.REJECTED);
  });

  it('executes cash deposits on ARS with unit price', async () => {
    const result = await create({
      instrumentId: undefined,
      side: OrderSide.CASH_IN,
      size: 100,
    });

    expect(result).toMatchObject({
      instrumentId: 1,
      price: 1,
      status: OrderStatus.FILLED,
    });
  });

  it('rejects cash withdrawals when available cash is insufficient', async () => {
    activeOrders = [cashIn(10)];

    const result = await create({
      instrumentId: undefined,
      side: OrderSide.CASH_OUT,
      size: 20,
    });

    expect(result).toMatchObject({
      instrumentId: 1,
      price: 1,
      status: OrderStatus.REJECTED,
    });
  });

  it('rejects asset trading on the ARS instrument', async () => {
    (transaction.instruments.findById as jest.Mock).mockResolvedValue(currency);
    await expect(create()).rejects.toThrow(
      'Las transferencias deben realizarse',
    );
  });

  it('requires a current market price for MARKET asset orders', async () => {
    (
      transaction.markets.findLatestByInstrumentIds as jest.Mock
    ).mockResolvedValue(new Map());
    await expect(create()).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('returns not found when the user does not exist', async () => {
    userExists = false;
    await expect(create()).rejects.toBeInstanceOf(NotFoundException);
    expect(transaction.orders.save).not.toHaveBeenCalled();
  });

  it('cancels a NEW order transactionally', async () => {
    foundOrder = {
      id: 22,
      userId: 10,
      instrumentId: 5,
      size: 1,
      price: 10,
      type: OrderType.LIMIT,
      side: OrderSide.BUY,
      status: OrderStatus.NEW,
      datetime: new Date(),
    } as Order;

    const result = await service.cancel(22);
    expect(result.status).toBe(OrderStatus.CANCELLED);
    expect(transaction.orders.findByIdForUpdate).toHaveBeenCalledWith(22);
    expect(transaction.users.lockById).toHaveBeenCalledWith(10);
  });

  it('rejects cancellation of filled orders with a conflict', async () => {
    foundOrder = { id: 22, status: OrderStatus.FILLED } as Order;
    await expect(service.cancel(22)).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns not found when cancelling an unknown order', async () => {
    await expect(service.cancel(404)).rejects.toBeInstanceOf(NotFoundException);
  });
});
