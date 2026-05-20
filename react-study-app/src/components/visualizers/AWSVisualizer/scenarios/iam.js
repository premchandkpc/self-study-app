import { snap, svc, pkt } from '@/core/utils/scenarioShared';

function buildIAMSteps() {
  const steps = []; const s = {
    nodes: [
      svc('user',   'IAM User\n(Alice)',     'client',  30, 180, { desc: 'Long-term identity for a human. Has password (console) + access keys (CLI/SDK). By default: DENY ALL. MFA recommended.', mfa: true, accessKeys: 2 }),
      svc('group',  'Group: developers\n(policies x2)', 'server', 210, 180, { inlinePolicies: 0, attachedPolicies: 2, desc: 'Collection of users. Attach policies to group — ALL members inherit. Never attach policies directly to users. Best practice for permission management.', members: 5 }),
      svc('role',   'IAM Role\nec2-s3-read', 'server', 400, 180, { trust: 'EC2 Service', maxSession: 3600, desc: 'Temporary identity for services. Two parts: Trust Policy (WHO can assume — ec2.amazonaws.com) + Permissions Policy (WHAT they can do — S3 ReadOnly). No long-term credentials.', sessionDuration: '1h' }),
      svc('policy', 'Customer Managed\nPolicy', 'lambda', 580, 100, { desc: 'JSON policy document. Version 2012-10-17. Statement: Effect (Allow/Deny) + Action (s3:GetObject) + Resource (ARN) + Condition (aws:SourceIp). Customer managed = reusable, versioned.', effect: 'Allow', actions: 3 }),
      svc('s3',     'S3 Bucket\nmy-app-data','db',    580, 260, { desc: 'Protected resource. Bucket policy: resource-based policy (separate from IAM). Can grant cross-account access. Evaluated BEFORE identity policy.', bucketPolicy: 'Deny if not MFA' }),
      svc('scp',    'AWS Organizations\nSCP', 'apigw', 580, 400, { desc: 'Service Control Policy — organization-wide guardrails. Applied to root OU → child OUs → accounts. Affects ALL users (including root!). Does NOT grant — only filters.', scope: 'Entire Organization' }),
    ],
    edges: [
      { from: 'user', to: 'group' }, { from: 'group', to: 'policy' },
      { from: 'role', to: 'policy' }, { from: 'role', to: 's3' },
      { from: 'scp', to: 'user' }, { from: 'scp', to: 'role' },
    ],
    packets: [], events: [],
    metrics: { users: 0, roles: 0, policies: 0, scps: 0 },
    activeEdge: null,
  };

  snap(steps, s, 'IAM = Identity and Access Management. Global service (no regions). Defines WHO (user/role) can do WHAT (action) to WHICH RESOURCE (ARN) under WHAT CONDITION. THREE components: Principal (who), Policy (what), Resource (which). Think of it as: "Who can do what on which AWS thing?"', 1);

  s.events.push({ type: 'info', msg: 'IAM User: Alice. Type: "Principal". Login profile: password (console) + access keys (CLI: AKIAxxxxx + secret).' });
  s.nodes[0].state = 'active'; s.metrics.users = 1;
  snap(steps, s, 'IAM User = long-term identity for a human or application. Two access methods: Console (username + password + optional MFA) and CLI/SDK (Access Key ID + Secret Access Key). By default: DENY ALL — a new user can NOTHING. No permissions are inherited automatically. Best Practice: create individual users per human (not shared accounts), rotate access keys every 90 days, enable MFA for console access, use fine-grained IAM policies.', 2);

  s.events.push({ type: 'ok', msg: 'Alice added to Group "developers". Group has 2 policies: AmazonS3FullAccess (AWS managed) + custom-policy (customer managed).' });
  s.nodes[1].state = 'active'; s.metrics.policies = 2;
  snap(steps, s, 'IAM Group = collect users, attach policies, ALL members inherit permissions. NEVER attach policies directly to users (it\'s a management nightmare). Group types: functional (developers, admins, auditors), application (service-A-team, service-B-team). Alice now has S3 full access + custom permissions from the group. Removing Alice from group instantly revokes those permissions — no need to edit policies.', 3);

  s.events.push({ type: 'ok', msg: 'IAM Role "ec2-s3-read": Trust = "ec2.amazonaws.com" (who can assume). Permissions = S3 ReadOnly (what they can do).' });
  s.nodes[2].state = 'active'; s.metrics.roles = 1;
  snap(steps, s, 'IAM Role = temporary identity for services (NOT for humans). TWO parts: Trust Policy (WHO is allowed to assume the role — e.g., ec2.amazonaws.com, lambda.amazonaws.com, another AWS account) and Permissions Policy (WHAT the role can do once assumed). Roles do NOT have long-term credentials — they get temporary credentials via STS (Security Token Service). Use roles for: EC2, Lambda, ECS, EKS, cross-account access, workforce federation (Cognito). NEVER use IAM User access keys on EC2!', 4);

  s.packets = [pkt('role', 's3', 'GetObject via STS credentials', 'request')];
  s.nodes[4].state = 'active'; s.nodes[3].state = 'active';
  s.events.push({ type: 'ok', msg: 'EC2 assumes role → STS issues: AccessKeyId + SecretAccessKey + SessionToken (1h default). SDK auto-refreshes.' });
  snap(steps, s, 'EC2 assumes the role: 1) Instance Metadata Service (IMDSv2 at http://169.254.169.254) returns temporary credentials. 2) AWS SDK inside the instance uses these to sign API calls. 3) Temporary credentials expire (default 1h, configure max 12h). 4) SDK automatically refreshes before expiry. NO hardcoded secrets! Benefits: automatic credential rotation, granular permissions per EC2, audit trail via CloudTrail (who assumed which role).', 5);

  s.events.push({ type: 'info', msg: 'Policy evaluation: SCP → Resource Policy → Identity Policy → explicit DENY always overrides Allow.' });
  s.nodes[5].state = 'active'; s.metrics.scps = 1;
  snap(steps, s, 'IAM Policy Evaluation Order: 1) SCP (Organization): if DENY → blocked. 2) Resource-based policy (e.g., S3 bucket policy). 3) Identity-based policy (user/group/role). 4) Final: if ANY DENY → DENIED. If ALLOW + no DENY → ALLOWED. If neither → DENIED. Explicit DENY always wins! Example: S3 bucket policy says "Deny if not MFA" → even with s3:GetObject → DENIED.', 6);

  s.packets = [];
  s.events.push({ type: 'ok', msg: 'Policy JSON: Version, Statement[]. Effect: Allow/Deny. Action: ["s3:GetObject"]. Resource: "arn:aws:s3:::bucket/*". Condition: {"IpAddress": {"aws:SourceIp": "10.0.0.0/8"}}' });
  snap(steps, s, 'IAM Policy structure: { "Version": "2012-10-17", "Statement": [ { "Effect": "Allow", "Action": ["s3:GetObject", "s3:ListBucket"], "Resource": [...] } ] }. Condition keys: aws:SourceIp (IP), aws:RequestedRegion, aws:MultiFactorAuthPresent (MFA), s3:x-amz-server-side-encryption (require encryption), iam:PassedToService. Use IAM Policy Simulator to test policies before deploying.', 7);

  s.events.push({ type: 'warn', msg: 'Permission Boundary: Alice CAN have any S3 permissions BUT cannot create users or modify IAM roles. Boundary = "IAMFullAccess" but restricted.' });
  snap(steps, s, 'Permission Boundary: defines MAXIMUM permissions a user/role can have. Even with AdministratorAccess, the boundary blocks everything outside. Use for: delegating IAM admin to developers, multi-tenant environments. Effective = identity policy ∩ permission boundary − DENY. Example: identity policy allows ec2:* and s3:*, boundary allows s3:* → effective is s3:* only. Cannot be bypassed by the user.', 8);

  s.events.push({ type: 'ok', msg: 'Service Control Policy (SCP): applied at Organization level (root/OU). Alice\'s account: SCP blocks all EC2 actions. Even admin can\'t launch EC2!' });
  snap(steps, s, 'SCP = Organization-level guardrails. Applied via AWS Organizations to root OU → member accounts. SCPs FILTER — they don\'t GRANT. SCP says "EC2 not allowed" → even admin with AdministratorAccess can\'t use EC2. Affects ALL users including root! Common SCPs: prohibit leaving organization, restrict regions, require encryption, block root user actions, restrict expensive instance types. SCP ≠ IAM — effective = SCP ∩ IAM.', 9);

  s.events.push({ type: 'info', msg: 'IAM Access Analyzer: found unused S3 bucket (no access for 30d), unused IAM role (never assumed), unused policy.' });
  snap(steps, s, 'IAM Access Analyzer: finds resources shared with external entities (unintended public access). Analyzes: S3 buckets, KMS keys, IAM roles, Lambda, SQS. Results: "Bucket my-app-data is accessible from internet due to bucket policy allowing Principal *". Also finds: unused access (recommendations to remove), policy validation (syntax + security checks). Enable on account or organization level. Scan all resources before deploying to production.', 10);

  s.events.push({ type: 'ok', msg: 'IAM PassRole: critical! User can launch EC2 with role X only if ec2:RunInstances + iam:PassRole. Prevents privilege escalation.' });
  snap(steps, s, 'iam:PassRole = one of the most important permissions. Allows a user to pass a role to an AWS service. Example: user launches EC2 → needs ec2:RunInstances AND iam:PassRole (for the instance profile role). WITHOUT PassRole: user could launch EC2 with any role (including admin role!) → privilege escalation. Best practice: restrict iam:PassRole to specific roles only (iam:PassedToService condition): "resource": "arn:aws:iam::*:role/ec2-*". Monitor PassRole usage in CloudTrail.', 11);

  s.events.push({ type: 'info', msg: 'IAM Roles Anywhere: on-prem server gets temporary credentials via IAM Role. Uses X.509 certificate for trust.' });
  snap(steps, s, 'IAM Roles Anywhere: extend IAM to on-premise servers. How: 1) Create a trust anchor (X.509 certificate from your CA). 2) Create a profile linked to IAM role. 3) Install Roles Anywhere agent on-prem. 4) Agent presents certificate → gets temporary AWS credentials (via STS). Benefits: no long-term access keys on-prem, automatic rotation, CloudTrail audit. Use for: hybrid workloads, migration scenarios, workloads that can\'t move to AWS yet.', 12);

  s.events.push({ type: 'ok', msg: 'ABAC (Attribute-Based Access Control): "Allow if resource.tag.owner = principal.tag.owner". Dynamic permissions based on tags. Scales better than RBAC.' });
  snap(steps, s, 'ABAC vs RBAC: Role-Based (RBAC): 100 users × 10 roles → 1000 policy attachments. Attribute-Based (ABAC): 1 policy with condition: "resource.tag.owner = aws:PrincipalTag/owner". Users and resources tagged with same owner → dynamic permission. Scales to thousands of users with zero policy changes. Condition keys: aws:PrincipalTag/${TagKey}, aws:ResourceTag/${TagKey}. Use with IAM Identity Center + external IdP (OKTA, Azure AD) for user attributes.', 13);

  s.events.push({ type: 'info', msg: 'IAM Identity Center (SSO): login once → access multiple AWS accounts + apps. OKTA/Azure AD integration. No individual IAM users needed.' });
  snap(steps, s, 'IAM Identity Center (formerly AWS SSO): centralized access management across AWS accounts + business applications. Features: SSO to ALL accounts in Organization, integrates with external IdP (Microsoft Entra ID, OKTA, OneLogin, AD FS), Permission Sets (pre-defined IAM policies for accounts), ABAC (user attributes from IdP). Never create IAM users in individual accounts — manage centrally via Identity Center. Creates "sso-*" users in member accounts automatically.', 14);

  s.result = 'IAM: User→Group→Policy. Service→Role(trust+permissions). SCP→PermissionBoundary→IAM→DENY wins.';
  snap(steps, s, 'Key practices: 1) Least privilege = minimum actions + specific resources + conditions. 2) Use groups for humans, roles for services. 3) SCPs for org-wide guardrails, Permission Boundaries for delegated admin. 4) IAM Access Analyzer to detect unintended public access. 5) Enable CloudTrail for all IAM actions. 6) Use IAM Identity Center instead of individual IAM users. 7) Require MFA for all human users. 8) Rotate access keys every 90 days. 9) Restrict iam:PassRole to specific roles. 10) ABAC for large-scale permission management.', 15);

  return steps;
}

