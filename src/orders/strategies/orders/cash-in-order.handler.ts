import { OrderSide } from '../../domain/order.constants';
import { CashOrderHandler } from './asset-order-handler';

export class CashInOrderHandler extends CashOrderHandler {
  readonly side = OrderSide.CASH_IN;
}
