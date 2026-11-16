import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from './entities/user';
import { Instrument } from './entities/instrument';
import { Order } from './entities/order';
import { Market } from './entities/market';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        schema: configService.get<string>('database.schema'),
        logging: configService.get<boolean>('database.logging'),
        entities: [User, Instrument, Order, Market],
        synchronize: false,
        migrationsRun: false,
        extra:
          configService.get('env') === 'production'
            ? {
                ssl: {
                  rejectUnauthorized: false,
                },
              }
            : {},
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
