import { FindOperator, Repository } from 'typeorm';
import { Instrument } from '../entities/instrument';
import { InstrumentRepository } from './instrument.repository';
import { CURRENCY_INSTRUMENT_TYPE, CURRENCY_TICKER } from '../../constants';

describe('InstrumentRepository', () => {
  let repository: InstrumentRepository;
  let instrumentTypeOrmRepository: {
    find: jest.Mock;
    findOneBy: jest.Mock;
  };

  beforeEach(() => {
    instrumentTypeOrmRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOneBy: jest.fn().mockResolvedValue(null),
    };
    repository = new InstrumentRepository(
      instrumentTypeOrmRepository as unknown as Repository<Instrument>,
    );
  });

  it('searches ticker and name case-insensitively with escaped wildcards', async () => {
    await repository.searchByTickerOrName('A%_\\B');

    const [options] = instrumentTypeOrmRepository.find.mock.calls[0];
    const [tickerCondition, nameCondition] = options.where;
    const tickerPattern = tickerCondition.ticker as FindOperator<string>;
    const namePattern = nameCondition.name as FindOperator<string>;

    expect(tickerPattern.type).toBe('ilike');
    expect(tickerPattern.value).toBe('%A\\%\\_\\\\B%');
    expect(namePattern.type).toBe('ilike');
    expect(namePattern.value).toBe('%A\\%\\_\\\\B%');
    expect(options.order).toEqual({ ticker: 'ASC', id: 'ASC' });
  });

  it('looks up an instrument by its identifier', async () => {
    await repository.findById(12);
    expect(instrumentTypeOrmRepository.findOneBy).toHaveBeenCalledWith({
      id: 12,
    });
  });

  it('finds the ARS currency instrument by ticker and type', async () => {
    await repository.findCurrency();
    expect(instrumentTypeOrmRepository.findOneBy).toHaveBeenCalledWith({
      ticker: CURRENCY_TICKER,
      type: CURRENCY_INSTRUMENT_TYPE,
    });
  });
});
