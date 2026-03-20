import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';
import { Expense, Category } from './data.service';

const DB_NAME = 'expensetracker_db';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private sqlite: SQLiteConnection;
  private db!: SQLiteDBConnection;
  public isReady = false;

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  async initializePlugin(): Promise<void> {
    try {
      if (Capacitor.getPlatform() === 'web') {
        const jeepEl = document.createElement('jeep-sqlite');
        document.body.appendChild(jeepEl);
        await customElements.whenDefined('jeep-sqlite');
        await this.sqlite.initWebStore();
      }
      
      this.db = await this.sqlite.createConnection(
        DB_NAME, false, 'no-encryption', 1, false
      );
      
      await this.db.open();
      
      await this.createSchema();
      await this.seedDatabase();

      this.isReady = true;
    } catch (error) {
      console.error('SQLite initialization failed', error);
      throw error;
    }
  }

  private async createSchema() {
    const schema = `
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        subcategory TEXT,
        description TEXT NOT NULL,
        date TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS categories (
        name TEXT PRIMARY KEY NOT NULL
      );
      CREATE TABLE IF NOT EXISTS subcategories (
        parent_category TEXT NOT NULL,
        name TEXT NOT NULL,
        PRIMARY KEY (parent_category, name),
        FOREIGN KEY (parent_category) REFERENCES categories (name) ON DELETE CASCADE
      );
    `;
    await this.db.execute(schema);
  }

  private async seedDatabase() {
    // Check if expenses exist
    const res = await this.db.query('SELECT COUNT(*) AS count FROM expenses;');
    if (res.values && res.values.length > 0 && res.values[0].count === 0) {
      console.log('Database empty. Seeding...');
      try {
        const fetchRes = await fetch('assets/data/expenses.json');
        if (fetchRes.ok) {
          const data: Expense[] = await fetchRes.json();
          for (const expense of data) {
            await this.db.run(
              'INSERT INTO expenses (id, amount, category, subcategory, description, date) VALUES (?, ?, ?, ?, ?, ?)',
              [expense.id, expense.amount, expense.category, expense.subcategory || null, expense.description, expense.date]
            );
          }
        }
      } catch (e) {
        console.error('Error seeding expenses', e);
      }

      // Seed default categories
      const defaultCategories: Category[] = [
        { name: 'Food', subcategories: ['Groceries', 'Restaurants', 'Fast Food'] },
        { name: 'Transport', subcategories: ['Public Transit', 'Taxi', 'Gas'] },
        { name: 'Utilities', subcategories: ['Electricity', 'Water', 'Internet'] },
        { name: 'Entertainment', subcategories: ['Movies', 'Games', 'Subscriptions'] },
        { name: 'Shopping', subcategories: ['Clothes', 'Electronics'] },
        { name: 'Other', subcategories: [] }
      ];

      for (const cat of defaultCategories) {
        await this.db.run('INSERT OR IGNORE INTO categories (name) VALUES (?)', [cat.name]);
        for (const sub of cat.subcategories) {
          await this.db.run('INSERT OR IGNORE INTO subcategories (parent_category, name) VALUES (?, ?)', [cat.name, sub]);
        }
      }
      
      if (Capacitor.getPlatform() === 'web') {
        await this.sqlite.saveToStore(DB_NAME);
      }
    }
  }
  
  // Expose the DB connection so DataService can use it, or implement CRUD here.
  // Implementing getter for DB to keep things simpler to migrate DataService logic.
  getDb(): SQLiteDBConnection {
    return this.db;
  }
  
  async saveStore() {
    if (Capacitor.getPlatform() === 'web') {
      await this.sqlite.saveToStore(DB_NAME);
    }
  }
}
