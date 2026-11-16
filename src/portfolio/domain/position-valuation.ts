import Decimal from 'decimal.js';
import { Market } from '../../database/entities/market';
import { PositionBalance } from './position-balance';

export interface PositionValuation {
  marketValue: Decimal;
  totalReturn: Decimal | null;
  dailyReturn: Decimal | null;
}

export function valuePosition(
  balance: PositionBalance,
  market?: Market,
): PositionValuation {
  const close = market?.close == null ? null : new Decimal(market.close);
  const marketValue = close ? balance.quantity.mul(close) : new Decimal(0);
  const totalReturn =
    close && balance.costBasis.gt(0)
      ? marketValue.minus(balance.costBasis).div(balance.costBasis).mul(100)
      : null;
  const previousClose =
    market?.previousClose == null ? null : new Decimal(market.previousClose);
  const dailyReturn =
    close && previousClose?.gt(0)
      ? close.minus(previousClose).div(previousClose).mul(100)
      : null;

  return { marketValue, totalReturn, dailyReturn };
}
