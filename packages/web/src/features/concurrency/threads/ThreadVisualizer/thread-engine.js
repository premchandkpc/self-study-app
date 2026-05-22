import mutex     from './scenarios/mutex';
import deadlock  from './scenarios/deadlock';
import semaphore from './scenarios/semaphore';

export const SCENARIOS = [mutex, deadlock, semaphore];
