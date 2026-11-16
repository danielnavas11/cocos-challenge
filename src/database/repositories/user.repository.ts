import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user';
import { Repository } from 'typeorm';
import { IUserRepository } from './index';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async existsById(userId: number): Promise<boolean> {
    return Boolean(await this.userRepository.findOneBy({ id: userId }));
  }
}
