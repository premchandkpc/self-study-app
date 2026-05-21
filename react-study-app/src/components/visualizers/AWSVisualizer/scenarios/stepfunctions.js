import { snap, svc, pkt } from '@/core/utils/scenarioShared';

function buildStepFunctionsSteps() {
  const steps = []; const s = {
    nodes: [
      svc('client',   'User / App',       'client', 30, 170, { desc: 'End-user or upstream service that triggers the workflow. Sends order payload via API Gateway REST endpoint.' }),
      svc('apigw',    'API Gateway',       'apigw', 180, 170, { desc: 'HTTP front door. Receives POST /orders, validates request, invokes Step Functions sync execution. Returns execution ARN to client.', endpoint: 'REST' }),
      svc('stepFn',   'State Machine\n(OrderProcessor)', 'lambda', 350, 170, { desc: 'Step Functions workflow — Amazon States Language (ASL) definition. Coordinates: Validate → Process → Notify. Supports Standard (1yr) or Express (5min) workflows.', type: 'Standard', executionCap: 10000 }),
      svc('lambda1',  'Lambda: Validate',  'lambda', 530, 50,  { desc: 'Validates order JSON: required fields (name, email, items, total), schema validation, email format, positive total. Pass → Process, Fail → SQS DLQ.', runtime: 'nodejs20.x', check: 'schema + business rules' }),
      svc('lambda2',  'Lambda: Process',   'lambda', 530, 200, { desc: 'Processes valid order: charge payment (stripe), create order in DynamoDB, send confirmation email. Simulated failure: payment provider timeout.', runtime: 'nodejs20.x' }),
      svc('sqsDlq',   'SQS DLQ',           'db',     530, 350, { desc: 'Dead Letter Queue for failed executions. Catch block redirects failed orders here for manual inspection + reprocessing. Retry count: 3 before sending to DLQ.', retention: 14 }),
      svc('snsNotify', 'SNS Notification', 'server', 530, 470, { desc: 'SNS topic notifies operations team on failure. Subscribers: email (ops@corp.com), Slack webhook, PagerDuty. Alerts: "Order #42 failed after 3 retries".' }),
    ],
    edges: [
      { from: 'client', to: 'apigw' }, { from: 'apigw', to: 'stepFn' },
      { from: 'stepFn', to: 'lambda1' }, { from: 'stepFn', to: 'lambda2' },
      { from: 'stepFn', to: 'sqsDlq' }, { from: 'stepFn', to: 'snsNotify' },
      { from: 'lambda1', to: 'lambda2' },
    ],
    packets: [], events: [],
    metrics: { executions: 0, succeeded: 0, failed: 0, retries: 0, latencyMs: 0 },
    activeEdge: null,
  };

  snap(steps, s, 'Step Functions = state machine orchestrator. Define workflows as JSON (Amazon States Language — ASL). Each step is a "state" — tasks (Lambda, API, SQS), choices (branching), parallels (fan-out), waits (delays), maps (iterations). Standard Workflow: long-running (1yr), exactly-once, 2000/s start rate. Express Workflow: fast (5min), at-least-once, 100k/s. Use: order processing, ETL pipelines, microservice orchestration, business process automation.', 1);

  s.events.push({ type: 'info', msg: 'StartExecution: POST /orders → API Gateway → Step Functions. {"orderId":42,"email":"user@c.com","items":["widget"],"total":29.99,"status":"PENDING"}' });
  s.packets = [pkt('client', 'apigw', 'POST /orders {"orderId":42}', 'request')];
  s.packets = [pkt('apigw', 'stepFn', 'StartSyncExecution: OrderProcessor', 'request')];
  s.metrics.executions = 1;
  snap(steps, s, 'Workflow start: client sends POST with order payload. API Gateway invokes Step Functions via StartSyncExecution (REST API integration). State machine starts with execution ID (arn:aws:states:us-east-1:123:execution:OrderProcessor:uuid). Input: JSON payload from the caller. Execution history: each state transition logged — view in console. Standard Workflows: bill per state transition (1000 transitions = $0.025). Express Workflows: bill per execution + duration (per 1ms, cheaper for high-volume).', 2);

  s.packets = [pkt('stepFn', 'lambda1', 'Task: ValidateOrder → invoke Lambda', 'request')];
  s.nodes[3].state = 'active';
  s.events.push({ type: 'ok', msg: 'Task state "ValidateOrder": invokes Lambda with order input. Lambda validates: all required fields present, email regex match, total > 0.' });
  snap(steps, s, 'Task state = "do some work". Most common state type. Resource: Lambda ARN (or SQS, SNS, ECS, DynamoDB, EMR, etc.). InputPath: filter input to Lambda ($.order — only send the order part). ResultPath: where to put the result in the output ($.validationResult). OutputPath: filter what passes to next state. Example: "InputPath": "$.payload", "ResultPath": "$.validation", "OutputPath": "$". Allows powerful input/output reshaping — only pass relevant data through workflow.', 3);

  s.nodes[3].state = 'active';
  s.packets = [pkt('lambda1', 'stepFn', '{"valid":true,"orderId":42}', 'response')];
  s.events.push({ type: 'ok', msg: 'Validation OK. Transition to ProcessPayment state (Choice → Task). Choice state: if $.validation.valid → ProcessPayment, else → Fail state.' });
  snap(steps, s, 'Choice state: decision branching in the workflow. Rules: "Variable": "$.validation.valid", "BooleanEquals": true → go to ProcessPayment. Default: go to FailurePath (if none match). Multiple choices: AND/OR conditions. Each choice has "Next" target. Choice + Task pattern = if-else logic in workflow. Use for: validate-then-process, routing logic, A/B decision paths. Choice states can nest (complex branching).', 4);

  s.packets = [pkt('stepFn', 'lambda2', 'Task: ProcessPayment → invoke Lambda', 'request')];
  s.nodes[4].state = 'active';
  s.events.push({ type: 'info', msg: 'Task "ProcessPayment": charge $29.99 via payment gateway. Amazon States Language: "Resource":"arn:aws:lambda:...:process","Retry":[{"ErrorEquals":["States.ALL"],"IntervalSeconds":2,"BackoffRate":2,"MaxAttempts":3}]' });
  snap(steps, s, 'Process payment Task with Retry. Retry policy: 2s initial interval, 2x backoff (2→4→8s), max 3 attempts. Retrier catches errors: States.ALL (all errors), Lambda.ServiceException, States.Timeout, States.TaskFailed. When all retries exhausted, the error falls through. Jitter: adding randomness to backoff (prevents thundering herd on retry). Best practice: use specific ErrorEquals instead of States.ALL when possible — let specific errors through to Catch.', 5);

  s.nodes[4].state = 'error'; s.metrics.retries = 1;
  s.events.push({ type: 'warn', msg: '⚠️ Retry 1/3: payment timeout (5s). Wait 2s → retry. Next: 4s → retry. Next: 8s → retry 3/3.' });
  snap(steps, s, 'Retry execution: 1st attempt → timed out. IntervalSeconds=2 → waits 2s, retries. 2nd attempt → same error. BackoffRate=2 → wait 4s (2*2). 3rd attempt → still failing. BackoffRate=2 → wait 8s (4*2). MaxAttempts=3 → all retries exhausted. Retry fields: ErrorEquals (match specific errors), IntervalSeconds (initial wait), MaxAttempts (how many retries), BackoffRate (multiplier per attempt). After max attempts, the error is "unhandled" — will trigger Catch if defined.', 6);

  s.metrics.retries = 3; s.metrics.failed = 1;
  s.events.push({ type: 'error', msg: '❌ All 3 retries exhausted. Catch state: "ErrorEquals":["States.ALL"],"Next":"SendToDLQ","ResultPath":"$.error" — redirects to DLQ handler.' });
  snap(steps, s, 'Catch = error handling (when retries exhausted). Fields: ErrorEquals (which errors to catch — can have multiple catchers), Next (target state to transition to), ResultPath (where to put the error details, e.g., $.error). Catcher evaluates in order — first matching ErrorEquals wins. Fallback: define a Default catcher with States.ALL as last resort. Use: route errors to DLQ state, notification state, or human approval state. Catch does NOT retry — it redirects. For retry + fallback: always Retry first (in state definition), then Catch.', 7);

  s.packets = [pkt('stepFn', 'sqsDlq', 'SendMessage: order-42-failed', 'request')];
  s.nodes[5].state = 'active';
  s.events.push({ type: 'warn', msg: 'DLQ: order #42 sent to Dead Letter Queue. Including error details + input payload. Operations can replay messages after fix.' });
  snap(steps, s, 'SQS DLQ state: Task state that sends failed order to SQS queue. Message body: orderId, input payload, error details (errorType, errorMessage, executionArn, stateName). SQS DLQ configured with redrive policy: maxReceiveCount=3 (after 3 failed processing attempts, message moves to DLQ). Operations team polls DLQ: inspect failure, fix system (payment provider config), replay message (send to main queue again). Alternative: use Step Functions native DLQ configuration (execution level — sends failed execution ARN to SQS/SNS).', 8);

  s.packets = [pkt('stepFn', 'snsNotify', 'Publish: "Order #42 failed after 3 retries"', 'request')];
  s.nodes[6].state = 'active';
  s.events.push({ type: 'error', msg: '📧 SNS sends notification: email to ops@corp.com, Slack alert, PagerDuty incident. "Order #42 processing failed — payment gateway timeout after 3 retries"' });
  snap(steps, s, 'SNS notification state: parallel or sequential after DLQ. Publish to SNS topic: message includes orderId, error, execution link (click to view execution history in console). SNS subscribers: email (standard), Lambda (auto-remediation — e.g., refund the order), Slack webhook (via Lambda), PagerDuty (incident creation). Alternative workflow: Human Approval pattern — use SQS + Lambda to send approval email, wait for callback token (.taskToken) in Step Functions. .waitForTaskToken: pause execution until external process calls SendTaskSuccess with the token.', 9);

  s.packets = [];
  s.metrics.succeeded = 1; s.metrics.failed = 0; s.metrics.retries = 0;
  s.nodes[3].state = 'idle'; s.nodes[4].state = 'idle'; s.nodes[5].state = 'idle'; s.nodes[6].state = 'idle';
  s.events.push({ type: 'ok', msg: 'Happy path. Validate → Process → Succeed. Workflow execution ID: arn:aws:states:us-east-1:... Order status: COMPLETED.' });
  snap(steps, s, 'Happy path execution: Validate (Lambda passes) → Choice (valid=true) → ProcessPayment (Lambda succeeds) → Succeed state. Succeed state: terminates the workflow successfully. Fail state: terminates with failure (marks execution as FAILED, shows error in console). Parallel state: run multiple branches concurrently (fan-out). Wait state: pause for a time (seconds or timestamp). Map state: iterate over an array (sequential or parallel up to 40K items — max 40 concurrent in Standard, 10K concurrent in Express). Dynamic Parallelism: Map state processes array elements in parallel.', 10);

  s.events.push({ type: 'info', msg: 'Express Workflow: 100k executions/second, 5min max, at-least-once. 97% cheaper than Standard. Use for high-volume events (IoT, streaming, data transformation).' });
  snap(steps, s, 'Standard vs Express Workflows. Standard: 1-year max duration, exactly-once execution, 2000/s start rate, $0.025/1000 state transitions. Use: long-running processes, human approval, order processing, idempotency-critical. Express: 5-min max duration, at-least-once, 100k/s, $0.001/1000 transitions + $0.0000000166/ms. Use: high-volume event processing, real-time data streaming, IoT ingestion, ETL transformations. Express sync: caller waits for response (HTTP request/response). Express async: fire-and-forget (event-driven). Both: same ASL syntax, same state types.', 11);

  s.nodes[2].state = 'active';
  s.events.push({ type: 'ok', msg: 'Distributed Map: process 2M SQS messages concurrently. 10K concurrent iterations. Use for large-scale parallel processing (reconciliation, reindex, batch transform).' });
  snap(steps, s, 'Distributed Map state: process up to 2M concurrent iterations (if you request quota increase). Use: batch processing millions of files, reindex search, data reconciliation, large-scale ETL. How: Map state with "MaxConcurrency" (number of concurrent children), "ItemsPath" (JSON array in state input), "ItemProcessor" (child workflow — can be any state, including another Map for nesting). Distributed Map uses Express Workflows under the hood — each child execution is an Express workflow. Built-in fault tolerance: failed items tracked, retryable, report of successes/failures per item.', 12);

  s.events.push({ type: 'info', msg: 'Workflow Studio: drag-and-drop visual builder. Generate ASL JSON. Test executions in console. Execution history: visual timeline of every state transition with timing + input/output.' });
  snap(steps, s, 'Step Functions console: Workflow Studio — visual drag-and-drop builder. Automatically generates ASL JSON. Execution history viewer: visual timeline of each state, click for input/output details, timing per state, error messages directly on the graph. Debugging: inspect input/output at each state, retry history, error cause. Execution event list: every state transition, error, retry logged (max 25K events per execution). CloudWatch metrics: executions started, succeeded, failed, timedOut, throttled. CloudWatch Logs: send execution history (standard) or all events (express) to CloudWatch for analysis.', 13);

  s.nodes[4].state = 'active';
  s.events.push({ type: 'ok', msg: 'Service integrations: 200+ AWS services direct (Lambda, DynamoDB, ECS, SQS, SNS, EMR, Glue, SageMaker, Athena, Bedrock). No Lambda glue code needed.' });
  snap(steps, s, 'AWS service integrations: call 200+ AWS services directly from Step Functions without a Lambda middleman. DynamoDB: PutItem, GetItem, UpdateItem, DeleteItem, Query, Scan. ECS: RunTask, StopTask. SQS: SendMessage, ReceiveMessage. SNS: Publish. EMR: CreateCluster, AddJobFlowSteps. Glue: StartJobRun. SageMaker: CreateTrainingJob. Athena: StartQueryExecution. Bedrock: InvokeModel. Use: reduce Lambda function count (less code, less cost). Optimized integrations (.sync, .waitForTaskToken): wait for service to complete (e.g., EMR cluster creation finishes → Step Functions continues).', 14);

  s.events.push({ type: 'info', msg: 'Callback pattern (.waitForTaskToken): pause workflow, wait for external system to call SendTaskSuccess. Human approval: send approval email → wait for callback → Approved = continue, Rejected = fail.' });
  snap(steps, s, 'Callback pattern: .waitForTaskToken in Task resource ARN (e.g., "arn:aws:states:::lambda:invoke.waitForTaskToken"). Step Functions passes a task token to the worker, then pauses. Worker: does work asynchronously (human approval, external API), then calls SendTaskSuccess(token, output) or SendTaskFailure(token, error). Use: human approval flows (send Slack notification → wait for manager approve/reject), third-party API callback, async long-running computation. Security: task token is opaque — only the caller with the token can resolve the task.', 15);

  s.result = 'Step Functions: Task → Choice → Retry → Catch → DLQ/SNS. Standard=1yr, Express=5min. 200+ direct integrations.';
  snap(steps, s, 'Key takeaways: 1) ASL JSON defines the entire workflow (no code for orchestration). 2) Task states do the actual work (Lambda, API, SQS, 200+ services). 3) Retry + Catch patterns for error handling. 4) Choice for branching, Parallel for fan-out, Map for iteration. 5) Standard (1yr, exactly-once) vs Express (5min, at-least-once). 6) Distributed Map for massive parallelism (2M items). 7) Direct service integrations (no Lambda needed). 8) Callback pattern for human approval. 9) InputPath/ResultPath/OutputPath for data flow. 10) Workflow Studio for visual building. 11) CloudWatch + X-Ray for observability.', 16);

  return steps;
}

