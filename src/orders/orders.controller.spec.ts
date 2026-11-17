import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderSide, OrderStatus, OrderType } from './domain/order.constants';

describe('OrdersController', () => {
  let controller: OrdersController;
  let ordersService: { create: jest.Mock; cancel: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: {
            create: jest.fn().mockResolvedValue({ status: OrderStatus.FILLED }),
            cancel: jest
              .fn()
              .mockResolvedValue({ status: OrderStatus.CANCELLED }),
          },
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    ordersService = module.get(OrdersService);
  });

  it('delegates order creation to the service', async () => {
    const input = {
      userId: 1,
      instrumentId: 2,
      side: OrderSide.BUY,
      type: OrderType.MARKET,
      size: 1,
    };
    await expect(controller.create(input)).resolves.toEqual({
      status: OrderStatus.FILLED,
    });
    expect(ordersService.create).toHaveBeenCalledWith(input);
  });

  it('delegates order cancellation to the service', async () => {
    await expect(controller.cancel(4)).resolves.toEqual({
      status: OrderStatus.CANCELLED,
    });
    expect(ordersService.cancel).toHaveBeenCalledWith(4);
  });
});
