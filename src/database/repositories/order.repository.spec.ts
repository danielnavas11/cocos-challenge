import { Repository } from 'typeorm';
import { Order } from '../entities/order';
import { OrdersRepository } from './order.repository';

describe('OrdersRepository order operations', () => {
  let adapter: OrdersRepository;
  let repository: {
    find: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let queryBuilder: {
    setLock: jest.Mock;
    where: jest.Mock;
    getOne: jest.Mock;
  };

  beforeEach(() => {
    queryBuilder = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    repository = {
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(async (order) => order),
      createQueryBuilder: jest.fn(() => queryBuilder),
    };
    adapter = new OrdersRepository(repository as unknown as Repository<Order>);
  });

  it('reads FILLED and NEW orders for account validation', async () => {
    await adapter.findActiveOrders(12);
    expect(repository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 12 }),
      }),
    );
    const where = repository.find.mock.calls[0][0].where;
    expect(where.status.type).toBe('in');
    expect(where.status.value).toEqual(['FILLED', 'NEW']);
  });

  it('locks order rows before cancellation and can save the update', async () => {
    const order = { id: 8 } as Order;
    queryBuilder.getOne.mockResolvedValue(order);
    await expect(adapter.findByIdForUpdate(8)).resolves.toBe(order);
    expect(queryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(queryBuilder.where).toHaveBeenCalledWith('order.id = :orderId', {
      orderId: 8,
    });
    await expect(adapter.save(order)).resolves.toBe(order);
  });
});
