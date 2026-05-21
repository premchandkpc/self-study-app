import { Router } from 'express';
import { buildAllMaps } from '../db/queries/maps.js';

const router = Router();

let cachedMaps = null;
let cacheTime = null;
const CACHE_TTL = 3600000; // 1 hour

router.get('/', async (req, res, next) => {
  try {
    // Check cache
    if (cachedMaps && cacheTime && Date.now() - cacheTime < CACHE_TTL) {
      res.set('Cache-Control', 'public, max-age=3600');
      return res.json(cachedMaps);
    }

    // Build fresh maps
    const maps = await buildAllMaps();
    cachedMaps = maps;
    cacheTime = Date.now();

    res.set('Cache-Control', 'public, max-age=3600');
    res.json(maps);
  } catch (err) {
    next(err);
  }
});

export default router;
