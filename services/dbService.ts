import Dexie, { type Table } from 'dexie';
import type { ServeHistoryItem } from '../types';

export class TennisServeDB extends Dexie {
  serves!: Table<ServeHistoryItem>; 

  constructor() {
    super('tennisServeDatabase');
    this.version(1).stores({
      serves: '++id, date' // Primary key and indexed props
    });
  }
}

export const db = new TennisServeDB();