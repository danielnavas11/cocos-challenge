import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';

describe('PortfolioController', () => {
  let controller: PortfolioController;
  let portfolioService: { getPortfolio: jest.Mock };

  beforeEach(async () => {
    portfolioService = { getPortfolio: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortfolioController],
      providers: [{ provide: PortfolioService, useValue: portfolioService }],
    }).compile();

    controller = module.get<PortfolioController>(PortfolioController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates the requested user portfolio to the service', async () => {
    const response = {
      totalAccountValue: 125,
      availableCash: 25,
      positions: [],
    };
    portfolioService.getPortfolio.mockResolvedValue(response);

    await expect(controller.getPortfolio(42)).resolves.toBe(response);
    expect(portfolioService.getPortfolio).toHaveBeenCalledWith(42);
  });
});
