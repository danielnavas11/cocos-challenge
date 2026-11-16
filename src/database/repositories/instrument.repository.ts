import { Instrument } from '../entities/instrument';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { IInstrumentRepository } from './index';

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

  searchByTickerOrName(query: string): Promise<Instrument[]> {
    const escapedQuery = query.replace(/[\\%_]/g, String.raw`\$&`);
    const pattern = `%${escapedQuery}%`;

    return this.instrumentRepository.find({
      where: [{ ticker: ILike(pattern) }, { name: ILike(pattern) }],
      order: { ticker: 'ASC', id: 'ASC' },
    });
  }
}
