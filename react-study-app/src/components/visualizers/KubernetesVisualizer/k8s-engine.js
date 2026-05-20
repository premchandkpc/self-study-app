import schedule from './scenarios/schedule';
import hpa      from './scenarios/hpa';
import rolling  from './scenarios/rolling';
import crash    from './scenarios/crash';
import services from './scenarios/services';
import ingress  from './scenarios/ingress';
import config   from './scenarios/config';
import storage  from './scenarios/storage';

export const SCENARIOS = [schedule, hpa, rolling, crash, services, ingress, config, storage];
