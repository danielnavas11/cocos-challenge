import Decimal from 'decimal.js';
import { Instrument } from '../../database/entities/instrument';
import { Order } from '../../database/entities/order';
import { PortfolioLedger } from './portfolio-ledger';

describe('PortfolioLedger', () => {
  const stock = { id: 1, type: 'ACCIONES' } as Instrument;
  const currency = { id: 2, type: 'MONEDA' } as Instrument;

  it('does not open a position when a sell precedes ownership', () => {
    const ledger = PortfolioLedger.fromOrders(
      [{ instrumentId: 1, side: 'SELL', size: 2, price: 5 } as Order],
      new Map([[1, stock]]),
    );

    expect(ledger.availableCash.eq(10)).toBe(true);
    expect(ledger.activePositions()).toHaveLength(0);
  });

  it('does not track currency instruments as positions', () => {
    const ledger = PortfolioLedger.fromOrders(
      [{ instrumentId: 2, side: 'BUY', size: 10, price: 2 } as Order],
      new Map([[2, currency]]),
    );

    expect(ledger.availableCash.eq(-20)).toBe(true);
    expect(ledger.activePositions()).toHaveLength(0);
  });

  it('ignores unknown order sides', () => {
    const ledger = PortfolioLedger.fromOrders(
      [{ instrumentId: 1, side: 'OTHER', size: 10, price: 2 } as Order],
      new Map([[1, stock]]),
    );

    expect(ledger.availableCash.eq(new Decimal(0))).toBe(true);
    expect(ledger.activePositions()).toHaveLength(0);
  });
});
