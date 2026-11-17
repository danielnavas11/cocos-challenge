import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import {
  INSTRUMENT_REPOSITORY,
  MARKET_REPOSITORY,
  ORDERS_REPOSITORY,
  USER_REPOSITORY,
} from '../src/database/repositories';
import {
  OrderTransaction,
  UnitOfWorkService,
} from '../src/database/unit-of-work.service';
import { Instrument } from '../src/database/entities/instrument';
import { Market } from '../src/database/entities/market';
import { Order } from '../src/database/entities/order';
import {
  OrderSide,
  OrderStatus,
  OrderType,
} from '../src/orders/domain/order.constants';

describe('App (e2e)', () => {
  let app: INestApplication;

  const mockCurrency: Instrument = {
    id: 1,
    ticker: 'ARS',
    name: 'Pesos Argentinos',
    type: 'MONEDA',
  } as Instrument;

  const mockInstrument: Instrument = {
    id: 50,
    ticker: 'PAMP',
    name: 'Pampa Holding',
    type: 'ACCIONES',
  } as Instrument;

  let activeOrders: Order[] = [];
  let nextOrderId = 100;

  const userRepositoryMock = {
    existsById: jest.fn(async (userId: number) => userId === 1),
    lockById: jest.fn(async (userId: number) => userId === 1),
  };

  const ordersRepositoryMock = {
    findFilledOrders: jest.fn(async (userId: number) =>
      activeOrders.filter(
        (o) => o.userId === userId && o.status === OrderStatus.FILLED,
      ),
    ),
    findActiveOrders: jest.fn(async (userId: number) =>
      activeOrders.filter(
        (o) =>
          o.userId === userId &&
          (o.status === OrderStatus.FILLED || o.status === OrderStatus.NEW),
      ),
    ),
    findByIdForUpdate: jest.fn(async (orderId: number) => {
      const found = activeOrders.find((o) => o.id === orderId);
      return found ?? null;
    }),
    save: jest.fn(async (order: Order) => {
      if (!order.id) {
        order.id = nextOrderId++;
      }
      const existingIdx = activeOrders.findIndex((o) => o.id === order.id);
      if (existingIdx >= 0) {
        activeOrders[existingIdx] = { ...order };
      } else {
        activeOrders.push({ ...order });
      }
      return order;
    }),
  };

  const instrumentRepositoryMock = {
    findById: jest.fn(async (id: number) => {
      if (id === 1) return mockCurrency;
      if (id === 50) return mockInstrument;
      return null;
    }),
    findByIds: jest.fn(async (ids: number[]) => {
      const result: Instrument[] = [];
      if (ids.includes(1)) result.push(mockCurrency);
      if (ids.includes(50)) result.push(mockInstrument);
      return result;
    }),
    findCurrency: jest.fn(async () => mockCurrency),
    searchByTickerOrName: jest.fn(async (query: string) => {
      const upper = query.toUpperCase();
      if (
        mockInstrument.ticker.includes(upper) ||
        mockInstrument.name.toUpperCase().includes(upper)
      ) {
        return [mockInstrument];
      }
      return [];
    }),
  };

  const marketRepositoryMock = {
    findLatestByInstrumentIds: jest.fn(async (instrumentIds: number[]) => {
      const map = new Map<number, Market>();
      if (instrumentIds.includes(50)) {
        map.set(50, {
          id: 1,
          instrumentId: 50,
          close: 100,
          previousClose: 95,
          date: new Date('2025-01-01').toISOString(),
        } as Market);
      }
      return map;
    }),
  };

  const mockTransaction: OrderTransaction = {
    users: userRepositoryMock,
    orders: ordersRepositoryMock,
    instruments: instrumentRepositoryMock,
    markets: marketRepositoryMock,
  };

  const mockUnitOfWorkService = {
    doTransactional: jest.fn(
      async <T>(work: (t: OrderTransaction) => Promise<T>): Promise<T> => {
        return work(mockTransaction);
      },
    ),
  };

  const fakeTypeOrmRepository = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    exists: jest.fn().mockResolvedValue(false),
    save: jest.fn((entity) => Promise.resolve(entity)),
    createQueryBuilder: jest.fn(),
  };

  const fakeDataSource = {
    isInitialized: true,
    options: { type: 'postgres' },
    entityMetadatas: [],
    manager: {},
    getRepository: jest.fn(() => fakeTypeOrmRepository),
    transaction: jest.fn(),
    destroy: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DataSource)
      .useValue(fakeDataSource)
      .overrideProvider(DataSource)
      .useValue(fakeDataSource)
      .overrideProvider(UnitOfWorkService)
      .useValue(mockUnitOfWorkService)
      .overrideProvider(USER_REPOSITORY)
      .useValue(userRepositoryMock)
      .overrideProvider(ORDERS_REPOSITORY)
      .useValue(ordersRepositoryMock)
      .overrideProvider(INSTRUMENT_REPOSITORY)
      .useValue(instrumentRepositoryMock)
      .overrideProvider(MARKET_REPOSITORY)
      .useValue(marketRepositoryMock)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    activeOrders = [
      {
        id: 1,
        userId: 1,
        instrumentId: 1,
        side: OrderSide.CASH_IN,
        type: OrderType.MARKET,
        status: OrderStatus.FILLED,
        size: 5000,
        price: 1,
        datetime: new Date(),
      } as Order,
    ];
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('/health (GET)', () => {
    it('debe responder estado ok', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect({ status: 'ok' });
    });
  });

  describe('/portfolio/:userId (GET)', () => {
    it('debe obtener el portfolio de un usuario existente', () => {
      return request(app.getHttpServer()).get('/portfolio/1').expect(200);
    });

    it('debe responder 404 si el usuario no existe', () => {
      return request(app.getHttpServer()).get('/portfolio/1212').expect(404);
    });

    it('debe responder 400 si el parámetro de usuario no es numérico', () => {
      return request(app.getHttpServer()).get('/portfolio/qwerty').expect(400);
    });
  });

  describe('/instruments (GET)', () => {
    it('debe buscar instrumentos por query', () => {
      return request(app.getHttpServer())
        .get('/instruments?query=PAMP')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body[0].ticker).toBe('PAMP');
        });
    });

    it('debe fallar con 400 si falta el parámetro query', () => {
      return request(app.getHttpServer()).get('/instruments').expect(400);
    });
  });

  describe('/orders (POST & DELETE)', () => {
    it('debe crear un depósito de dinero CASH_IN', async () => {
      const response = await request(app.getHttpServer())
        .post('/orders')
        .send({
          userId: 1,
          type: 'MARKET',
          side: 'CASH_IN',
          size: 1000,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        userId: 1,
        side: 'CASH_IN',
        status: 'FILLED',
      });
    });

    it('debe crear una orden de compra MARKET', async () => {
      const response = await request(app.getHttpServer())
        .post('/orders')
        .send({
          userId: 1,
          instrumentId: 50,
          side: 'BUY',
          type: 'MARKET',
          size: 2,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        userId: 1,
        instrumentId: 50,
        side: 'BUY',
        status: 'FILLED',
      });
    });

    it('debe cancelar una orden en estado NEW', async () => {
      activeOrders.push({
        id: 15,
        userId: 1,
        instrumentId: 50,
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        status: OrderStatus.NEW,
        size: 1,
        price: 90,
        datetime: new Date(),
      } as Order);

      const response = await request(app.getHttpServer())
        .delete('/orders/15/cancel')
        .expect(200);

      expect(response.body).toMatchObject({
        id: 15,
        status: 'CANCELLED',
      });
    });

    it('debe retornar 404 al intentar cancelar una orden inexistente', () => {
      return request(app.getHttpServer())
        .delete('/orders/1212/cancel')
        .expect(404);
    });

    it('debe retornar 400 si el payload es inválido', () => {
      return request(app.getHttpServer()).post('/orders').send({}).expect(400);
    });
  });
});
