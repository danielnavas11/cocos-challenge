import { Repository } from 'typeorm';
import { User } from '../entities/user';
import { UserRepository } from './user.repository';

describe('UserRepository order lock', () => {
  it('locks an existing user row to serialize account order updates', async () => {
    const builder = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id: 4 }),
    };
    const repository = {
      createQueryBuilder: jest.fn(() => builder),
    } as unknown as Repository<User>;
    const adapter = new UserRepository(repository);

    await expect(adapter.lockById(4)).resolves.toBe(true);
    expect(builder.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(builder.where).toHaveBeenCalledWith('user.id = :userId', {
      userId: 4,
    });
  });

  it('returns false when the user row is missing', async () => {
    const repository = {
      createQueryBuilder: jest.fn(() => ({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      })),
    } as unknown as Repository<User>;
    await expect(new UserRepository(repository).lockById(4)).resolves.toBe(
      false,
    );
  });
});
