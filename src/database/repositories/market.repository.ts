import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Market } from '../entities/market';
import { IMarketRepository } from './index';

@Injectable()
export class MarketRepository implements IMarketRepository {
  constructor(
    @InjectRepository(Market)
    private readonly marketRepository: Repository<Market>,
  ) {}

  async findLatestByInstrumentIds(
    instrumentIds: number[],
  ): Promise<Map<number, Market>> {
    if (instrumentIds.length === 0) {
      return new Map();
    }

    const marketData = await this.marketRepository.find({
      where: { instrumentId: In(instrumentIds) },
      order: { date: 'DESC', id: 'DESC' },
    });
    const latestMarketByInstrument = new Map<number, Market>();
    for (const market of marketData) {
      if (
        market.instrumentId !== null &&
        market.instrumentId !== undefined &&
        !latestMarketByInstrument.has(market.instrumentId)
      ) {
        latestMarketByInstrument.set(market.instrumentId, market);
      }
    }
    return latestMarketByInstrument;
  }
}