const CODE = [
  '# ASL State Machine definition (snippet)',
  `{
    "Comment": "Order Processor State Machine",
    "StartAt": "ValidateOrder",
    "States": {
      "ValidateOrder": {
        "Type": "Task",
        "Resource": "arn:aws:lambda:us-east-1:123:function:validate",
        "InputPath": "$.payload",
        "ResultPath": "$.validation",
        "Next": "CheckValidation"
      },
      "CheckValidation": {
        "Type": "Choice",
        "Choices": [
          {
            "Variable": "$.validation.valid",
            "BooleanEquals": true,
            "Next": "ProcessPayment"
          }
        ],
        "Default": "SendToDLQ"
      },
      "ProcessPayment": {
        "Type": "Task",
        "Resource": "arn:aws:lambda:us-east-1:123:function:process",
        "Retry": [
          {
            "ErrorEquals": ["States.ALL"],
            "IntervalSeconds": 2,
            "MaxAttempts": 3,
            "BackoffRate": 2
          }
        ],
        "Catch": [
          {
            "ErrorEquals": ["States.ALL"],
            "Next": "SendToDLQ"
          }
        ],
        "End": true
      },
      "SendToDLQ": {
        "Type": "Task",
        "Resource": "arn:aws:states:::sqs:sendMessage",
        "Parameters": {
          "QueueUrl": "https://sqs.us-east-1.amazonaws.com/123/dlq",
          "MessageBody": {"orderId.$": "$.orderId", "error.$": "$.error"}
        },
        "Next": "NotifyOps"
      },
      "NotifyOps": {
        "Type": "Task",
        "Resource": "arn:aws:states:::sns:publish",
        "Parameters": {
          "TopicArn": "arn:aws:sns:us-east-1:123:ops-alerts",
          "Message": {"orderId.$": "$.orderId"}
        },
        "End": true
      }
    }
  }`,
  '# Create state machine',
  `aws stepfunctions create-state-machine --name OrderProcessor \\
    --definition file://asl.json --role-arn arn:aws:iam::123:role/stepFunctionsRole \\
    --type STANDARD`,
  '# Start execution',
  `aws stepfunctions start-execution --state-machine-arn arn:aws:states:us-east-1:123:stateMachine:OrderProcessor \\
    --input '{"payload":{"orderId":42,"total":29.99}}'`,
  '# Describe execution history',
  'aws stepfunctions describe-execution --execution-arn arn:aws:states:...:execution:...',
  'aws stepfunctions get-execution-history --execution-arn arn:aws:states:...:execution:...',
  '# Callback (human approval pattern)',
  '# State Resource: arn:aws:states:::lambda:invoke.waitForTaskToken',
  '# Worker calls: aws stepfunctions send-task-success --task-token abc123 --output "approved"',
  '# Express Workflow (sync)',
  `aws stepfunctions start-sync-execution --state-machine-arn arn:aws:states:...:stateMachine:OrderProcessor --input '{...}'`,
  '# Distributed Map',
  '# Use Map state with ItemsPath and ItemProcessor',
  '# Pricing',
  '# Standard: $0.025 per 1,000 state transitions',
  '# Express: $0.001 per 1,000 transitions + $0.0000000166/ms',
];

