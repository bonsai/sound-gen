import { readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve('.env.qiita');
const env = readFileSync(envPath, 'utf8');
const token = env.split('\n').find(l => l.startsWith('QIITA_API_TOKEN=')).split('=')[1].trim();
const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'User-Agent': 'note-automation' };

const ids = [
  '65f1b7c64669a9b4c7d8',
  'e42e0df05f4c9818f1c6',
  'c830dea441e33711d7ce',
  '10c63494afe9cb6da5d2',
  'e2f8a988dc70ae6c54d1',
  '0882c33a0432144e408d',
];

async function publish(id) {
  const g = await fetch(`https://qiita.com/api/v2/items/${id}`, { headers });
  const a = await g.json();
  const res = await fetch(`https://qiita.com/api/v2/items/${id}`, {
    method: 'PATCH', headers,
    body: JSON.stringify({ body: a.body, tags: a.tags, title: a.title, private: false, tweet: false })
  });
  if (res.ok) console.log(`OK ${id} => ${a.title}`);
  else console.log(`FAIL ${id}: ${res.status} - waiting longer`);
}

async function main() {
  for (const id of ids) {
    await new Promise(r => setTimeout(r, 10000));
    await publish(id);
  }
  console.log('\n完了');
}
main();
