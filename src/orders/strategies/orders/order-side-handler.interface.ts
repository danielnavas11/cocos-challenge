import Decimal from 'decimal.js';
import { Instrument } from '../../../database/entities/instrument';
import { OrderSide } from '../../domain/order.constants';
import { CreateOrderDto } from '../../dto/create-order.dto';
import { AccountBalance } from '../../domain/account-balance';
import { IInstrumentRepository } from '../../../database/repositories';

export interface OrderSideHandler {
  readonly side: OrderSide;
  resolveInstrument(
    input: CreateOrderDto,
    instrumentRepository: IInstrumentRepository,
  ): Promise<Instrument>;
  hasSufficientBalance(
    balance: AccountBalance,
    instrument: Instrument,
    size: number,
    price: Decimal,
  ): boolean;
}
