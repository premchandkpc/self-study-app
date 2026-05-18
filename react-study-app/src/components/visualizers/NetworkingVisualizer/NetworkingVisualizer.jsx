import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import { SCENARIOS } from './networking-engine';
import ScenarioToolbar from '../../shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../shared/StepControls/StepControls';
import ComplexityPanel from '../../shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import VariablesPanel from '../../shared/VariablesPanel/VariablesPanel';
import styles from './NetworkingVisualizer.module.css';

export default function NetworkingVisualizer() {
  const { activeId, active, viz, select, metrics } = useVisualizerScenario(SCENARIOS);

  if (!viz) return null;

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={SCENARIOS} active={activeId} onChange={select} />

      <div className={styles.vizArea}>
        <div className={styles.mainViz}>
          {activeId === 'tcp-handshake' && <TcpView viz={viz} />}
          {activeId === 'http'          && <HttpView viz={viz} />}
          {activeId === 'dns'           && <DnsView  viz={viz} />}
          {activeId === 'load-balancer' && <LBView   viz={viz} />}
        </div>

        <div className={styles.sidePanel}>
          <VariablesPanel vars={viz?.vars} />

          {viz.events?.length > 0 && (
            <div className={styles.events}>
              <div className={styles.eventsLabel}>Network Events</div>
              {viz.events.slice(-5).map((ev, i) => (
                <div key={i} className={`${styles.event} ${styles[`ev-${ev.type}`]}`}>
                  <span className={styles.evDot} />{ev.msg}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {viz.narration && (
        <div className={styles.narration}>{viz.narration}</div>
      )}

      <div className={styles.bottomPanels}>
        <CodePanel code={active.code} language={active.language} />
        <div className={styles.rightPanels}>
          <MetricsPanel metrics={metrics} />
          <ComplexityPanel />
        </div>
      </div>

      <StepControls />
    </div>
  );
}

/* === TCP VIEW === */
const TCP_STATE_COLOR = {
  CLOSED:       'var(--text-faint)',
  LISTEN:       'var(--node-default)',
  SYN_SENT:     'var(--node-comparing)',
  SYN_RCVD:     'var(--node-comparing)',
  ESTABLISHED:  'var(--pod-running)',
  FIN_WAIT_1:   'var(--kafka-producer)',
  FIN_WAIT_2:   'var(--kafka-producer)',
  CLOSE_WAIT:   'var(--node-comparing)',
  LAST_ACK:     'var(--node-comparing)',
  TIME_WAIT:    'var(--node-active)',
};

const PACKET_COLOR = {
  SYN:      'var(--node-comparing)',
  'SYN-ACK':'var(--kafka-producer)',
  ACK:      'var(--pod-running)',
  DATA:     'var(--node-active)',
  'DATA+ACK':'var(--node-active)',
  FIN:      'var(--pod-crash)',
};

function TcpView({ viz }) {
  const { client, server, packets } = viz;

  return (
    <div className={styles.tcpLayout}>
      <div className={styles.tcpEndpoint}>
        <div className={styles.epIcon}>💻</div>
        <div className={styles.epLabel}>Client</div>
        <div
          className={styles.epState}
          style={{ color: TCP_STATE_COLOR[client?.state] || 'var(--text-faint)' }}
        >
          {client?.state}
        </div>
        <div className={styles.epSeq}>SEQ: {client?.seq}</div>
        <div className={styles.epSeq}>ACK: {client?.ack}</div>
      </div>

      <div className={styles.tcpChannel}>
        {packets?.map((pkt, i) => (
          <div
            key={i}
            className={`${styles.packet} ${pkt.from === 'client' ? styles.packetRight : styles.packetLeft} ${pkt.active ? styles.packetActive : ''}`}
            style={{ '--pkt-color': PACKET_COLOR[pkt.label] || 'var(--node-active)' }}
          >
            <span className={styles.packetLabel}>{pkt.label}</span>
            <span className={styles.packetFlags}>{pkt.flags}</span>
            <span className={styles.packetSeq}>seq={pkt.seq} ack={pkt.ack}</span>
          </div>
        ))}
        {(!packets || packets.length === 0) && (
          <div className={styles.channelIdle}>Channel idle</div>
        )}
      </div>

      <div className={styles.tcpEndpoint}>
        <div className={styles.epIcon}>🖥️</div>
        <div className={styles.epLabel}>Server</div>
        <div
          className={styles.epState}
          style={{ color: TCP_STATE_COLOR[server?.state] || 'var(--text-faint)' }}
        >
          {server?.state}
        </div>
        <div className={styles.epSeq}>SEQ: {server?.seq}</div>
        <div className={styles.epSeq}>ACK: {server?.ack}</div>
      </div>
    </div>
  );
}

/* === HTTP VIEW === */
function HttpView({ viz }) {
  const { version, http1Requests, http2Streams, connection } = viz;

  return (
    <div className={styles.httpLayout}>
      <div className={styles.httpPanel}>
        <div className={`${styles.httpPanelHeader} ${version === '1.1' ? styles.httpActive : ''}`}>
          HTTP/1.1
        </div>
        <div className={styles.httpRequests}>
          {(http1Requests || []).map((req) => (
            <div
              key={req.id}
              className={`${styles.httpReq} ${req.status === 'active' ? styles.httpReqActive : req.status === 'done' ? styles.httpReqDone : ''}`}
            >
              <span className={styles.httpReqNum}>#{req.id}</span>
              <span className={styles.httpReqRes}>{req.resource}</span>
              <span className={styles.httpReqStatus}>{req.status}</span>
            </div>
          ))}
          {(!http1Requests || http1Requests.length === 0) && (
            <div className={styles.httpEmpty}>Sequential requests appear here</div>
          )}
        </div>
        <div className={styles.httpNote}>Sequential — 1 at a time</div>
      </div>

      <div className={styles.httpVsSep}>VS</div>

      <div className={styles.httpPanel}>
        <div className={`${styles.httpPanelHeader} ${version === '2' ? styles.httpActive : ''}`}>
          HTTP/2
        </div>
        <div className={styles.httpStreams}>
          {(http2Streams || []).map((stream) => (
            <div
              key={stream.id}
              className={`${styles.httpStream} ${stream.status === 'active' ? styles.httpStreamActive : stream.status === 'done' ? styles.httpStreamDone : ''}`}
            >
              <span className={styles.streamId}>S{stream.id}</span>
              <div className={styles.streamBar}>
                <div
                  className={`${styles.streamFill} ${stream.status === 'done' ? styles.streamFillDone : ''}`}
                />
              </div>
              <span className={styles.streamRes}>{stream.resource}</span>
            </div>
          ))}
          {(!http2Streams || http2Streams.length === 0) && (
            <div className={styles.httpEmpty}>Parallel streams appear here</div>
          )}
        </div>
        <div className={styles.httpNote}>Multiplexed — all parallel</div>
      </div>
    </div>
  );
}

/* === DNS VIEW === */
const DNS_TYPE_COLOR = {
  cache:       'var(--pod-running)',
  resolver:    'var(--node-active)',
  nameserver:  'var(--node-comparing)',
};

function DnsView({ viz }) {
  const { chain, result, domain } = viz;

  return (
    <div className={styles.dnsLayout}>
      <div className={styles.dnsQuery}>
        <span className={styles.dnsQueryLabel}>Query:</span>
        <span className={styles.dnsQueryDomain}>{domain}</span>
      </div>

      <div className={styles.dnsChain}>
        {(chain || []).map((node, i) => (
          <div key={node.id} className={styles.dnsChainItem}>
            <div
              className={`${styles.dnsNode} ${node.active ? styles.dnsNodeActive : ''} ${node.resolved ? styles.dnsNodeResolved : ''}`}
              style={{ '--dns-color': DNS_TYPE_COLOR[node.type] || 'var(--node-default)' }}
            >
              <div className={styles.dnsNodeLabel}>{node.label}</div>
              <div className={styles.dnsNodeType}>{node.type}</div>
              {node.cached && <span className={styles.dnsCached}>cached</span>}
            </div>
            {i < chain.length - 1 && (
              <div className={`${styles.dnsArrow} ${node.resolved ? styles.dnsArrowResolved : ''}`}>→</div>
            )}
          </div>
        ))}
      </div>

      {result && (
        <div className={styles.dnsResult}>
          <span className={styles.dnsResultLabel}>Resolved</span>
          <span className={styles.dnsResultIp}>{result.ip}</span>
          <span className={styles.dnsResultTtl}>TTL: {result.ttl}s</span>
        </div>
      )}
    </div>
  );
}

/* === LOAD BALANCER VIEW === */
const ALGO_COLOR = {
  'round-robin':      'var(--node-active)',
  'least-connections': 'var(--node-comparing)',
  'ip-hash':          'var(--kafka-producer)',
};

function LBView({ viz }) {
  const { servers, algorithm, activeServer, activeRequest } = viz;

  return (
    <div className={styles.lbLayout}>
      <div className={styles.lbClient}>
        <div className={styles.lbClientIcon}>👤</div>
        <div className={styles.lbClientLabel}>Client</div>
        {activeRequest && <div className={styles.lbReqBadge}>Req #{activeRequest}</div>}
      </div>

      <div className={styles.lbArrowSection}>
        <div className={styles.lbArrow}>→</div>
        <div className={styles.lbBox}>
          <div className={styles.lbIcon}>⚖️</div>
          <div className={styles.lbName}>Load Balancer</div>
          <div
            className={styles.lbAlgo}
            style={{ color: ALGO_COLOR[algorithm] || 'var(--node-default)' }}
          >
            {algorithm}
          </div>
        </div>
        <div className={styles.lbArrow}>→</div>
      </div>

      <div className={styles.lbServers}>
        {(servers || []).map((srv) => (
          <div
            key={srv.id}
            className={`${styles.lbServer} ${srv.active ? styles.lbServerActive : ''} ${activeServer === srv.id ? styles.lbServerTarget : ''}`}
          >
            <div className={styles.lbServerId}>{srv.id}</div>
            <div className={styles.lbConnBar}>
              <div
                className={styles.lbConnFill}
                style={{ width: `${Math.min((srv.connections / 8) * 100, 100)}%` }}
              />
            </div>
            <div className={styles.lbConnCount}>{srv.connections} conn</div>
            <div className={styles.lbReqCount}>{srv.requests} req</div>
          </div>
        ))}
      </div>
    </div>
  );
}
