import produceConsume from './scenarios/produce-consume';
import isr           from './scenarios/isr';
import consumerGroups from './scenarios/consumer-groups';
import lag           from './scenarios/lag';

export const SCENARIOS = [produceConsume, isr, consumerGroups, lag];
