import 'reflect-metadata';
import { InstrumentRepository } from '../database/repositories/instrument.repository';
import { INSTRUMENT_REPOSITORY } from '../database/repositories';
import { InstrumentsController } from './instruments.controller';
import { InstrumentsMapper } from './instruments.mapper';
import { InstrumentsModule } from './instruments.module';
import { InstrumentsService } from './instruments.service';
import { SearchQueryPipe } from './pipes/search-query.pipe';

describe('InstrumentsModule', () => {
  it('registers the instrument search controller and repository adapter', () => {
    expect(Reflect.getMetadata('controllers', InstrumentsModule)).toContain(
      InstrumentsController,
    );
    expect(Reflect.getMetadata('providers', InstrumentsModule)).toEqual(
      expect.arrayContaining([
        InstrumentsService,
        InstrumentsMapper,
        SearchQueryPipe,
        { provide: INSTRUMENT_REPOSITORY, useClass: InstrumentRepository },
      ]),
    );
  });
});
