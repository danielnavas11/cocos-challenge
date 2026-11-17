import Decimal from 'decimal.js';
import { Instrument } from '../../../database/entities/instrument';
import { AccountBalance } from '../../domain/account-balance';
import { OrderSide } from '../../domain/order.constants';
import { AssetOrderHandler } from './asset-order-handler';

export class SellOrderHandler extends AssetOrderHandler {
  readonly side = OrderSide.SELL;

  /* eslint-disable @typescript-eslint/no-unused-vars */
  hasSufficientBalance(
    balance: AccountBalance,
    instrument: Instrument,
    size: number,
    price: Decimal,
  ): boolean {
    return balance.availableShares(instrument.id).gte(size);
  }
}
