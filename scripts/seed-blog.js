/**
 * CSV faylni o'qiydi va Supabase blog_posts jadvaliga import qiladi.
 * Ishga tushirish: SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/seed-blog.js
 * (SUPABASE_URL ixtiyoriy, default loyihadagi)
 *
 * Yoki: node scripts/seed-blog.js --sql
 * Bu holda SQL fayl chiqadi, Supabase Dashboard → SQL Editor da ishga tushirasiz.
 */

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', 'data', 'blog_posts.csv');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lkkneoqzxgtqihpjrmbp.supabase.co';
const emitSqlOnly = process.argv.includes('--sql');

function parseCsvRow(line) {
  const out = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let s = '';
      i++;
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            s += '"';
            i += 2;
          } else {
            i++;
            break;
          }
        } else {
          s += line[i];
          i++;
        }
      }
      out.push(s);
      if (line[i] === ',') i++;
    } else {
      let s = '';
      while (i < line.length && line[i] !== ',') {
        s += line[i];
        i++;
      }
      out.push(s.trim());
      if (line[i] === ',') i++;
    }
  }
  return out;
}

function escapeSql(str) {
  if (str == null || str === '') return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

function run() {
  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    console.error('CSV da header va kamida 1 qator bo\'lishi kerak.');
    process.exit(1);
  }
  const header = parseCsvRow(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvRow(lines[i]);
    if (values.length < header.length) continue;
    const row = {};
    header.forEach((h, j) => (row[h] = values[j]));
    rows.push(row);
  }

  if (emitSqlOnly) {
    const sqlLines = [
      '-- Blog posts seed (CSV dan generatsiya qilindi)',
      '-- Supabase Dashboard → SQL Editor da ishga tushiring.',
      'INSERT INTO public.blog_posts (title, thumbnail_url, read_time_minutes, excerpt, url, sort_order, category_id, content) VALUES',
    ];
    const valueRows = rows.map((r) => {
      const readTime = parseInt(r.read_time_minutes, 10) || 0;
      const sortOrder = parseInt(r.sort_order, 10) || 0;
      const categoryId = r.category_id != null && r.category_id !== '' ? parseInt(r.category_id, 10) : 'NULL';
      return `  (${escapeSql(r.title)}, ${escapeSql(r.thumbnail_url || null)}, ${readTime}, ${escapeSql(r.excerpt || null)}, ${escapeSql(r.url || null)}, ${sortOrder}, ${categoryId}, ${escapeSql(r.content || null)})`;
    });
    sqlLines.push(valueRows.join(',\n') + ';\n');
    const outPath = path.join(__dirname, '..', 'supabase', 'seed_blog_posts.sql');
    fs.writeFileSync(outPath, sqlLines.join('\n'), 'utf8');
    console.log('SQL yozildi:', outPath);
    return;
  }

  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY berilmagan. .env dan o\'qing yoki --sql bilan SQL fayl chiqaring.');
    process.exit(1);
  }

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, supabaseKey);

  (async () => {
    for (const r of rows) {
      const categoryId = r.category_id != null && r.category_id !== '' ? parseInt(r.category_id, 10) : null;
      const { error } = await supabase.from('blog_posts').insert({
        title: r.title,
        thumbnail_url: r.thumbnail_url || null,
        read_time_minutes: parseInt(r.read_time_minutes, 10) || 0,
        excerpt: r.excerpt || null,
        url: r.url || null,
        sort_order: parseInt(r.sort_order, 10) || 0,
        category_id: categoryId,
        content: r.content || null,
      });
      if (error) {
        console.error('Insert xato:', error.message);
        process.exit(1);
      }
      console.log('Qo\'shildi:', r.title?.slice(0, 40) + '...');
    }
    console.log('Jami', rows.length, 'ta post import qilindi.');
  })();
}

run();
