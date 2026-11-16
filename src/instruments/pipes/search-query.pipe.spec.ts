import { BadRequestException } from '@nestjs/common';
import { SearchQueryPipe } from './search-query.pipe';

describe('SearchQueryPipe', () => {
  const pipe = new SearchQueryPipe();

  it.each([undefined, null, 123, ''])('rejects invalid query %s', (query) => {
    expect(() => pipe.transform(query)).toThrow(BadRequestException);
  });

  it('rejects a query containing only whitespace', () => {
    expect(() => pipe.transform('   ')).toThrow(BadRequestException);
  });

  it('rejects queries longer than the instrument name column', () => {
    expect(() => pipe.transform('a'.repeat(256))).toThrow(BadRequestException);
  });

  it('trims surrounding whitespace', () => {
    expect(pipe.transform('  ACME  ')).toBe('ACME');
  });

  it('accepts a query with the maximum supported length', () => {
    expect(pipe.transform('a'.repeat(255))).toHaveLength(255);
  });
});
