import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Instrument } from '../database/entities/instrument';
import { InstrumentRepository } from '../database/repositories/instrument.repository';
import { INSTRUMENT_REPOSITORY } from '../database/repositories';
import { InstrumentsController } from './instruments.controller';
import { InstrumentsMapper } from './instruments.mapper';
import { InstrumentsService } from './instruments.service';
import { SearchQueryPipe } from './pipes/search-query.pipe';

@Module({
  imports: [TypeOrmModule.forFeature([Instrument])],
  controllers: [InstrumentsController],
  providers: [
    InstrumentsService,
    InstrumentsMapper,
    SearchQueryPipe,
    { provide: INSTRUMENT_REPOSITORY, useClass: InstrumentRepository },
  ],
})
export class InstrumentsModule {}
