import mutex from './scenarios/mutex';
import semaphore from './scenarios/semaphore';
import producerConsumer from './scenarios/producer-consumer';

export const SCENARIOS = [mutex, semaphore, producerConsumer];
