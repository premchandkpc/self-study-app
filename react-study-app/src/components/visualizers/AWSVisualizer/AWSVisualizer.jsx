import { useEffect, useState } from 'react';
import { useSimulation } from '../../../core/context/SimulationContext';
import { buildAWSSteps, AWS_CODE } from './aws-engine';
import StepControls from '../../shared/StepControls/StepControls';
import NarrationPanel from '../../shared/NarrationPanel/NarrationPanel';
import ComplexityPanel from '../../shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import Button from '../../shared/Button/Button';
import styles from './AWSVisualizer.module.css';

const SCENARIOS = [
  { id: 'lambda', label: 'Lambda',      icon: '⚡' },
  { id: 'sqs',    label: 'SQS',         icon: '📬' },
  { id: 'apigw',  label: 'API Gateway', icon: '🚪' },
  { id: 'eks',    label: 'EKS',         icon: '☸️' },
];

const NODE_COLORS = {
  client:  'var(--node-default)',
  server:  'var(--node-visited)',
  lambda:  'var(--node-comparing)',
  apigw:   'var(--kafka-producer)',
  auth:    'var(--node-blocked)',
  db:      'var(--pod-running)',
  queue:   'var(--node-comparing)',
  dlq:     'var(--pod-crash)',
};

const NODE_ICONS = {
  client:  '👤',
  server:  '🖥',
  lambda:  'λ',
  apigw:   '🚪',
  auth:    '🔐',
  db:      '🗄',
  queue:   '📬',
  dlq:     '💀',
};

const SVG_W = 700;
const SVG_H = 380;

