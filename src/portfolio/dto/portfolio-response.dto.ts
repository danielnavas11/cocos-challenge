export class PortfolioPositionDto {
  instrumentId: number;
  ticker: string;
  name: string;
  type: string;
  size: number;
  marketValue: number;
  totalReturn: number | null;
  dailyReturn: number | null;
}

export class PortfolioResponseDto {
  totalAccountValue: number;
  availableCash: number;
  positions: PortfolioPositionDto[];
}
