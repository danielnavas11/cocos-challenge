import { Instrument } from '../entities/instrument';
import { Market } from '../entities/market';
import { Order } from '../entities/order';
export const INSTRUMENT_REPOSITORY = Symbol('INSTRUMENT_REPOSITORY');
export const MARKET_REPOSITORY = Symbol('MARKET_REPOSITORY');
export const ORDERS_REPOSITORY = Symbol('ORDERS_REPOSITORY');
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export interface IInstrumentRepository {
  findByIds(instrumentIds: number[]): Promise<Instrument[]>;
  searchByTickerOrName(query: string): Promise<Instrument[]>;
}
export interface IMarketRepository {
  findLatestByInstrumentIds(
    instrumentIds: number[],
  ): Promise<Map<number, Market>>;
}

export interface IOrdersRepository {
  findFilledOrders(userId: number): Promise<Order[]>;
}
export interface IUserRepository {
  existsById(userId: number): Promise<boolean>;
}
