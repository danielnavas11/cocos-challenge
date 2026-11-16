import { Test, TestingModule } from '@nestjs/testing';
import { INSTRUMENT_REPOSITORY } from '../database/repositories';
import { InstrumentsMapper } from './instruments.mapper';
import { InstrumentsService } from './instruments.service';

describe('InstrumentsService', () => {
  let service: InstrumentsService;
  let instrumentRepository: { searchByTickerOrName: jest.Mock };

  beforeEach(async () => {
    instrumentRepository = {
      searchByTickerOrName: jest.fn().mockResolvedValue([]),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstrumentsService,
        InstrumentsMapper,
        { provide: INSTRUMENT_REPOSITORY, useValue: instrumentRepository },
      ],
    }).compile();

    service = module.get<InstrumentsService>(InstrumentsService);
  });

  it('returns mapped instruments found by the repository', async () => {
    instrumentRepository.searchByTickerOrName.mockResolvedValue([
      { id: 1, ticker: 'ACME', name: 'Acme Corp', type: 'ACCIONES' },
    ]);

    await expect(service.search('Acme')).resolves.toEqual([
      { id: 1, ticker: 'ACME', name: 'Acme Corp', type: 'ACCIONES' },
    ]);
    expect(instrumentRepository.searchByTickerOrName).toHaveBeenCalledWith(
      'Acme',
    );
  });

  it('returns an empty list when no instruments match', async () => {
    await expect(service.search('missing')).resolves.toEqual([]);
  });
});
