import { snap, svc, pkt } from '@/core/utils/scenarioShared';

function buildIAMSteps() {
  const steps = []; const s = {
    nodes: [
      svc('user',     'IAM User\n(Alice)',         'client',  30,  180),
      svc('group',    'Group: developers\n(policies x2)', 'server', 200, 180, { inlinePolicies: 0, attachedPolicies: 2 }),
      svc('role',     'IAM Role\nec2-s3-read',      'server',  380, 180, { trust: 'EC2 Service', maxSession: 3600 }),
      svc('policy',   'Customer Managed\nPolicy',   'lambda',  560, 100),
      svc('s3',       'S3 Bucket\nmy-app-data',     'db',      560, 260),
      svc('org',      'AWS Organizations\nSCP',     'apigw',   560, 400),
    ],
    edges: [
      { from: 'user', to: 'group' },
      { from: 'group', to: 'policy' },
      { from: 'role', to: 'policy' },
      { from: 'role', to: 's3' },
      { from: 'org', to: 'user' },
      { from: 'org', to: 'role' },
    ],
    packets: [], events: [],
    metrics: { users: 0, roles: 0, policies: 0, scps: 0 },
    activeEdge: null,
  };

  snap(steps, s, 'IAM = Identity and Access Management. Global service (no regions). Defines WHO (user/role) can do WHAT (action) to WHICH RESOURCE (ARN) under WHAT CONDITION. THREE components: Principal (who), Policy (what), Resource (which). Think of it as: "Who can do what on which AWS thing?"', 1);

  s.events.push({ type: 'info', msg: 'IAM User: Alice. Type: "Principal". Login profile: password (console) + access keys (CLI: AKIAxxxxx + secret).' });
  s.nodes[0].state = 'active'; s.metrics.users = 1;
  snap(steps, s, 'IAM User = long-term identity for a human or application. Two access methods: Console (username + password + optional MFA) and CLI/SDK (Access Key ID + Secret Access Key). By default: DENY ALL — a new user can NOTHING. No permissions are inherited automatically. Best practice: create individual users per human (not shared accounts), rotate access keys every 90 days, enable MFA for console access, use fine-grained IAM policies.', 2);

  s.events.push({ type: 'ok', msg: 'Alice added to Group "developers". Group has 2 policies: AmazonS3FullAccess (AWS managed) + custom-policy (customer managed).' });
  s.nodes[1].state = 'active'; s.metrics.policies = 2;
  snap(steps, s, 'IAM Group = collect users, attach policies, ALL members inherit permissions. Think of it as a "permissions bucket": add user to group → user gets all the group\'s policies. NEVER attach policies directly to users (it\'s a management nightmare). Group types: functional (developers, admins, auditors), application (service-A-team, service-B-team). Alice now has S3 full access + custom permissions from the group. Removing Alice from group instantly revokes those permissions — no need to edit policies.', 3);

  s.events.push({ type: 'ok', msg: 'IAM Role "ec2-s3-read": Trust = "ec2.amazonaws.com" (who can assume). Permissions = S3 ReadOnly (what they can do).' });
  s.nodes[2].state = 'active'; s.metrics.roles = 1;
  snap(steps, s, 'IAM Role = temporary identity for services (NOT for humans). TWO parts: Trust Policy (WHO is allowed to assume the role — e.g., ec2.amazonaws.com, lambda.amazonaws.com, another AWS account) and Permissions Policy (WHAT the role can do once assumed). Roles do NOT have long-term credentials — they get temporary credentials via STS (Security Token Service). Use roles for: EC2, Lambda, ECS, EKS, cross-account access, workforce federation (Cognito). NEVER use IAM User access keys on EC2!', 4);

  s.packets = [pkt('role', 's3', 'GetObject via STS credentials', 'request')];
  s.nodes[4].state = 'active';
  s.nodes[3].state = 'active';
  s.events.push({ type: 'ok', msg: 'EC2 assumes role → STS issues: AccessKeyId + SecretAccessKey + SessionToken (1h default). SDK auto-refreshes.' });
  snap(steps, s, 'EC2 assumes the role: 1) Instance Metadata Service (IMDSv2 at http://169.254.169.254) returns temporary credentials. 2) AWS SDK inside the instance uses these to sign API calls. 3) Temporary credentials expire (default 1h, configure max 12h). 4) SDK automatically refreshes before expiry. NO hardcoded secrets! Benefits: automatic credential rotation, granular permissions per EC2 (different roles for web vs worker instances), audit trail via CloudTrail (who assumed which role). Same pattern for Lambda execution role, ECS task role, EKS IRSA.', 5);

  s.events.push({ type: 'info', msg: 'Policy evaluation: SCP → Resource Policy → Identity Policy → explicit DENY always overrides Allow.' });
  s.nodes[5].state = 'active'; s.metrics.scps = 1;
  snap(steps, s, 'IAM Policy Evaluation Order (critical to understand): 1) SCP (Organization): if DENY at this level → blocked, no further checks. 2) Resource-based policy (e.g., S3 bucket policy): grants OR denies access. 3) Identity-based policy (user/group/role): grants permissions. 4) Final decision: if ANY policy says DENY → DENIED. If at least one policy says ALLOW and no DENY → ALLOWED. If neither → DENIED by default. Explicit DENY always wins! Example: S3 bucket policy says "Deny if not MFA" → even if user has s3:GetObject → DENIED because bucket policy says so.', 6);

  s.packets = [];
  s.events.push({ type: 'ok', msg: 'Policy JSON: Version, Statement[]. Effect: Allow/Deny. Action: ["s3:GetObject"]. Resource: "arn:aws:s3:::bucket/*". Condition: {"IpAddress": {"aws:SourceIp": "10.0.0.0/8"}}' });
  snap(steps, s, 'IAM Policy structure: { "Version": "2012-10-17", "Statement": [ { "Effect": "Allow", "Action": ["s3:GetObject", "s3:ListBucket"], "Resource": ["arn:aws:s3:::my-bucket", "arn:aws:s3:::my-bucket/*"], "Condition": { "IpAddress": { "aws:SourceIp": "10.0.0.0/8" } } } ] }. Condition keys: aws:SourceIp (IP address), aws:RequestedRegion (region), aws:MultiFactorAuthPresent (MFA), s3:x-amz-server-side-encryption (require encryption), iam:PassedToService (who can pass role to service). Use IAM Policy Simulator to test policies before deploying.', 7);

  s.events.push({ type: 'warn', msg: 'Permission Boundary: Alice CAN have any S3 permissions BUT cannot create users or modify IAM roles. Boundary = "IAMFullAccess" but restricted by boundary.' });
  snap(steps, s, 'Permission Boundary: a managed policy that defines the MAXIMUM permissions a user/role can have. Think of it as a fence: the user\'s IAM policy gives ALLOW, but the boundary says "you can\'t go beyond these actions". Even if you attach AdministratorAccess, the boundary blocks everything outside it. Use for: delegating IAM admin to developers (they can manage their own IAM but boundary prevents privilege escalation), multi-tenant environments, limiting service-linked roles. Combined: effective permissions = (identity policy ∩ permission boundary) - DENY.', 8);

  s.events.push({ type: 'ok', msg: 'Service Control Policy (SCP): applied at Organization level (root/OU). Alice\'s account: SCP blocks all EC2 actions. Even admin can\'t launch EC2!' });
  snap(steps, s, 'SCP = Organization-level guardrails. Applied to AWS accounts via AWS Organizations. SCPs FILTER permissions — they don\'t GRANT anything (only identity + resource policies can grant). SCP says "EC2 is not allowed" → even an admin with AdministratorAccess can\'t use EC2. SCPs affect ALL users in the account (including root!). Common SCPs: prohibit leaving organization, restrict regions, require encryption, block root user actions, restrict expensive instance types. SCP ≠ IAM — they work together: effective = SCP ∩ IAM.', 9);

  s.events.push({ type: 'info', msg: 'IAM Access Analyzer: found unused S3 bucket (no access for 30d), unused IAM role (never assumed), unused policy (no principal used it).' });
  snap(steps, s, 'IAM Access Analyzer: finds resources shared with external entities (unintended public access). Analyzes S3 buckets, KMS keys, IAM roles, Lambda functions, SQS queues. Results: "Bucket my-app-data is accessible from the internet due to bucket policy allowing Principal *". Also finds: unused access (recommendations to remove), policy validation (checks policy grammar + security). Use before deploying — scan all resources for unintended public access. Integrates with: IAM, S3, KMS, Lambda, SQS, Secrets Manager.', 10);

  s.events.push({ type: 'ok', msg: 'AWS Roles Anywhere: on-prem server gets temporary credentials via IAM Role. Uses X.509 certificate for trust.' });
  snap(steps, s, 'IAM Roles Anywhere: extend IAM to on-premise servers. How: 1) Create a trust anchor (X.509 certificate from your CA). 2) Create a profile linked to IAM role. 3) Install Roles Anywhere agent on-prem. 4) Agent presents certificate → gets temporary AWS credentials. Use for: hybrid workloads (on-prem + cloud), migration scenarios, workloads that can\'t move to AWS yet. No long-term access keys on-prem! ABAC (Attribute-Based Access Control): use tags to define permissions dynamically. Instead of policy per user, use "Allow if resource.tag.owner = principal.tag.owner". Scales better for large teams.', 11);

  s.events.push({ type: 'info', msg: 'IAM Identity Center (SSO): login once → access multiple AWS accounts + apps. OKTA/Azure AD/AD FS integration.' });
  snap(steps, s, 'IAM Identity Center (formerly AWS SSO): centralized access management across AWS accounts + business applications. Features: 1) Single sign-on to ALL AWS accounts in Organization. 2) Integrates with external IdP: Microsoft Entra ID (Azure AD), OKTA, OneLogin, AD FS. 3) Permission Sets: pre-defined IAM policies applied to users/groups in specific accounts. 4) Attribute-based access control (ABAC): use user attributes from IdP (department, cost center) as Condition keys. Never create IAM users in individual accounts — manage centrally via Identity Center!', 12);

  s.result = 'IAM: User→Group→Policy. Service→Role(trust+permissions). SCP→PermissionBoundary→IAM→DENY wins.';
  snap(steps, s, 'Key practices: 1) Least privilege = minimum actions + specific resources + conditions. Start broad, narrow down. 2) Use groups for humans, roles for services. 3) SCPs for org-wide guardrails, Permission Boundaries for delegated admin. 4) Use IAM Access Analyzer to detect unintended public access. 5) Enable CloudTrail to audit all IAM actions. 6) Use IAM Identity Center instead of individual IAM users. 7) Require MFA for all human users. 8) Rotate access keys every 90 days. 9) Use IAM Roles Anywhere for on-prem. 10) Test policies with IAM Policy Simulator before deploying.', 13);

  return steps;
}

