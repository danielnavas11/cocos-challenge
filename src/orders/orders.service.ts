import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Order } from '../database/entities/order';
import { OrderStatus } from './domain/order.constants';
import { AccountBalance } from './domain/account-balance';
import { OrderSize } from './domain/order-size';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrdersMapper } from './orders.mapper';
import {
  ORDER_SIDE_HANDLERS,
  ORDER_TYPE_STRATEGIES,
  OrderSideHandlerRegistry,
  OrderTypeStrategyRegistry,
} from './strategies/order-strategy.tokens';
import { UnitOfWorkService } from '../database/unit-of-work.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly unitOfWork: UnitOfWorkService,
    @Inject(ORDER_SIDE_HANDLERS)
    private readonly sideHandlers: OrderSideHandlerRegistry,
    @Inject(ORDER_TYPE_STRATEGIES)
    private readonly typeStrategies: OrderTypeStrategyRegistry,
    private readonly ordersMapper: OrdersMapper,
  ) {}

  create(input: CreateOrderDto): Promise<OrderResponseDto> {
    return this.unitOfWork.doTransactional(async (tx) => {
      if (!(await tx.users.lockById(input.userId))) {
        throw new NotFoundException('No se encontró el usuario');
      }

      const sideHandler = this.sideHandlers.get(input.side);
      const typeStrategy = this.typeStrategies.get(input.type);
      if (!sideHandler || !typeStrategy) {
        throw new BadRequestException(
          'El type o side de la orden no es válido',
        );
      }

      const instrument = await sideHandler.resolveInstrument(
        input,
        tx.instruments,
      );
      const price = await typeStrategy.resolvePrice(
        input,
        instrument,
        tx.markets,
      );
      const size = OrderSize.resolve(input, price);
      const activeOrders = await tx.orders.findActiveOrders(input.userId);
      const balance = AccountBalance.fromOrders(activeOrders);
      const isValidSize = size >= 1;
      const isAffordable =
        isValidSize &&
        sideHandler.hasSufficientBalance(balance, instrument, size, price);

      const order = new Order();
      order.userId = input.userId;
      order.instrumentId = instrument.id;
      order.size = size;
      order.price = price.toDecimalPlaces(2).toNumber();
      order.type = input.type;
      order.side = input.side;
      order.status = isAffordable ? typeStrategy.status : OrderStatus.REJECTED;
      order.datetime = new Date();

      return this.ordersMapper.toResponse(await tx.orders.save(order));
    });
  }

  cancel(orderId: number): Promise<OrderResponseDto> {
    return this.unitOfWork.doTransactional(async (tx) => {
      const order = await tx.orders.findByIdForUpdate(orderId);
      if (!order) {
        throw new NotFoundException('No se encontró la orden');
      }
      if (order.status !== OrderStatus.NEW) {
        throw new ConflictException(
          `Solo se pueden cancelar órdenes NEW; la orden está ${order.status}`,
        );
      }
      if (order.userId !== undefined && order.userId !== null) {
        await tx.users.lockById(order.userId);
      }

      order.status = OrderStatus.CANCELLED;
      return this.ordersMapper.toResponse(await tx.orders.save(order));
    });
  }
}
