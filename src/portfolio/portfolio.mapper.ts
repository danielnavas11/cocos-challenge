import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { PositionBalance } from './domain/position-balance';
import { PositionValuation } from './domain/position-valuation';
import {
  PortfolioPositionDto,
  PortfolioResponseDto,
} from './dto/portfolio-response.dto';

@Injectable()
export class PortfolioMapper {
  toPositionDto(
    balance: PositionBalance,
    valuation: PositionValuation,
  ): PortfolioPositionDto {
    return {
      instrumentId: balance.instrument.id,
      ticker: balance.instrument.ticker,
      name: balance.instrument.name,
      type: balance.instrument.type,
      size: balance.quantity.toNumber(),
      marketValue: this.roundToTwo(valuation.marketValue),
      totalReturn:
        valuation.totalReturn && this.roundToTwo(valuation.totalReturn),
      dailyReturn:
        valuation.dailyReturn && this.roundToTwo(valuation.dailyReturn),
    } satisfies PortfolioPositionDto;
  }

  toResponse(
    availableCash: Decimal,
    totalMarketValue: Decimal,
    positions: PortfolioPositionDto[],
  ): PortfolioResponseDto {
    return {
      totalAccountValue: this.roundToTwo(availableCash.plus(totalMarketValue)),
      availableCash: this.roundToTwo(availableCash),
      positions,
    };
  }

  private roundToTwo(value: Decimal): number {
    return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  }
}