export default function AWSVisualizer() {
  const { state, dispatch } = useSimulation();
  const [scenario, setScenario] = useState('lambda');
  const [viz, setViz] = useState(null);

  function init(sc) {
    setScenario(sc);
    dispatch({ type: 'RESET' });
    dispatch({ type: 'SET_STEPS', payload: buildAWSSteps(sc) });
  }

  useEffect(() => { init('lambda'); }, []);

  useEffect(() => {
    const step = state.steps[state.currentStep];
    if (step) setViz(step);
  }, [state.currentStep, state.steps]);

  if (!viz) return null;

  const metrics = buildMetrics(scenario, viz.metrics || {});

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <div className={styles.tabs}>
          {SCENARIOS.map((sc) => (
            <Button key={sc.id} variant={scenario === sc.id ? 'primary' : 'ghost'} size="sm" icon={sc.icon} onClick={() => init(sc.id)}>
              {sc.label}
            </Button>
          ))}
        </div>
        <NarrationPanel />
      </div>

      {/* SVG diagram */}
      <div className={styles.svgWrap}>
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className={styles.svg} preserveAspectRatio="xMidYMid meet">
          <defs>
            <marker id="aws-arrow" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="var(--border)" />
            </marker>
            <marker id="aws-arrow-active" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="var(--node-active)" />
            </marker>
          </defs>

          {(viz.edges || []).map((edge) => {
            const from = viz.nodes?.find((n) => n.id === edge.from);
            const to   = viz.nodes?.find((n) => n.id === edge.to);
            if (!from || !to) return null;
            const hasPacket = (viz.packets || []).some((p) =>
              (p.from === edge.from && p.to === edge.to) || (p.from === edge.to && p.to === edge.from)
            );
            return (
              <line
                key={`${edge.from}-${edge.to}`}
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={hasPacket ? 'var(--node-active)' : 'var(--border)'}
                strokeWidth={hasPacket ? 2 : 1}
                strokeDasharray={hasPacket ? '6 3' : 'none'}
                markerEnd={hasPacket ? 'url(#aws-arrow-active)' : 'url(#aws-arrow)'}
                className={hasPacket ? styles.edgeActive : ''}
              />
            );
          })}

          {(viz.nodes || []).map((node) => <AWSNode key={node.id} node={node} />)}

          {(viz.packets || []).map((pkt) => {
            const from = viz.nodes?.find((n) => n.id === pkt.from);
            const to   = viz.nodes?.find((n) => n.id === pkt.to);
            if (!from || !to) return null;
            return (
              <g key={pkt.id}>
                <circle cx={(from.x + to.x) / 2} cy={(from.y + to.y) / 2} r={7}
                  fill={pkt.type === 'response' ? 'var(--pod-running)' : 'var(--node-active)'}
                  className={styles.packet} />
                <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 12}
                  textAnchor="middle" fontSize="8" fill="var(--node-active)" fontFamily="var(--font-mono)"
                >{pkt.label}</text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Lambda containers panel */}
      {scenario === 'lambda' && viz.lambdaContainers?.length > 0 && (
        <div className={styles.containersBar}>
          <span className={styles.containersLabel}>Lambda Containers</span>
          {viz.lambdaContainers.map((c) => (
            <div key={c.id} className={`${styles.container} ${c.warm ? styles.containerWarm : styles.containerCold}`}>
              {c.warm ? '♨️' : '❄️'} {c.id}
              <span className={styles.containerAge}>{c.age}s</span>
            </div>
          ))}
        </div>
      )}

      {/* SQS messages panel */}
      {scenario === 'sqs' && <SQSPanel nodes={viz.nodes} />}

      {viz.events?.length > 0 && (
        <div className={styles.events}>
          <div className={styles.eventsLabel}>AWS Events</div>
          {viz.events.slice(-4).map((ev, i) => (
            <div key={i} className={`${styles.event} ${styles[`ev-${ev.type}`]}`}>
              <span className={styles.evDot} /> {ev.msg}
            </div>
          ))}
        </div>
      )}

      <div className={styles.bottom}>
        <CodePanel code={AWS_CODE[scenario] || []} language="YAML/CLI" />
        <div className={styles.rightPanels}>
          <MetricsPanel metrics={metrics} />
          <ComplexityPanel />
        </div>
      </div>

      <StepControls />
    </div>
  );
}

function AWSNode({ node }) {
  const color = NODE_COLORS[node.type] || 'var(--node-default)';
  const icon  = NODE_ICONS[node.type]  || '●';
  const W = 100, H = 50;
  const x = node.x - W / 2, y = node.y - H / 2;
  const stateColor = node.state === 'active' ? 'var(--node-active)' : node.state === 'error' || node.state === 'warn' ? 'var(--pod-crash)' : node.state === 'cold' ? 'var(--node-default)' : color;

  return (
    <g>
      <rect x={x} y={y} width={W} height={H} rx={8}
        fill={`color-mix(in srgb, ${stateColor} 15%, transparent)`}
        stroke={stateColor}
        strokeWidth={node.state === 'active' ? 2 : 1}
        className={node.state === 'active' ? styles.nodeActive : node.state === 'cold' ? styles.nodeCold : ''}
      />
      <text x={node.x} y={node.y - 8} textAnchor="middle" fontSize="14">{icon}</text>
      <text x={node.x} y={node.y + 8} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill="var(--text-primary)" fontWeight="600">
        {node.label?.split('\n')[0]}
      </text>
      {node.label?.includes('\n') && (
        <text x={node.x} y={node.y + 20} textAnchor="middle" fontSize="8" fontFamily="var(--font-mono)" fill="var(--text-muted)">
          {node.label.split('\n')[1]}
        </text>
      )}
      {node.instances > 0 && (
        <text x={node.x + W / 2 - 2} y={y + 12} textAnchor="end" fontSize="9" fill="var(--pod-running)">×{node.instances}</text>
      )}
      {node.state === 'cold' && (
        <text x={node.x} y={y - 6} textAnchor="middle" fontSize="9" fill="var(--node-default)">❄️ COLD</text>
      )}
    </g>
  );
}

function SQSPanel({ nodes }) {
  const sqsNode = nodes?.find((n) => n.type === 'queue');
  const dlqNode = nodes?.find((n) => n.type === 'dlq');
  if (!sqsNode) return null;
  return (
    <div className={styles.sqsPanel}>
      <div className={styles.sqsQueue}>
        <span className={styles.sqsLabel}>SQS Queue ({sqsNode.messages?.length || 0} msgs)</span>
        <div className={styles.sqsMessages}>
          {sqsNode.messages?.map((m, i) => (
            <div key={i} className={`${styles.sqsMsg} ${m.inflight ? styles.sqsMsgInflight : ''}`}>
              <span>{m.id}</span>
              {m.retries > 0 && <span className={styles.sqsRetry}>retry:{m.retries}</span>}
              {m.inflight && <span className={styles.sqsInflight}>in-flight</span>}
            </div>
          ))}
          {(!sqsNode.messages || sqsNode.messages.length === 0) && <span className={styles.sqsEmpty}>empty</span>}
        </div>
      </div>
      {dlqNode?.messages?.length > 0 && (
        <div className={styles.dlqQueue}>
          <span className={styles.dlqLabel}>DLQ ({dlqNode.messages.length})</span>
          {dlqNode.messages.map((m, i) => (
            <div key={i} className={styles.dlqMsg}>{m.id} (retried {m.retries}x)</div>
          ))}
        </div>
      )}
    </div>
  );
}

function buildMetrics(scenario, m) {
  if (scenario === 'lambda') return [
    { label: 'Requests',   value: m.requests   || 0, max: 5,   unit: '',   color: 'var(--node-default)' },
    { label: 'Cold Starts',value: m.coldStarts || 0, max: 5,   unit: '',   color: 'var(--pod-crash)', warn: 20, critical: 40 },
    { label: 'P99 (ms)',   value: m.p99ms      || 0, max: 1000, unit: 'ms', color: 'var(--node-comparing)' },
  ];
  if (scenario === 'sqs') return [
    { label: 'Sent',     value: m.sent     || 0, max: 5, unit: '', color: 'var(--node-default)' },
    { label: 'Received', value: m.received || 0, max: 5, unit: '', color: 'var(--pod-running)' },
    { label: 'DLQ',      value: m.dlq      || 0, max: 3, unit: '', color: 'var(--pod-crash)' },
  ];
  if (scenario === 'apigw') return [
    { label: 'Requests',  value: m.requests  || 0, max: 10,   unit: '',     color: 'var(--node-default)' },
    { label: 'Throttled', value: m.throttled || 0, max: 5,    unit: '',     color: 'var(--pod-crash)' },
    { label: 'P50 (ms)',  value: m.p50ms     || 0, max: 100,  unit: 'ms',   color: 'var(--pod-running)' },
  ];
  if (scenario === 'eks') return [
    { label: 'Nodes', value: m.nodes || 0, max: 6,   unit: '',  color: 'var(--node-default)' },
    { label: 'Pods',  value: m.pods  || 0, max: 10,  unit: '',  color: 'var(--pod-running)' },
    { label: 'CPU %', value: m.cpu   || 0, max: 100, unit: '%', color: 'var(--node-comparing)', warn: 60, critical: 85 },
  ];
  return [];
}