export default {
  id: 'stepfunctions', label: 'Step Functions', icon: '🔀',
  build: buildStepFunctionsSteps, code: CODE, language: 'JSON/CLI',
  metrics: [
    { key: 'executions', label: 'Executions',   max: 10,   color: 'var(--node-default)' },
    { key: 'succeeded',  label: 'Succeeded',    max: 5,    color: 'var(--pod-running)' },
    { key: 'failed',     label: 'Failed',       max: 5,    color: 'var(--pod-error)' },
    { key: 'retries',    label: 'Retries',      max: 5,    color: 'var(--pod-crash)', warn: 3, critical: 4 },
    { key: 'latencyMs',  label: 'Latency (ms)', max: 10000, unit: 'ms', color: 'var(--node-comparing)', warn: 5000, critical: 8000 },
  ],
  topicContent: {
    concept: [
      { title: 'Amazon States Language (ASL) — the workflow definition language', content: 'Step Functions uses ASL, a JSON-based DSL that defines the entire workflow as a state machine. Key states include Task (invoke a Lambda, API, or AWS service), Choice (if-else branching), Parallel (concurrent branches), Map (iterate over an array — sequential or parallel), Wait (pause for a time or until a timestamp), Succeed (terminate successfully), and Fail (terminate with error). Each state can transform input and output using InputPath, ResultPath, and OutputPath for fine-grained data flow control.' },
      { title: 'Standard vs Express Workflows — choosing the right type', content: 'Standard Workflows run up to 1 year, provide exactly-once execution, support up to 2000 start events per second, and cost $0.025 per 1000 state transitions. Express Workflows run up to 5 minutes, provide at-least-once execution, support up to 100,000 start events per second, and cost about 97% less than Standard. Express offers synchronous (caller waits for response) and asynchronous (fire-and-forget) execution modes. Use Standard for long-running business processes like order fulfillment or human approval; use Express for high-volume event processing like IoT data ingestion, streaming transformations, or request-response API orchestration.' },
      { title: 'Deep — Workflow execution model, error handling, and callbacks', content: 'Step Functions tracks execution state as a series of events — each state transition, retry, and error is recorded in the execution history (up to 25,000 events for Standard workflows). Retry and Catch are defined at the state level: Retry specifies exponential backoff with jitter for transient failures, while Catch redirects to a fallback state when retries are exhausted. The waitForTaskToken callback pattern pauses execution and emits a task token — an external process (human approval, third-party API) calls SendTaskSuccess or SendTaskFailure with the token to resume the workflow. Distributed Map state processes up to 10,000 concurrent child executions (configurable to 2 million with quota increase), each running as an Express workflow under the hood, enabling massive parallel batch processing of SQS messages, S3 files, or DynamoDB records.' },
    ],
    why: [
      'Step Functions replaces brittle custom orchestration code — typically chains of Lambda functions calling each other — with a single, auditable, resilient state machine definition. This eliminates distributed system bugs like missed error handling, incorrect retry logic, and lost state between services, while providing a visual execution history that makes debugging and compliance auditing straightforward.',
      'The direct service integrations with over 200 AWS services eliminate the need for Lambda glue code. Step Functions can call DynamoDB to get and put items, ECS to run tasks, SQS to send messages, SageMaker to start training jobs, and Bedrock to invoke models — all without writing a single line of integration code. This reduces code volume, testing surface area, and operational complexity.',
      'Step Functions enables sophisticated workflow patterns that are difficult to implement correctly with custom code: coordinated retry with exponential backoff across multiple services, human approval workflows with timeouts, fan-out parallel processing with dynamic parallelism via Map state, and saga patterns for distributed transactions. These patterns are battle-tested and built into the service, eliminating months of development and testing effort.',
    ],
    interview: [
      { q: 'What is the difference between Retry and Catch in Step Functions?', a: 'Retry and Catch are both error handling mechanisms defined at the state level, but they serve different purposes. Retry automatically re-executes the same state after a failure, with configurable exponential backoff using IntervalSeconds, BackoffRate, and MaxAttempts parameters. Retry is suitable for transient failures like network timeouts or throttling. Catch is a fallback that activates when all retry attempts are exhausted — it redirects execution to a different state (like a DLQ handler or notification state). You define Retry first, then Catch as the last resort. Multiple Retriers can match specific error types (like Lambda.ServiceException or States.Timeout), and multiple Catchers can route different errors to different fallback states. If neither Retry nor Catch handles an error, the execution fails and shows the error in the execution history.', followUps: ['How does the BackoffRate parameter work with jitter?', 'Can you have multiple Catchers for different error types?'] },
      { q: 'When would you use Standard workflows versus Express workflows?', a: 'Choose Standard workflows for business-critical, long-running processes that require exactly-once execution and can tolerate higher per-transition costs. Examples include order fulfillment workflows spanning days, human approval processes with email-based callbacks, and multi-step ETL pipelines that must complete without duplicate processing. Choose Express workflows for high-volume, short-duration event processing where at-least-once delivery and lower cost are priorities. Examples include real-time IoT data ingestion, streaming data transformations, API request-response orchestration with sub-second latency requirements, and fan-out event processing for high-throughput systems. Express workflows cost approximately 97% less than Standard and support 50x higher start rates. Express also offers two invocation modes: synchronous (caller waits for the result, useful for API endpoints) and asynchronous (fire-and-forget, useful for event-driven processing).', followUps: ['What is the pricing difference between Standard and Express?', 'Can Express workflows be started synchronously and how is that different from Standard?'] },
      { q: 'How does the callback pattern (.waitForTaskToken) work and when would you use it?', a: 'The callback pattern pauses a workflow execution at a specific task state and waits for an external process to resume it. It works by appending .waitForTaskToken to the task resource ARN, which causes Step Functions to generate a unique task token and pass it to the worker (Lambda, SQS, or ECS task). The workflow then pauses and waits. The external worker performs its work — which could take minutes or hours — and then calls the Step Functions API with SendTaskSuccess(token, output) or SendTaskFailure(token, error) to resume or fail the workflow. Common use cases include human approval flows where a manager must approve or reject a request via email or Slack, third-party API integrations where an external service processes a request and calls back with results, and long-running computations on external systems like EMR or SageMaker where Step Functions waits for the job to complete before proceeding.', followUps: ['How is the task token transmitted to the external system?', 'What happens if the external system never calls SendTaskSuccess?', 'How does the HeartbeatSeconds parameter interact with the callback pattern?'] },
    ],
    gotcha: [
      'Standard workflows have a hard 25,000 event history limit — each state transition, retry, parallel branch start, and map iteration counts as an event. Very long-running or highly iterative workflows will be forcibly terminated when they hit this limit. Use Express workflows or split into multiple chained state machines for workflows with many iterations.',
      'Express workflows provide at-least-once execution semantics — the same execution may be started multiple times, especially during retries or failure recovery scenarios. All downstream systems (DynamoDB writes, SQS messages, API calls) must be idempotent to handle duplicate executions without producing incorrect results.',
      'The Map state default max concurrency is 40 for Standard workflows — attempting to process a large array with higher concurrency will hit this limit silently. You must use Distributed Map state or explicitly set MaxConcurrency to increase parallelism, but Standard Map state cannot exceed 40 concurrent iterations.',
      'Workflow execution ARNs are unique per execution — but the input and output of each state are limited to 256KB of JSON. If your state input or output exceeds this limit during input/output processing (InputPath, ResultPath, OutputPath), the execution will fail with a States.DataLimitExceeded error. Keep state data small and use S3 for large payloads.',
    ],
    tradeoffs: [
      { pro: 'Visual orchestration replaces complex chains of Lambda functions calling each other with a single, auditable, resilient state machine. The execution history viewer provides a visual timeline of every state transition with input, output, timing, and error details — invaluable for debugging and compliance.', con: 'ASL JSON can become unwieldy for very complex workflows with dozens of states and nested Parallel/Map state machines. Consider splitting large workflows into multiple chained state machines for maintainability, or use Workflow Studio for visual editing.' },
      { pro: 'Direct service integrations with over 200 AWS services eliminate the Lambda middleman pattern — Step Functions can call DynamoDB, ECS, SQS, SNS, EMR, SageMaker, Athena, and Bedrock directly, reducing code, cost, and complexity.', con: 'Debugging ASL errors can be challenging — execution history is detailed but verbose, and invalid ASL syntax produces generic error messages. The visual editor helps but complex Retry/Catch/Choice logic requires careful testing in the console before production deployment.' },
      { pro: 'The callback pattern with .waitForTaskToken enables human-in-the-loop workflows, third-party API integrations, and long-running external job orchestration without custom polling infrastructure or database tables for workflow state tracking.', con: 'State data limits (256KB per state) and the 25,000 event history cap for Standard workflows impose hard boundaries on workflow complexity. Workflows processing large datasets must store data in S3 and pass references rather than inline payloads, adding architectural complexity.' },
    ],
  },
};
