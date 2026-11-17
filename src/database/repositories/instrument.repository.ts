import { Instrument } from '../entities/instrument';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { IInstrumentRepository } from './index';
import { CURRENCY_INSTRUMENT_TYPE, CURRENCY_TICKER } from '../../constants';

@Injectable()
export class InstrumentRepository implements IInstrumentRepository {
  constructor(
    @InjectRepository(Instrument)
    private readonly instrumentRepository: Repository<Instrument>,
  ) {}

  findByIds(instrumentIds: number[]): Promise<Instrument[]> {
    if (instrumentIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.instrumentRepository.find({
      where: { id: In(instrumentIds) },
    });
  }

  findById(instrumentId: number): Promise<Instrument | null> {
    return this.instrumentRepository.findOneBy({ id: instrumentId });
  }

  findCurrency(): Promise<Instrument | null> {
    return this.instrumentRepository.findOneBy({
      ticker: CURRENCY_TICKER,
      type: CURRENCY_INSTRUMENT_TYPE,
    });
  }

  searchByTickerOrName(query: string): Promise<Instrument[]> {
    const escapedQuery = query.replace(/[\\%_]/g, String.raw`\$&`);
    const pattern = `%${escapedQuery}%`;

    return this.instrumentRepository.find({
      where: [{ ticker: ILike(pattern) }, { name: ILike(pattern) }],
      order: { ticker: 'ASC', id: 'ASC' },
    });
  }
}
