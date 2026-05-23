import tcpHandshake  from './scenarios/tcp-handshake';
import http          from './scenarios/http';
import dns           from './scenarios/dns';
import loadBalancer  from './scenarios/load-balancer';
import tlsHandshake  from './scenarios/tls-handshake';

export const SCENARIOS = [tcpHandshake, tlsHandshake, http, dns, loadBalancer];
