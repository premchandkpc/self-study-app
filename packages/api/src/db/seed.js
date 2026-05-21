import 'dotenv/config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const topicDefsPath = path.join(__dirname, '../../data/topicDefs.json');

export async function seedIfEmpty() {
  try {
    const { rows: [{ count }] } = await pool.query('SELECT COUNT(*)::int FROM topics');
    if (count === 0) {
      console.log('Database is empty. Running seed...');
      await runSeed();
    } else {
      console.log(`Database already has ${count} topics. Skipping seed.`);
    }
  } catch (err) {
    console.error('Error checking database:', err);
    throw err;
  }
}

async function runSeed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Read topicDefs.json
    const topicDefsJson = fs.readFileSync(topicDefsPath, 'utf-8');
    const TOPIC_DEFS = JSON.parse(topicDefsJson);

    let topicCount = 0;
    let subtopicCount = 0;
    let tabCount = 0;

    for (let i = 0; i < TOPIC_DEFS.length; i++) {
      const t = TOPIC_DEFS[i];

      // Insert topic
      await client.query(
        `INSERT INTO topics (id, abbr, label, icon, sort_order, color, description, objectives, key_topics)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [
          t.id,
          t.abbr,
          t.label,
          t.icon,
          i,
          t.meta?.color || 'blue',
          t.meta?.desc || '',
          JSON.stringify(t.meta?.objectives || []),
          JSON.stringify(t.meta?.keyTopics || []),
        ]
      );
      topicCount++;

      // Insert subtopics
      for (let j = 0; j < (t.subtopics || []).length; j++) {
        const s = t.subtopics[j];
        const slug =
          s.scenarioId ||
          s.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

        const { rows: [subRow] } = await client.query(
          `INSERT INTO subtopics (
             topic_id, name, slug, scenario_id, visualizer, sort_order,
             explanation, use_cases, real_world, complexity
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id`,
          [
            t.id,
            s.name,
            slug,
            s.scenarioId || null,
            s.visualizer || '',
            j,
            s.explanation || '',
            JSON.stringify(s.useCases || []),
            s.realWorld || '',
            JSON.stringify(s.complexity || {}),
          ]
        );
        subtopicCount++;

        // Insert tabs
        if (s.tabs) {
          for (let k = 0; k < s.tabs.length; k++) {
            const tb = s.tabs[k];
            await client.query(
              `INSERT INTO tabs (
                 subtopic_id, name, sort_order, explanation,
                 use_cases, real_world, complexity
               ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                subRow.id,
                tb.name,
                k,
                tb.explanation || '',
                JSON.stringify(tb.useCases || []),
                tb.realWorld || '',
                JSON.stringify(tb.complexity || {}),
              ]
            );
            tabCount++;
          }
        }
      }
    }

    await client.query('COMMIT');
    console.log(`✓ Seed complete: ${topicCount} topics, ${subtopicCount} subtopics, ${tabCount} tabs`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedIfEmpty().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
