import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioMapper } from './portfolio.mapper';
import { PortfolioService } from './portfolio.service';
import {
  INSTRUMENT_REPOSITORY,
  MARKET_REPOSITORY,
  ORDERS_REPOSITORY,
  USER_REPOSITORY,
} from '../database/repositories';

describe('PortfolioService', () => {
  let service: PortfolioService;
  let userRepositoryMock: { existsById: jest.Mock };
  let ordersRepositoryMock: { findFilledOrders: jest.Mock };
  let instrumentRepositoryMock: { findByIds: jest.Mock };
  let marketRepositoryMock: { findLatestByInstrumentIds: jest.Mock };

  beforeEach(async () => {
    userRepositoryMock = { existsById: jest.fn().mockResolvedValue(true) };
    ordersRepositoryMock = {
      findFilledOrders: jest.fn().mockResolvedValue([]),
    };
    instrumentRepositoryMock = { findByIds: jest.fn().mockResolvedValue([]) };
    marketRepositoryMock = {
      findLatestByInstrumentIds: jest.fn().mockResolvedValue(new Map()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioService,
        PortfolioMapper,
        { provide: USER_REPOSITORY, useValue: userRepositoryMock },
        { provide: ORDERS_REPOSITORY, useValue: ordersRepositoryMock },
        {
          provide: INSTRUMENT_REPOSITORY,
          useValue: instrumentRepositoryMock,
        },
        {
          provide: MARKET_REPOSITORY,
          useValue: marketRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<PortfolioService>(PortfolioService);
  });

  it('throws when the user does not exist', async () => {
    userRepositoryMock.existsById.mockResolvedValue(false);

    await expect(service.getPortfolio(999)).rejects.toThrow(NotFoundException);
    expect(ordersRepositoryMock.findFilledOrders).not.toHaveBeenCalled();
  });

  it('returns an empty portfolio when the user has no filled orders', async () => {
    await expect(service.getPortfolio(1)).resolves.toEqual({
      totalAccountValue: 0,
      availableCash: 0,
      positions: [],
    });
    expect(instrumentRepositoryMock.findByIds).not.toHaveBeenCalled();
    expect(
      marketRepositoryMock.findLatestByInstrumentIds,
    ).not.toHaveBeenCalled();
  });

  it('calculates cash, position value, and total and daily returns', async () => {
    ordersRepositoryMock.findFilledOrders.mockResolvedValue([
      { instrumentId: 99, side: 'CASH_IN', size: 10000, price: 1 },
      { instrumentId: 7, side: 'BUY', size: 10, price: 100 },
      { instrumentId: 7, side: 'SELL', size: 2, price: 120 },
      { instrumentId: 99, side: 'CASH_OUT', size: 1000, price: 1 },
    ]);
    instrumentRepositoryMock.findByIds.mockResolvedValue([
      { id: 7, ticker: 'ACME', name: 'Acme Corp', type: 'ACCIONES' },
      { id: 99, ticker: 'ARS', name: 'Peso argentino', type: 'MONEDA' },
    ]);
    marketRepositoryMock.findLatestByInstrumentIds.mockResolvedValue(
      new Map([
        [
          7,
          {
            id: 8,
            instrumentId: 7,
            close: 130,
            previousClose: 125,
            date: '2025-01-02',
          },
        ],
      ]),
    );

    await expect(service.getPortfolio(1)).resolves.toEqual({
      totalAccountValue: 9280,
      availableCash: 8240,
      positions: [
        {
          instrumentId: 7,
          ticker: 'ACME',
          name: 'Acme Corp',
          type: 'ACCIONES',
          size: 8,
          marketValue: 1040,
          totalReturn: 30,
          dailyReturn: 4,
        },
      ],
    });
    expect(marketRepositoryMock.findLatestByInstrumentIds).toHaveBeenCalledWith(
      [7],
    );
  });

  it('excludes positions whose net quantity is zero', async () => {
    ordersRepositoryMock.findFilledOrders.mockResolvedValue([
      { instrumentId: 7, side: 'BUY', size: 3, price: 20 },
      { instrumentId: 7, side: 'SELL', size: 3, price: 25 },
    ]);
    instrumentRepositoryMock.findByIds.mockResolvedValue([
      { id: 7, ticker: 'ACME', name: 'Acme Corp', type: 'ACCIONES' },
    ]);

    await expect(service.getPortfolio(1)).resolves.toMatchObject({
      availableCash: 15,
      positions: [],
      totalAccountValue: 15,
    });
    expect(
      marketRepositoryMock.findLatestByInstrumentIds,
    ).not.toHaveBeenCalled();
  });

  it('reduces cost basis at the average cost when selling part of a position', async () => {
    ordersRepositoryMock.findFilledOrders.mockResolvedValue([
      { instrumentId: 7, side: 'BUY', size: 10, price: 10 },
      { instrumentId: 7, side: 'BUY', size: 10, price: 20 },
      { instrumentId: 7, side: 'SELL', size: 5, price: 30 },
    ]);
    instrumentRepositoryMock.findByIds.mockResolvedValue([
      { id: 7, ticker: 'ACME', name: 'Acme Corp', type: 'ACCIONES' },
    ]);
    marketRepositoryMock.findLatestByInstrumentIds.mockResolvedValue(
      new Map([
        [
          7,
          {
            id: 8,
            instrumentId: 7,
            close: 18,
            previousClose: 16,
            date: '2025-01-02',
          },
        ],
      ]),
    );

    await expect(service.getPortfolio(1)).resolves.toMatchObject({
      positions: [{ size: 15, marketValue: 270, totalReturn: 20 }],
    });
  });

  it('retains a position with a zero market value when no quote is available', async () => {
    ordersRepositoryMock.findFilledOrders.mockResolvedValue([
      { instrumentId: 99, side: 'CASH_IN', size: 20, price: 1 },
      { instrumentId: 7, side: 'BUY', size: 2, price: 10 },
    ]);
    instrumentRepositoryMock.findByIds.mockResolvedValue([
      { id: 7, ticker: 'ACME', name: 'Acme Corp', type: 'ACCIONES' },
    ]);

    await expect(service.getPortfolio(1)).resolves.toMatchObject({
      totalAccountValue: 0,
      positions: [{ size: 2, marketValue: 0 }],
    });
  });

  it('uses decimal arithmetic for accumulated sale proceeds', async () => {
    ordersRepositoryMock.findFilledOrders.mockResolvedValue([
      { instrumentId: 7, side: 'SELL', size: 3, price: 0.1 },
      { instrumentId: 7, side: 'SELL', size: 7, price: 0.1 },
    ]);

    await expect(service.getPortfolio(1)).resolves.toMatchObject({
      availableCash: 1,
      totalAccountValue: 1,
    });
  });

  it('queries only filled orders and orders them chronologically', async () => {
    await service.getPortfolio(1);

    expect(ordersRepositoryMock.findFilledOrders).toHaveBeenCalledWith(1);
  });
});
