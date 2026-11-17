import Decimal from 'decimal.js';
import { Instrument } from '../../../database/entities/instrument';
import { OrderStatus, OrderType } from '../../domain/order.constants';
import { CreateOrderDto } from '../../dto/create-order.dto';
import { IMarketRepository } from '../../../database/repositories';

export interface OrderTypeStrategy {
  readonly type: OrderType;
  readonly status: OrderStatus;
  resolvePrice(
    input: CreateOrderDto,
    instrument: Instrument,
    marketRepository: IMarketRepository,
  ): Promise<Decimal>;
}
