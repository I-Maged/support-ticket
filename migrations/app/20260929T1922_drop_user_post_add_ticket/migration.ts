#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/5e176360572bad9d23b30c4b48e840aa6d0f7dfcdead4bf17af4ff8ccc9df0b5/contract';
import endContract from '../../snapshots/5e176360572bad9d23b30c4b48e840aa6d0f7dfcdead4bf17af4ff8ccc9df0b5/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/91e7f9f035806fa2789a4d726ef7724cad434fd6b00014d47ebf12d6e6bb784e/contract';
import startContract from '../../snapshots/91e7f9f035806fa2789a4d726ef7724cad434fd6b00014d47ebf12d6e6bb784e/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropTable({ schema: 'public', table: 'Post' }),
      this.dropTable({ schema: 'public', table: 'User' }),
      this.createTable({
        schema: 'public',
        table: 'Ticket',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('priority', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('Open'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('subject', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
