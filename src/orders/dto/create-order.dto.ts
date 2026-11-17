import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  Max,
  Min,
  Validate,
  ValidateIf,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { OrderSide, OrderType } from '../domain/order.constants';

@ValidatorConstraint({ name: 'sizeOrAmount', async: false })
export class SizeOrAmountConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const order = args.object as CreateOrderDto;
    return (order.size !== undefined) !== (order.amount !== undefined);
  }

  defaultMessage(): string {
    return 'Debe indicar exactamente uno de size o amount';
  }
}

export class CreateOrderDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId: number;

  @ValidateIf((order: CreateOrderDto) =>
    [OrderSide.BUY, OrderSide.SELL].includes(order.side),
  )
  @Type(() => Number)
  @IsInt()
  @Min(1)
  instrumentId?: number;

  @IsEnum(OrderSide)
  @Validate(SizeOrAmountConstraint)
  side: OrderSide;

  @IsEnum(OrderType)
  type: OrderType;

  @ValidateIf((order: CreateOrderDto) => order.size !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  size?: number;

  @ValidateIf((order: CreateOrderDto) => order.amount !== undefined)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @ValidateIf((order: CreateOrderDto) => order.type === OrderType.LIMIT)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99_999_999.99)
  price?: number;
}
