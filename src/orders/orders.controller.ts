import {
  Body,
  Controller,
  ParseIntPipe,
  Param,
  Post,
  UsePipes,
  ValidationPipe,
  Delete,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  create(@Body() input: CreateOrderDto): Promise<OrderResponseDto> {
    return this.ordersService.create(input);
  }

  @Delete(':id/cancel')
  cancel(
    @Param('id', ParseIntPipe) orderId: number,
  ): Promise<OrderResponseDto> {
    return this.ordersService.cancel(orderId);
  }
}
