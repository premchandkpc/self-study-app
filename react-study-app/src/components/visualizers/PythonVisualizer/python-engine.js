import gil        from './scenarios/gil';
import asyncio    from './scenarios/asyncio';
import decorators from './scenarios/decorators';
import mlPipeline from './scenarios/ml-pipeline';

export const SCENARIOS = [gil, asyncio, decorators, mlPipeline];
