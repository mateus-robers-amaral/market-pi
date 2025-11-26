/**
 * Cliente Neon DB PostgreSQL
 * Substitui Supabase por conexão direta com Neon
 */

import { Pool } from 'pg';

// Inicializa pool de conexões
const pool = new Pool({
  connectionString: import.meta.env.VITE_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Helper para gerar UUID
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Query builder para Neon
class NeonQueryBuilder {
  private table: string;
  private selectColumns: string = '*';
  private filterColumn?: string;
  private filterValue?: any;
  private filterOperator: string = 'eq';
  private orderColumn?: string;
  private orderAscending: boolean = true;
  private limitValue?: number;

  constructor(table: string) {
    this.table = table;
  }

  select(columns: string = '*', options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) {
    this.selectColumns = columns;
    return this;
  }

  eq(column: string, value: any) {
    this.filterColumn = column;
    this.filterValue = value;
    this.filterOperator = 'eq';
    return this;
  }

  neq(column: string, value: any) {
    this.filterColumn = column;
    this.filterValue = value;
    this.filterOperator = 'neq';
    return this;
  }

  not(column: string, operator: string, value: any) {
    this.filterColumn = column;
    this.filterValue = value;
    this.filterOperator = `not_${operator}`;
    return this;
  }

  lte(column: string, value: any) {
    this.filterColumn = column;
    this.filterValue = value;
    this.filterOperator = 'lte';
    return this;
  }

  gte(column: string, value: any) {
    this.filterColumn = column;
    this.filterValue = value;
    this.filterOperator = 'gte';
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderColumn = column;
    this.orderAscending = options?.ascending ?? true;
    return this;
  }

  limit(count: number) {
    this.limitValue = count;
    return this;
  }

  async single() {
    const result = await this.then((res: any) => res);
    return {
      data: Array.isArray(result.data) ? result.data[0] || null : result.data,
      error: result.error,
      count: result.count,
    };
  }

  async then(resolve: Function, reject?: Function) {
    try {
      let query = `SELECT ${this.selectColumns} FROM ${this.table}`;
      const params: any[] = [];
      let paramIndex = 1;

      // Adicionar filtro WHERE
      if (this.filterColumn) {
        const operator = this.filterOperator === 'eq' ? '=' : 
                        this.filterOperator === 'neq' ? '!=' :
                        this.filterOperator === 'lte' ? '<=' :
                        this.filterOperator === 'gte' ? '>=' : '=';
        query += ` WHERE ${this.filterColumn} ${operator} $${paramIndex}`;
        params.push(this.filterValue);
        paramIndex++;
      }

      // Adicionar ORDER BY
      if (this.orderColumn) {
        query += ` ORDER BY ${this.orderColumn} ${this.orderAscending ? 'ASC' : 'DESC'}`;
      }

      // Adicionar LIMIT
      if (this.limitValue) {
        query += ` LIMIT ${this.limitValue}`;
      }

      const result = await pool.query(query, params);
      resolve({ data: result.rows, error: null, count: result.rows.length });
      return { data: result.rows, error: null, count: result.rows.length };
    } catch (error) {
      const errResult = { data: null, error, count: 0 };
      if (reject) reject(errResult);
      return errResult;
    }
  }
}

// Cliente compatível com Supabase
export const supabase = {
  from: (table: string) => ({
    select: (columns?: string, options?: any) => {
      return new NeonQueryBuilder(table).select(columns, options);
    },

    insert: async (values: any) => {
      try {
        const data = Array.isArray(values) ? values : [values];
        const newRecords = data.map(v => ({
          ...v,
          id: v.id || generateUUID(),
          created_at: v.created_at || new Date().toISOString(),
          updated_at: v.updated_at || new Date().toISOString(),
        }));

        const columns = Object.keys(newRecords[0]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;

        const results = [];
        for (const record of newRecords) {
          const result = await pool.query(query, columns.map(col => record[col]));
          results.push(result.rows[0]);
        }

        return {
          data: results.length === 1 ? results[0] : results,
          error: null,
          then: async (resolve: Function) => resolve({ data: results, error: null, count: results.length }),
          single: async () => ({ data: results[0] || null, error: null, count: 1 }),
          select: () => ({
            single: async () => ({ data: results[0], error: null, count: 1 }),
            then: async (resolve: Function) => resolve({ data: results, error: null, count: results.length }),
          }),
        };
      } catch (error) {
        return { data: null, error, select: () => ({ single: async () => ({ data: null, error, count: 0 }) }) };
      }
    },

    update: (values: any) => ({
      eq: async (column: string, value: any) => {
        try {
          const columns = Object.keys(values);
          const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
          const query = `UPDATE ${table} SET ${setClause}, updated_at = $${columns.length + 2} WHERE ${column} = $${columns.length + 3} RETURNING *`;
          const params = [...Object.values(values), new Date().toISOString(), value];
          
          const result = await pool.query(query, params);
          return {
            data: result.rows,
            error: null,
            select: () => ({
              single: async () => ({ data: result.rows[0], error: null, count: 1 }),
            }),
          };
        } catch (error) {
          return { data: null, error };
        }
      },
    }),

    delete: () => ({
      eq: async (column: string, value: any) => {
        try {
          const query = `DELETE FROM ${table} WHERE ${column} = $1 RETURNING *`;
          const result = await pool.query(query, [value]);
          return {
            data: result.rows,
            error: null,
            select: () => ({
              single: async () => ({ data: result.rows[0] || null, error: null, count: result.rows.length }),
            }),
          };
        } catch (error) {
          return { data: null, error };
        }
      },
    }),
  }),

  auth: {
    signInWithPassword: async (credentials: { email?: string; username?: string; password: string }) => {
      try {
        const column = credentials.email ? 'email' : 'username';
        const query = `SELECT * FROM profiles WHERE ${column} = $1`;
        const result = await pool.query(query, [credentials.email || credentials.username]);
        
        if (result.rows.length === 0) {
          throw new Error('Usuário não encontrado');
        }

        const user = result.rows[0];
        const session = {
          user,
          access_token: generateUUID(),
          expires_at: Date.now() + 24 * 60 * 60 * 1000,
        };

        if (typeof window !== 'undefined') {
          localStorage.setItem('session', JSON.stringify(session));
          localStorage.setItem('user', JSON.stringify(user));
        }

        return { data: { session, user }, error: null };
      } catch (error) {
        return { data: { session: null, user: null }, error };
      }
    },

    signOut: async () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('session');
        localStorage.removeItem('user');
      }
      return { error: null };
    },

    getSession: async () => {
      if (typeof window === 'undefined') {
        return { data: { session: null }, error: null };
      }
      const session = localStorage.getItem('session');
      if (session) {
        return { data: { session: JSON.parse(session) }, error: null };
      }
      return { data: { session: null }, error: null };
    },

    getUser: async () => {
      if (typeof window === 'undefined') {
        return { data: { user: null }, error: null };
      }
      const user = localStorage.getItem('user');
      return { data: { user: user ? JSON.parse(user) : null }, error: null };
    },

    onAuthStateChange: (callback: Function) => {
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
  },

  storage: {
    from: (bucket: string) => {
      return {
        upload: async (path: string, _file: File) => {
          return { data: { path }, error: null };
        },
        update: async (path: string, _file: File) => {
          return { data: { path }, error: null };
        },
        remove: async (_paths: string[]) => {
          return { data: null, error: null };
        },
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `${import.meta.env.VITE_STORAGE_URL || ''}/${bucket}/${path}` },
          error: null,
        }),
      };
    },
  },

  rpc: async (fnName: string, params: any) => {
    try {
      if (fnName === 'log_audit_event') {
        const logEntry = {
          id: generateUUID(),
          user_id: params.p_user_id,
          action: params.p_action,
          table_name: params.p_table_name,
          record_id: params.p_record_id,
          changes: params.p_changes,
          created_at: new Date().toISOString(),
        };

        const columns = Object.keys(logEntry);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const query = `INSERT INTO audit_logs (${columns.join(', ')}) VALUES (${placeholders})`;
        
        await pool.query(query, Object.values(logEntry));
        return { data: logEntry.id, error: null };
      }

      return { data: null, error: new Error('RPC function not implemented') };
    } catch (error) {
      return { data: null, error };
    }
  },
};

// Export para compatibilidade
export default supabase;
