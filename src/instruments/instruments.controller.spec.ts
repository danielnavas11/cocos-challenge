import { Test, TestingModule } from '@nestjs/testing';
import { InstrumentsController } from './instruments.controller';
import { InstrumentsService } from './instruments.service';

describe('InstrumentsController', () => {
  let controller: InstrumentsController;
  let instrumentsService: { search: jest.Mock };

  beforeEach(async () => {
    instrumentsService = { search: jest.fn().mockResolvedValue([]) };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstrumentsController],
      providers: [
        { provide: InstrumentsService, useValue: instrumentsService },
      ],
    }).compile();

    controller = module.get<InstrumentsController>(InstrumentsController);
  });

  it('delegates instrument searches to the service', async () => {
    await expect(controller.search('ACME')).resolves.toEqual([]);
    expect(instrumentsService.search).toHaveBeenCalledWith('ACME');
  });
});
