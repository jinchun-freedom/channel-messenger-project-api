/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-readonly */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import type { MinimongoCollectionFindOptions } from 'minimongo';
import { MemoryDb } from 'minimongo';

import type { Order } from '../definition/order';

export default class MongoDataBase {
  private static instance: MongoDataBase;
  private db: MemoryDb;
  private tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
    this.db = new MemoryDb();
    this.db.addCollection(tableName);
  }

  static getInstance(table: string) {
    if (!MongoDataBase.instance) {
      MongoDataBase.instance = new MongoDataBase(table);
    }
    return MongoDataBase.instance;
  }

  upsert(data: any) {
    return this.db.collections[this.tableName]?.upsert(data);
  }

  find(selector?: any, order?: Order): any {
    const options: MinimongoCollectionFindOptions = {};
    if (order) {
      const sort: any = {};
      sort[order.field] = order.order;
      options.sort = sort;
    }
    return this.db.collections[this.tableName]?.find(selector, options).fetch();
  }

  findById(id: string | undefined): any {
    return this.find({ id });
  }
}
