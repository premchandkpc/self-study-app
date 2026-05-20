import { IOC_SCENARIOS } from './scenarios/ioc';
import { MVC_SCENARIOS } from './scenarios/mvc';
import { AOP_SCENARIOS } from './scenarios/aop';
import { TRANSACTION_SCENARIOS } from './scenarios/transaction';
import { SECURITY_SCENARIOS } from './scenarios/security';
import { JPA_SCENARIOS } from './scenarios/jpa';
import { AUTOCONFIG_SCENARIOS } from './scenarios/autoconfig';
import { CLOUD_SCENARIOS } from './scenarios/cloud';

export const SPRING_SCENARIOS = [
  ...IOC_SCENARIOS,
  ...MVC_SCENARIOS,
  ...AOP_SCENARIOS,
  ...TRANSACTION_SCENARIOS,
  ...SECURITY_SCENARIOS,
  ...JPA_SCENARIOS,
  ...AUTOCONFIG_SCENARIOS,
  ...CLOUD_SCENARIOS,
];

export const SPRING_CATEGORIES = [
  { key: 'ioc', label: 'IoC / DI', icon: '🔄' },
  { key: 'mvc', label: 'Spring MVC', icon: '🌐' },
  { key: 'aop', label: 'AOP / Proxies', icon: '🎭' },
  { key: 'transaction', label: 'Transactions', icon: '📦' },
  { key: 'security', label: 'Security', icon: '🔒' },
  { key: 'jpa', label: 'Data JPA', icon: '🗃️' },
  { key: 'autoconfig', label: 'Auto-Config', icon: '⚙️' },
  { key: 'cloud', label: 'Spring Cloud', icon: '☁️' },
];
