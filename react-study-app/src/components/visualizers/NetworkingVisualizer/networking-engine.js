import tcpHandshake  from './scenarios/tcp-handshake';
import http          from './scenarios/http';
import dns           from './scenarios/dns';
import loadBalancer  from './scenarios/load-balancer';

export const SCENARIOS = [tcpHandshake, http, dns, loadBalancer];
