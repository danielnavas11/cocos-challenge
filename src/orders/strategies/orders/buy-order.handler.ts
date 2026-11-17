import Decimal from 'decimal.js';
import { Instrument } from '../../../database/entities/instrument';
import { AccountBalance } from '../../domain/account-balance';
import { OrderSide } from '../../domain/order.constants';
import { AssetOrderHandler } from './asset-order-handler';

export class BuyOrderHandler extends AssetOrderHandler {
  readonly side = OrderSide.BUY;

  hasSufficientBalance(
    balance: AccountBalance,
    _instrument: Instrument,
    size: number,
    price: Decimal,
  ): boolean {
    return balance.availableCash().gte(new Decimal(size).mul(price));
  }
}
