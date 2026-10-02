#!/usr/bin/env -S node
import 'temporal-polyfill/full/global';
import type { Contract as Start } from '../../snapshots/5e176360572bad9d23b30c4b48e840aa6d0f7dfcdead4bf17af4ff8ccc9df0b5/contract';
import startContract from '../../snapshots/5e176360572bad9d23b30c4b48e840aa6d0f7dfcdead4bf17af4ff8ccc9df0b5/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/c0ebe0460e36c79aa2217193f60ce7c9a95143c1790b139d2ffcd7211a6ebd41/contract';
import endContract from '../../snapshots/c0ebe0460e36c79aa2217193f60ce7c9a95143c1790b139d2ffcd7211a6ebd41/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  primaryKey,
} from '@prisma/orm-postgres/migration';
import postgres from '@prisma/orm-postgres/runtime';

const { sql: db, contract } = postgres<End>({ contractJson: endContract });

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'User',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('password', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Ticket',
        column: col('userId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dataTransform(contract, 'backfill-Ticket-userId', {
        // Ticket table is empty (0 rows), so check finds no work and run never fires.
        check: () => db.public.Ticket.select('id').where((f, fns) => fns.eq(f.userId, null)).limit(1),
        run: () =>
          db.public.Ticket.update({ userId: '' }).where((f, fns) => fns.eq(f.userId, null)),
      }),
      this.setNotNull({ schema: 'public', table: 'Ticket', column: 'userId' }),
      this.addUnique({
        schema: 'public',
        table: 'User',
        constraint: 'User_email_key',
        columns: ['email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Ticket',
        index: 'Ticket_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Ticket',
        foreignKey: {
          name: 'Ticket_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
