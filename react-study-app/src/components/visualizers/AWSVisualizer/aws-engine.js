import lambda from './scenarios/lambda';
import sqs    from './scenarios/sqs';
import apigw  from './scenarios/apigw';
import eks    from './scenarios/eks';
import sns    from './scenarios/sns';

export const SCENARIOS = [lambda, sqs, apigw, eks, sns];
