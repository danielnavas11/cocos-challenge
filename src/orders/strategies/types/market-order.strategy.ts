import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { Instrument } from '../../../database/entities/instrument';
import { OrderStatus, OrderType } from '../../domain/order.constants';
import { CreateOrderDto } from '../../dto/create-order.dto';
import { OrderTypeStrategy } from './order-type-strategy.interface';
import { IMarketRepository } from '../../../database/repositories';
import { CURRENCY_INSTRUMENT_TYPE } from '../../../constants';

@Injectable()
export class MarketOrderStrategy implements OrderTypeStrategy {
  readonly type = OrderType.MARKET;
  readonly status = OrderStatus.FILLED;

  async resolvePrice(
    _: CreateOrderDto,
    instrument: Instrument,
    marketRepository: IMarketRepository,
  ): Promise<Decimal> {
    if (instrument.type === CURRENCY_INSTRUMENT_TYPE) {
      return new Decimal(1);
    }

    const latestMarkets = await marketRepository.findLatestByInstrumentIds([
      instrument.id,
    ]);
    const close = latestMarkets.get(instrument.id)?.close;
    if (
      close === undefined ||
      close === null ||
      !Number.isFinite(close) ||
      close <= 0
    ) {
      throw new UnprocessableEntityException(
        'No hay un precio de mercado válido para el instrumento',
      );
    }
    return new Decimal(close);
  }
}
