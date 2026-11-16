import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { columnDecimalDefault } from '../helpers';

@Entity({ name: 'marketdata' })
export class Market {
  @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
  id: number;

  @Column({ name: 'instrumentid', type: 'int', nullable: true })
  instrumentId?: number;

  @Column({ name: 'high', ...columnDecimalDefault })
  high?: number;

  @Column({ name: 'low', ...columnDecimalDefault })
  low?: number;

  @Column({ name: 'open', ...columnDecimalDefault })
  open?: number;

  @Column({ name: 'close', ...columnDecimalDefault })
  close?: number;

  @Column({ name: 'previousclose', ...columnDecimalDefault })
  previousClose?: number;

  @Column({ name: 'date', type: 'date', nullable: true })
  date?: string;
}