const CODE = [
  '# Create user + add to group',
  'aws iam create-user --user-name alice',
  'aws iam add-user-to-group --user-name alice --group-name developers',
  '# Create role for EC2',
  'aws iam create-role --role-name ec2-s3-read --assume-role-policy-document file://trust.json',
  '# Attach managed policy to role',
  'aws iam attach-role-policy --role-name ec2-s3-read --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess',
  '# Set permission boundary',
  'aws iam put-user-permissions-boundary --user-name alice --permissions-boundary arn:aws:iam::aws:policy/PowerUserAccess',
  '# IAM Access Analyzer',
  'aws accessanalyzer create-analyzer --analyzer-name my-analyzer --type ACCOUNT',
  '# IAM Roles Anywhere (on-prem)',
  'aws rolesanywhere create-profile --name on-prem --role-arns <arn>',
  '# ABAC policy (tag-based)',
  '# Condition: "StringEquals": {"aws:ResourceTag/owner": "${aws:PrincipalTag/owner}"}',
  '# IAM Identity Center (SSO)',
  'aws sso-admin create-permission-set --name PowerUser',
  '# Restrict PassRole to specific roles only',
  '# "Condition": {"StringEquals": {"iam:PassedToService": "ec2.amazonaws.com"}}',
];

export default {
  id: 'iam', label: 'IAM', icon: '🔐',
  build: buildIAMSteps, code: CODE, language: 'CLI',
  metrics: [
    { key: 'users',    label: 'Users',    max: 5, color: 'var(--node-default)' },
    { key: 'roles',    label: 'Roles',    max: 5, color: 'var(--node-path)' },
    { key: 'policies', label: 'Policies', max: 5, color: 'var(--pod-running)' },
    { key: 'scps',     label: 'SCPs',     max: 3, color: 'var(--node-comparing)' },
  ],
  topicContent: {
    concept: [
      { title: 'IAM Core Components', content: 'Users (long-term human identity), Groups (collection of users with shared policies), Roles (temporary service identity with trust + permissions policies), Policies (JSON permission documents).' },
      { title: 'Policy Evaluation Logic', content: 'SCP → Resource Policy → Identity Policy → explicit DENY always wins. If no ALLOW and no DENY → DENIED by default. Permission Boundary sets a maximum ceiling on permissions.' },
    ],
    why: ['IAM is the security foundation of AWS — misconfigured IAM is the #1 cause of AWS security breaches. Understanding least privilege and policy evaluation is non-negotiable.'],
    interview: [
      { question: 'What is the difference between an IAM Role and an IAM User?', answer: 'IAM User has long-term credentials (password, access keys) for a human or application. IAM Role has temporary credentials via STS (assumed by services like EC2, Lambda). Roles do not have static credentials — they are assumed.', followUps: ['How do temporary credentials work?', 'Can an IAM user assume a role?'] },
      { question: 'What is iam:PassRole and why is it important?', answer: 'Allows a user to pass a role to an AWS service (e.g., EC2 launch with a role). Without restricting PassRole, a user could launch EC2 with an admin role and escalate privileges. Always restrict to specific roles.', followUps: ['What happens without PassRole permissions?', 'How do you restrict PassRole to specific roles?'] },
    ],
    gotcha: ['SCPs affect ALL users including the root user — a badly written SCP can lock out the entire organization. Always test SCPs on a test OU first.', 'Access keys are long-term and hard to rotate — prefer IAM Roles with temporary credentials (via STS) for all automated access. Use IAM Roles Anywhere for on-prem workloads.'],
    tradeoffs: [
      { pro: 'Fine-grained access control with conditions (IP, time, MFA, tags) enables comprehensive security postures.', con: 'Policy complexity grows quickly — hundreds of policies across multiple accounts are hard to audit. Use IAM Access Analyzer and automated policy validation.' },
      { pro: 'IAM Identity Center (SSO) centralizes access management across accounts and integrates with external IdPs (OKTA, Azure AD).', con: 'ABAC requires careful tag governance — if tags are misused, permissions become unpredictable. RBAC is simpler for smaller organizations.' },
    ],
  },
};
