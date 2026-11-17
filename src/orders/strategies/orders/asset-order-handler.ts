import { NotFoundException, BadRequestException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { Instrument } from '../../../database/entities/instrument';
import { OrderSide, OrderType } from '../../domain/order.constants';
import { AccountBalance } from '../../domain/account-balance';
import { CreateOrderDto } from '../../dto/create-order.dto';
import { OrderSideHandler } from './order-side-handler.interface';
import { IInstrumentRepository } from '../../../database/repositories';
import { CURRENCY_INSTRUMENT_TYPE } from '../../../constants';

export abstract class AssetOrderHandler implements OrderSideHandler {
  abstract readonly side: OrderSide;

  async resolveInstrument(
    input: CreateOrderDto,
    instrumentRepository: IInstrumentRepository,
  ): Promise<Instrument> {
    const instrument = await instrumentRepository.findById(input.instrumentId);
    if (!instrument) {
      throw new NotFoundException('No se encontró el instrumento');
    }
    if (instrument.type === CURRENCY_INSTRUMENT_TYPE) {
      throw new BadRequestException(
        'Las transferencias deben realizarse mediante CASH_IN o CASH_OUT',
      );
    }
    return instrument;
  }

  abstract hasSufficientBalance(
    balance: AccountBalance,
    instrument: Instrument,
    size: number,
    price: Decimal,
  ): boolean;
}

export abstract class CashOrderHandler implements OrderSideHandler {
  abstract readonly side: OrderSide;

  async resolveInstrument(
    input: CreateOrderDto,
    instrumentRepository: IInstrumentRepository,
  ): Promise<Instrument> {
    if (input.type !== OrderType.MARKET) {
      throw new BadRequestException(
        'Las transferencias de efectivo deben ser MARKET',
      );
    }
    const currency = await instrumentRepository.findCurrency();
    if (!currency) {
      throw new NotFoundException('No se encontró el instrumento ARS');
    }
    return currency;
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  hasSufficientBalance(
    balance: AccountBalance,
    instrument: Instrument,
    size: number,
    price: Decimal,
  ): boolean {
    return true;
  }
}
