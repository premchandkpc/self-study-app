import lambda from './scenarios/lambda';
import sqs    from './scenarios/sqs';
import apigw  from './scenarios/apigw';
import eks    from './scenarios/eks';
import sns    from './scenarios/sns';
import s3     from './scenarios/s3';
import ec2    from './scenarios/ec2';
import iam    from './scenarios/iam';

export const SCENARIOS = [lambda, sqs, apigw, eks, sns, s3, ec2, iam];
