import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const parseFilter = (raw) => {
  // raw like 'eq.value' or plain 'value'
  if (typeof raw !== 'string') return { op: 'eq', value: raw };
  const m = raw.match(/^(\w+)\.(.*)$/);
  if (m) return { op: m[1], value: m[2] };
  return { op: 'eq', value: raw };
};

export default async function handler(req, res) {
  const { table } = req.query;
  if (!table) return res.status(400).json({ error: 'Missing table' });

  try {
    if (req.method === 'GET') {
      const select = req.query.select || '*';
      const params = [];
      let idx = 1;
      const where = [];

      for (const key of Object.keys(req.query)) {
        if (key === 'select' || key === 'table') continue;
        const { op, value } = parseFilter(req.query[key]);
        if (op === 'eq') {
          where.push(`${key} = $${idx++}`);
          params.push(value);
        } else if (op === 'neq') {
          where.push(`${key} != $${idx++}`);
          params.push(value);
        } else if (op === 'lte') {
          where.push(`${key} <= $${idx++}`);
          params.push(value);
        } else if (op === 'gte') {
          where.push(`${key} >= $${idx++}`);
          params.push(value);
        }
      }

      const q = `SELECT ${select} FROM ${table}${where.length ? ' WHERE ' + where.join(' AND ') : ''}`;
      const result = await pool.query(q, params);
      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      const body = req.body;
      const rows = Array.isArray(body) ? body : [body];
      const inserted = [];
      for (const row of rows) {
        const cols = Object.keys(row);
        const vals = Object.values(row);
        const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
        const q = `INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders}) RETURNING *`;
        const r = await pool.query(q, vals);
        inserted.push(r.rows[0]);
      }
      return res.status(200).json(inserted.length === 1 ? inserted[0] : inserted);
    }

    if (req.method === 'PATCH') {
      // Expect a filter in query string like ?id=eq.<value>
      const body = req.body || {};
      const filterKeys = Object.keys(req.query).filter(k => k !== 'table' && k !== 'select');
      if (filterKeys.length === 0) return res.status(400).json({ error: 'Missing filter for update' });

      const setCols = Object.keys(body);
      if (setCols.length === 0) return res.status(400).json({ error: 'Missing body for update' });

      const params = [];
      let idx = 1;
      const setClause = setCols.map((c, i) => `${c} = $${idx++}`).join(', ');
      params.push(...setCols.map(c => body[c]));

      const where = [];
      for (const key of filterKeys) {
        const { op, value } = parseFilter(req.query[key]);
        if (op === 'eq') {
          where.push(`${key} = $${idx++}`);
          params.push(value);
        }
      }

      const q = `UPDATE ${table} SET ${setClause} WHERE ${where.join(' AND ')} RETURNING *`;
      const r = await pool.query(q, params);
      return res.status(200).json(r.rows);
    }

    if (req.method === 'DELETE') {
      const filterKeys = Object.keys(req.query).filter(k => k !== 'table' && k !== 'select');
      if (filterKeys.length === 0) return res.status(400).json({ error: 'Missing filter for delete' });
      const params = [];
      let idx = 1;
      const where = [];
      for (const key of filterKeys) {
        const { op, value } = parseFilter(req.query[key]);
        if (op === 'eq') {
          where.push(`${key} = $${idx++}`);
          params.push(value);
        }
      }
      const q = `DELETE FROM ${table} WHERE ${where.join(' AND ')} RETURNING *`;
      const r = await pool.query(q, params);
      return res.status(200).json(r.rows);
    }

    res.setHeader('Allow', 'GET,POST,PATCH,DELETE');
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: String(error) });
  }
}
