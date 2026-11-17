import Decimal from 'decimal.js';
import { Instrument } from '../../../database/entities/instrument';
import { AccountBalance } from '../../domain/account-balance';
import { OrderSide } from '../../domain/order.constants';
import { CashOrderHandler } from './asset-order-handler';

export class CashOutOrderHandler extends CashOrderHandler {
  readonly side = OrderSide.CASH_OUT;

  hasSufficientBalance(
    balance: AccountBalance,
    _instrument: Instrument,
    size: number,
    price: Decimal,
  ): boolean {
    return balance.availableCash().gte(new Decimal(size).mul(price));
  }
}
