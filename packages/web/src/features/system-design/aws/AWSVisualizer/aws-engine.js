import lambda from './scenarios/lambda';
import sqs    from './scenarios/sqs';
import apigw  from './scenarios/apigw';
import eks    from './scenarios/eks';
import sns    from './scenarios/sns';
import s3     from './scenarios/s3';
import ec2    from './scenarios/ec2';
import iam    from './scenarios/iam';
import route53 from './scenarios/route53';
import ecs    from './scenarios/ecs';
import stepfunctions from './scenarios/stepfunctions';
import aurora from './scenarios/aurora';
import elasticache from './scenarios/elasticache';

export const SCENARIOS = [lambda, sqs, apigw, eks, sns, s3, ec2, iam, route53, ecs, stepfunctions, aurora, elasticache];
