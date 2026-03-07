const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', 'data', 'community_posts.csv');
const SQL_OUTPUT_PATH = path.join(__dirname, '..', 'supabase', 'seed_community.sql');

function escapeSql(str) {
  if (!str) return '';
  return str.replace(/'/g, "''");
}

function parseCsvRow(row) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

async function main() {
  console.log('Reading CSV file...');
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = csvContent.trim().split('\n');
  const header = lines[0];
  const dataLines = lines.slice(1);

  console.log(`Found ${dataLines.length} posts to seed`);

  const sqlStatements = [];

  dataLines.forEach((line, index) => {
    const values = parseCsvRow(line);
    const content = escapeSql(values[0] || '');
    const imageUrl1 = values[1] || '';
    const imageUrl2 = values[2] || '';

    const imageUrls = [];
    if (imageUrl1) imageUrls.push(imageUrl1);
    if (imageUrl2) imageUrls.push(imageUrl2);

    const imageUrlsArray = imageUrls.length > 0
      ? `ARRAY[${imageUrls.map(u => `'${escapeSql(u)}'`).join(', ')}]`
      : "'{}'";

    // Use a placeholder user_id - you'll need to replace this with a real user ID
    const sql = `-- Post ${index + 1}
INSERT INTO public.community_posts (user_id, content, image_urls)
SELECT id, '${content}', ${imageUrlsArray}
FROM auth.users
LIMIT 1;
`;
    sqlStatements.push(sql);
  });

  const finalSql = `-- Community Posts Seed Data
-- Generated from data/community_posts.csv
-- Run this after you have at least one user in auth.users

${sqlStatements.join('\n')}
`;

  fs.writeFileSync(SQL_OUTPUT_PATH, finalSql);
  console.log(`SQL file written to: ${SQL_OUTPUT_PATH}`);
  console.log('\nTo seed data, run this SQL in Supabase SQL Editor after migration.');
}

main().catch(console.error);
