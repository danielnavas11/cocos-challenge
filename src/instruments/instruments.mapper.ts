import { Injectable } from '@nestjs/common';
import { Instrument } from '../database/entities/instrument';
import { InstrumentResponseDto } from './dto/instrument-response.dto';

@Injectable()
export class InstrumentsMapper {
  toResponse(instrument: Instrument): InstrumentResponseDto {
    return {
      id: instrument.id,
      ticker: instrument.ticker,
      name: instrument.name,
      type: instrument.type,
    };
  }
}
