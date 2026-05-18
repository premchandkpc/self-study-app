import schedule     from './scenarios/schedule';
import hpa          from './scenarios/hpa';
import rolling      from './scenarios/rolling';
import crash        from './scenarios/crash';
import services     from './scenarios/services';

export const SCENARIOS = [schedule, hpa, rolling, crash, services];
