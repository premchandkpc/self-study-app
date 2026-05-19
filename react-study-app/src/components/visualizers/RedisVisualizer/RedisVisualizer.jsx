import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import { SCENARIOS } from './redis-engine';
import ScenarioToolbar from '../../shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../shared/StepControls/StepControls';
import ComplexityPanel from '../../shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import VariablesPanel from '../../shared/VariablesPanel/VariablesPanel';
import styles from './RedisVisualizer.module.css';

const TYPE_COLOR = {
  string: 'var(--pod-running)',
  list:   'var(--kafka-producer)',
  hash:   'var(--node-comparing)',
  set:    'var(--node-active)',
  zset:   'var(--node-visited, var(--kafka-consumer))',
};

export default function RedisVisualizer() {
  const { activeId, active, viz, select, metrics } = useVisualizerScenario(SCENARIOS);

  if (!viz) return null;

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={SCENARIOS} active={activeId} onChange={select} />

      <div className={styles.mainArea}>
        <div className={styles.vizArea}>
          {activeId === 'data-types' && <DataTypesView viz={viz} />}
          {activeId === 'pub-sub'    && <PubSubView viz={viz} />}
          {activeId === 'cluster'    && <ClusterView viz={viz} />}
          {activeId === 'pipeline'   && <PipelineView viz={viz} />}
        </div>

        <div className={styles.sidePanel}>
          <VariablesPanel vars={viz?.vars} result={viz?.result} />

          {viz.events?.length > 0 && (
            <div className={styles.events}>
              <div className={styles.eventsLabel}>Redis Commands</div>
              {viz.events.slice(-5).map((ev, i) => (
                <div key={i} className={`${styles.event} ${styles[`ev-${ev.type}`]}`}>
                  <span className={styles.evDot} />
                  <span className={styles.evMsg}>{ev.msg}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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

/* ========== DATA TYPES VIEW ========== */
function DataTypesView({ viz }) {
  const store = viz.store || {};

  return (
    <div className={styles.dataTypesGrid}>
      {Object.entries(store).map(([key, entry]) => (
        <KeyCard key={key} redisKey={key} entry={entry} isActive={key === viz.activeKey || entry.active} />
      ))}
      {Object.keys(store).length === 0 && (
        <div className={styles.emptyStore}>Redis store is empty. Commands will populate it...</div>
      )}
      {viz.command && (
        <div className={styles.commandBar}>
          <span className={styles.commandPrompt}>redis&gt;</span>
          <span className={styles.commandText}>{viz.command}</span>
          {viz.result && <span className={styles.commandResult}>→ {viz.result}</span>}
        </div>
      )}
    </div>
  );
}

function KeyCard({ redisKey, entry, isActive }) {
  const color = TYPE_COLOR[entry.type] || 'var(--node-default)';

  return (
    <div className={`${styles.keyCard} ${isActive ? styles.keyCardActive : ''}`} style={{ '--key-color': color }}>
      <div className={styles.keyCardHeader}>
        <span className={styles.keyName}>{redisKey}</span>
        <span className={styles.typeBadge} style={{ background: `color-mix(in srgb, ${color} 20%, transparent)`, borderColor: color, color }}>
          {entry.type}
        </span>
      </div>
      <div className={styles.keyCardValue}>
        <KeyValue entry={entry} />
      </div>
    </div>
  );
}

function KeyValue({ entry }) {
  if (entry.type === 'string') {
    return <span className={styles.strVal}>"{entry.val}"</span>;
  }
  if (entry.type === 'list') {
    return (
      <div className={styles.listVal}>
        {entry.val.map((v, i) => (
          <span key={i} className={styles.listItem}>{v}</span>
        ))}
      </div>
    );
  }
  if (entry.type === 'hash') {
    return (
      <div className={styles.hashVal}>
        {Object.entries(entry.val).map(([k, v]) => (
          <div key={k} className={styles.hashField}>
            <span className={styles.hashFieldKey}>{k}:</span>
            <span className={styles.hashFieldVal}>{String(v)}</span>
          </div>
        ))}
      </div>
    );
  }
  if (entry.type === 'set') {
    return (
      <div className={styles.setVal}>
        {'{'}
        {entry.val.map((v, i) => (
          <span key={i} className={styles.setMember}>{v}{i < entry.val.length - 1 ? ', ' : ''}</span>
        ))}
        {'}'}
      </div>
    );
  }
  if (entry.type === 'zset') {
    return (
      <div className={styles.zsetVal}>
        {entry.val.map((item, i) => (
          <div key={i} className={styles.zsetItem}>
            <span className={styles.zsetRank}>#{i + 1}</span>
            <span className={styles.zsetMember}>{item.member}</span>
            <span className={styles.zsetScore}>{item.score}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

/* ========== PUB/SUB VIEW ========== */
function PubSubView({ viz }) {
  const channels = viz.channels || [];
  const subscribers = viz.subscribers || [];
  const pub = viz.publisher;

  return (
    <div className={styles.pubSubLayout}>
      {/* Publisher */}
      <div className={styles.pubSubCol}>
        <div className={styles.pubSubLabel}>Publisher</div>
        <div className={`${styles.pubNode} ${pub?.sending ? styles.pubNodeSending : ''}`}>
          <div className={styles.pubNodeId}>{pub?.id}</div>
          {pub?.sending && (
            <div className={styles.pubSending}>
              PUBLISH {pub.sending}
            </div>
          )}
          <div className={styles.pubChannels}>
            {pub?.channels.map((ch) => (
              <span key={ch} className={styles.channelTag}>{ch}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Channels */}
      <div className={styles.pubSubCol}>
        <div className={styles.pubSubLabel}>Channels</div>
        {channels.map((ch) => (
          <div key={ch.name} className={`${styles.channelNode} ${pub?.sending === ch.name ? styles.channelActive : ''}`}>
            <div className={styles.channelName}>{ch.name}</div>
            <div className={styles.channelSubs}>{ch.subscribers.length} subscribers</div>
            {viz.message?.channel === ch.name && (
              <div className={styles.messageChip}>{viz.message.text.slice(0, 24)}…</div>
            )}
          </div>
        ))}
      </div>

      {/* Subscribers */}
      <div className={styles.pubSubCol}>
        <div className={styles.pubSubLabel}>Subscribers</div>
        {subscribers.map((sub) => (
          <div key={sub.id} className={`${styles.subNode} ${sub.active ? styles.subNodeActive : ''}`}>
            <div className={styles.subHeader}>
              <span className={styles.subId}>{sub.id}</span>
              <div className={styles.subChannels}>
                {sub.subscribed.map((ch) => (
                  <span key={ch} className={styles.channelTag}>{ch}</span>
                ))}
              </div>
            </div>
            {sub.received.length > 0 && (
              <div className={styles.receivedMsgs}>
                {sub.received.slice(-2).map((msg, i) => (
                  <div key={i} className={styles.receivedMsg}>
                    <span className={styles.receivedCh}>[{msg.channel}]</span>
                    <span className={styles.receivedText}>{msg.text.slice(0, 20)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ========== CLUSTER VIEW ========== */
function ClusterView({ viz }) {
  const masters  = (viz.nodes || []).filter((n) => n.role === 'master');
  const replicas = (viz.nodes || []).filter((n) => n.role === 'replica');

  return (
    <div className={styles.clusterLayout}>
      {viz.hashSlot !== null && (
        <div className={styles.routingBar}>
          <span className={styles.routingKey}>Key: <b>{viz.key}</b></span>
          <span className={styles.routingArrow}>→</span>
          <span className={styles.routingSlot}>slot {viz.hashSlot}</span>
          <span className={styles.routingArrow}>→</span>
          <span className={styles.routingNode}>{viz.targetNode}</span>
        </div>
      )}

      <div className={styles.clusterTier}>
        <div className={styles.clusterTierLabel}>Masters</div>
        <div className={styles.clusterNodes}>
          {masters.map((node) => (
            <ClusterNode key={node.id} node={node} isTarget={node.id === viz.targetNode} />
          ))}
        </div>
      </div>

      <div className={styles.clusterReplication}>
        <div className={styles.repLabel}>Async Replication</div>
        <div className={styles.repLines}>
          {masters.map((m) => (
            <div key={m.id} className={styles.repLine}>{m.id} → R{m.id.slice(1)}</div>
          ))}
        </div>
      </div>

      <div className={styles.clusterTier}>
        <div className={styles.clusterTierLabel}>Replicas</div>
        <div className={styles.clusterNodes}>
          {replicas.map((node) => (
            <ClusterNode key={node.id} node={node} isTarget={false} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ClusterNode({ node, isTarget }) {
  const isDown  = node.state === 'down';
  const isMaster = node.role === 'master';

  return (
    <div
      className={`${styles.clusterNode} ${isTarget ? styles.clusterNodeTarget : ''} ${isDown ? styles.clusterNodeDown : ''}`}
      style={{ '--cn-color': isDown ? 'var(--pod-crash)' : isMaster ? 'var(--node-active)' : 'var(--node-default)' }}
    >
      <div className={styles.cnHeader}>
        <span className={styles.cnId}>{node.id}</span>
        {isDown && <span className={styles.cnDown}>DOWN</span>}
        {!isDown && isMaster && <span className={styles.cnRole}>M</span>}
        {!isDown && !isMaster && <span className={styles.cnRoleReplica}>R</span>}
      </div>
      <div className={styles.cnSlots}>
        slots {node.slots[0]}–{node.slots[1]}
      </div>
      <div className={styles.cnKeys}>{node.keys} keys</div>
    </div>
  );
}

/* ========== PIPELINE VIEW ========== */
function PipelineView({ viz }) {
  const cmds = viz.commands || [];
  const isSeq = viz.mode === 'sequential';

  return (
    <div className={styles.pipelineLayout}>
      <div className={styles.pipelineModeBar}>
        <span className={`${styles.modeChip} ${isSeq ? styles.modeSeq : styles.modePipe}`}>
          {isSeq ? '🐢 Sequential (1 cmd / RTT)' : '⚡ Pipelined (all cmds / 1 RTT)'}
        </span>
        {viz.totalRtt > 0 && (
          <span className={styles.rttDisplay}>Total RTT: <b>{viz.totalRtt}ms</b></span>
        )}
        {viz.metrics?.savings > 0 && (
          <span className={styles.savingsDisplay}>{viz.metrics.savings}% saved</span>
        )}
      </div>

      <div className={styles.pipelineTimeline}>
        <div className={styles.timelineLabel}>Client</div>
        <div className={styles.timelineLabel}>Server</div>

        {cmds.map((cmd) => (
          <div key={cmd.id} className={styles.timelineRow}>
            <div className={`${styles.tlCmd} ${cmd.sent ? styles.tlCmdSent : ''}`}>
              {cmd.sent ? cmd.cmd : '...'}
            </div>
            <div className={`${styles.tlRtt} ${cmd.waitingRTT ? styles.tlRttWaiting : ''} ${cmd.received ? styles.tlRttDone : ''}`}>
              {cmd.waitingRTT ? '←→ RTT' : cmd.received ? '✓' : '—'}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.pipelineComparison}>
        <div className={styles.compItem}>
          <span className={styles.compLabel}>Sequential</span>
          <div className={styles.compBar}>
            <div className={styles.compFill} style={{ width: '100%', background: 'var(--node-comparing)' }} />
          </div>
          <span className={styles.compVal}>500ms</span>
        </div>
        <div className={styles.compItem}>
          <span className={styles.compLabel}>Pipeline</span>
          <div className={styles.compBar}>
            <div className={styles.compFill} style={{ width: '20%', background: 'var(--pod-running)' }} />
          </div>
          <span className={styles.compVal}>100ms</span>
        </div>
      </div>
    </div>
  );
}