const CODE = [
  '# Create user + add to group',
  'aws iam create-user --user-name alice',
  'aws iam add-user-to-group --user-name alice --group-name developers',
  '# Create role for EC2',
  'aws iam create-role \\',
  '  --role-name ec2-s3-read \\',
  '  --assume-role-policy-document file://trust-policy.json',
  '# Attach managed policy to role',
  'aws iam attach-role-policy \\',
  '  --role-name ec2-s3-read \\',
  '  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess',
  '# Create customer managed policy',
  'aws iam create-policy \\',
  '  --policy-name my-custom-policy \\',
  '  --policy-document file://policy.json',
  '# Set permission boundary',
  'aws iam put-user-permissions-boundary \\',
  '  --user-name alice \\',
  '  --permissions-boundary arn:aws:iam::aws:policy/PowerUserAccess',
  '# IAM Access Analyzer (find public resources)',
  'aws accessanalyzer create-analyzer --analyzer-name my-analyzer --type ACCOUNT',
];

export default {
  id: 'iam', label: 'IAM', icon: '🔐',
  build: buildIAMSteps, code: CODE, language: 'CLI',
  metrics: [
    { key: 'users',    label: 'Users',     max: 5,  color: 'var(--node-default)' },
    { key: 'roles',    label: 'Roles',     max: 5,  color: 'var(--node-path)' },
    { key: 'policies', label: 'Policies',  max: 5,  color: 'var(--pod-running)' },
    { key: 'scps',     label: 'SCPs',      max: 3,  color: 'var(--node-comparing)' },
  ],
};
