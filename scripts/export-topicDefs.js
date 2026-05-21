import { TOPIC_DEFS } from '../packages/web/src/core/constants/topicDefs.js';
import fs from 'fs';

fs.writeFileSync(
  'packages/api/data/topicDefs.json',
  JSON.stringify(TOPIC_DEFS, null, 2)
);

console.log('✓ Exported topicDefs.js to packages/api/data/topicDefs.json');
