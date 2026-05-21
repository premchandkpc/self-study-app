// This module imports TOPIC_DEFS from original location and builds all derived maps
// Temporary wrapper during Phase 1 split. Eventually TOPIC_DEFS will be split into definitions/
import { TOPIC_DEFS } from '../constants/topicDefs.js';
import { derive, slugify } from './topicUtils.js';

// Build all derived maps using TOPIC_DEFS + utilities
const TOPIC_DETAIL = derive(TOPIC_DEFS, 'subtopic');

export const TOPICS = TOPIC_DEFS.map(t => ({
  id: t.id,
  abbr: t.abbr,
  label: t.label,
  icon: t.icon,
  subtopics: t.subtopics.map(s => s.name),
}));

export { TOPIC_DEFS };

export const TOPIC_META = Object.fromEntries(
  TOPIC_DEFS.map(t => [t.id, t.meta])
);

export const VISUALIZER_MAP = derive(TOPIC_DEFS, 'visualizer');

export const VIZ_TYPE_TO_TOPIC = Object.fromEntries(
  TOPIC_DEFS.flatMap(t =>
    t.subtopics
      .filter(s => s.visualizer)
      .map(s => [s.visualizer, t.id])
  )
);

export const SUBTOPIC_ROUTES = derive(TOPIC_DEFS, 'route');
export const SUBTOPIC_SCENARIO_ID = derive(TOPIC_DEFS, 'scenarioId');

export const ABBR_MAP = Object.fromEntries(
  TOPIC_DEFS.map(t => [t.abbr, { id: t.id, abbr: t.abbr, label: t.label, icon: t.icon, meta: t.meta, subtopics: t.subtopics }])
);

export const SLUG_MAP = (() => {
  const map = {};
  for (const t of TOPIC_DEFS) {
    for (const s of (t.subtopics || [])) {
      const slug = s.scenarioId || slugify(s.name);
      map[`${t.abbr}:${slug}`] = { ...s, topicId: t.id, topicAbbr: t.abbr, slug };
    }
  }
  return map;
})();

// Extract CASESTUDIES from original location (imported implicitly)
const getCaseStudies = () => {
  const result = {};
  const systemDesignTopic = TOPIC_DEFS.find(t => t.id === 'systemdesign');
  if (systemDesignTopic) {
    // Build case studies from systemdesign subtopics with tabs
    const casestudy = {};
    for (const subtopic of systemDesignTopic.subtopics || []) {
      if (subtopic.tabs) {
        casestudy[subtopic.name] = {
          overview: subtopic.explanation,
          casestudies: {
            [subtopic.name]: {
              tabs: subtopic.tabs,
              explanation: subtopic.explanation
            }
          }
        };
      }
    }
    if (Object.keys(casestudy).length > 0) {
      result.systemdesign = { overview: systemDesignTopic.meta.desc, casestudies: {} };
      for (const [name, caseStudy] of Object.entries(casestudy)) {
        result.systemdesign.casestudies[name] = caseStudy.casestudies[name];
      }
    }
  }
  return result;
};

const CASESTUDIES = getCaseStudies();

export const TOPIC_EXPLANATIONS = Object.fromEntries(
  TOPIC_DEFS
    .filter(t => TOPIC_DETAIL[`${t.id}:${(t.subtopics || [])[0]?.name}`] ||
                 CASESTUDIES[t.id])
    .map(t => {
      const subtopics = {};
      for (const s of (t.subtopics || [])) {
        const key = `${t.id}:${s.name}`;
        const detail = TOPIC_DETAIL[key];
        if (detail) {
          subtopics[s.name] = {
            explanation: detail.explanation,
            useCases: detail.useCases,
            realWorld: detail.realWorld,
            complexity: detail.complexity,
          };
          if (detail.tabs) {
            subtopics[s.name].tabs = detail.tabs;
          }
        }
      }
      const entry = { overview: t.meta.desc };
      if (Object.keys(subtopics).length > 0) entry.subtopics = subtopics;
      if (CASESTUDIES[t.id]) {
        entry.casestudies = CASESTUDIES[t.id].casestudies;
        entry.overview = CASESTUDIES[t.id].overview;
      }
      return [t.id, entry];
    })
);
