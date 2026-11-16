import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { Instrument } from '../database/entities/instrument';
import { Market } from '../database/entities/market';
import { Order } from '../database/entities/order';
import { PortfolioLedger } from './domain/portfolio-ledger';
import { PositionBalance } from './domain/position-balance';
import { PositionValuation, valuePosition } from './domain/position-valuation';
import { PortfolioResponseDto } from './dto/portfolio-response.dto';
import { PortfolioMapper } from './portfolio.mapper';
import {
  IInstrumentRepository,
  IMarketRepository,
  IOrdersRepository,
  IUserRepository,
  INSTRUMENT_REPOSITORY,
  MARKET_REPOSITORY,
  ORDERS_REPOSITORY,
  USER_REPOSITORY,
} from '../database/repositories';

interface ValuedPosition {
  balance: PositionBalance;
  valuation: PositionValuation;
}

@Injectable()
export class PortfolioService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(ORDERS_REPOSITORY)
    private readonly ordersRepository: IOrdersRepository,
    @Inject(INSTRUMENT_REPOSITORY)
    private readonly instrumentRepository: IInstrumentRepository,
    @Inject(MARKET_REPOSITORY)
    private readonly marketRepository: IMarketRepository,
    private readonly portfolioMapper: PortfolioMapper,
  ) {}

  async getPortfolio(userId: number): Promise<PortfolioResponseDto> {
    await this.ensureUserExists(userId);
    const orders = await this.findFilledOrders(userId);
    const instrumentsById = await this.findInstrumentsById(orders);
    const ledger = PortfolioLedger.fromOrders(orders, instrumentsById);
    const activeBalances = ledger.activePositions();
    const latestMarketByInstrument =
      await this.findLatestMarketByInstrument(activeBalances);
    const valuedPositions = activeBalances.map((balance) => ({
      balance,
      valuation: valuePosition(
        balance,
        latestMarketByInstrument.get(balance.instrument.id),
      ),
    }));
    const totalMarketValue = this.sumMarketValues(valuedPositions);
    const positions = valuedPositions.map(({ balance, valuation }) =>
      this.portfolioMapper.toPositionDto(balance, valuation),
    );

    return this.portfolioMapper.toResponse(
      ledger.availableCash,
      totalMarketValue,
      positions,
    );
  }

  private async ensureUserExists(userId: number): Promise<void> {
    const exists = await this.userRepository.existsById(userId);
    if (!exists) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }
  }

  private findFilledOrders(userId: number): Promise<Order[]> {
    return this.ordersRepository.findFilledOrders(userId);
  }

  private async findInstrumentsById(
    orders: Order[],
  ): Promise<Map<number, Instrument>> {
    const instrumentIds = [
      ...new Set(
        orders
          .map((order) => order.instrumentId)
          .filter((instrumentId): instrumentId is number =>
            Number.isInteger(instrumentId),
          ),
      ),
    ];
    const instruments = instrumentIds.length
      ? await this.instrumentRepository.findByIds(instrumentIds)
      : [];
    return new Map(
      instruments.map((instrument) => [instrument.id, instrument]),
    );
  }

  private findLatestMarketByInstrument(
    activeBalances: PositionBalance[],
  ): Promise<Map<number, Market>> {
    const activeInstrumentIds = activeBalances.map(
      (balance) => balance.instrument.id,
    );
    if (activeInstrumentIds.length === 0) {
      return Promise.resolve(new Map());
    }
    return this.marketRepository.findLatestByInstrumentIds(activeInstrumentIds);
  }

  private sumMarketValues(positions: ValuedPosition[]): Decimal {
    return positions.reduce(
      (total, { valuation }) => total.plus(valuation.marketValue),
      new Decimal(0),
    );
  }
}
