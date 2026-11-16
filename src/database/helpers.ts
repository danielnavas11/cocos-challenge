import { DecimalTransformer } from './decimal-transformer';
import { ColumnOptions } from 'typeorm';

const decimalTransformer = new DecimalTransformer();
export const columnDecimalDefault = (
  nullable: boolean = true,
): ColumnOptions => {
  return {
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable,
    transformer: decimalTransformer,
  };
};
