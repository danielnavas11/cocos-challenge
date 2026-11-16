import Decimal from 'decimal.js';
import { Instrument } from '../../database/entities/instrument';
import { Market } from '../../database/entities/market';
import { PositionBalance } from './position-balance';
import { valuePosition } from './position-valuation';

describe('valuePosition', () => {
  it('returns no daily return when previous close is zero', () => {
    const balance = new PositionBalance({ id: 1 } as Instrument);
    balance.buy(new Decimal(1), new Decimal(100));

    const valuation = valuePosition(balance, {
      close: 110,
      previousClose: 0,
    } as Market);

    expect(valuation.marketValue.eq(110)).toBe(true);
    expect(valuation.totalReturn?.eq(10)).toBe(true);
    expect(valuation.dailyReturn).toBeNull();
  });
});
