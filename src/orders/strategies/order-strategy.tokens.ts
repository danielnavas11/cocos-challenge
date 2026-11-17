import { OrderSide, OrderType } from '../domain/order.constants';
import { OrderSideHandler } from './orders/order-side-handler.interface';
import { OrderTypeStrategy } from './types/order-type-strategy.interface';

export const ORDER_TYPE_STRATEGIES = Symbol('ORDER_TYPE_STRATEGIES');
export const ORDER_SIDE_HANDLERS = Symbol('ORDER_SIDE_HANDLERS');

export type OrderTypeStrategyRegistry = Map<OrderType, OrderTypeStrategy>;
export type OrderSideHandlerRegistry = Map<OrderSide, OrderSideHandler>;
