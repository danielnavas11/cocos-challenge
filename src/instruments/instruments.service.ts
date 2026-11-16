import { Inject, Injectable } from '@nestjs/common';
import {
  INSTRUMENT_REPOSITORY,
  IInstrumentRepository,
} from '../database/repositories';
import { InstrumentResponseDto } from './dto/instrument-response.dto';
import { InstrumentsMapper } from './instruments.mapper';

@Injectable()
export class InstrumentsService {
  constructor(
    @Inject(INSTRUMENT_REPOSITORY)
    private readonly instrumentRepository: IInstrumentRepository,
    private readonly instrumentsMapper: InstrumentsMapper,
  ) {}

  async search(query: string): Promise<InstrumentResponseDto[]> {
    const instruments =
      await this.instrumentRepository.searchByTickerOrName(query);
    return instruments.map((instrument) =>
      this.instrumentsMapper.toResponse(instrument),
    );
  }
}
