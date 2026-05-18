import goroutine from './scenarios/goroutine';
import channel   from './scenarios/channel';
import select_   from './scenarios/select';
import scheduler from './scenarios/scheduler';
import mutex     from './scenarios/mutex';

export const SCENARIOS = [goroutine, channel, select_, scheduler, mutex];
