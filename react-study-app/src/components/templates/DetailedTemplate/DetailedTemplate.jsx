import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import { SystemDiagramRenderer } from '../../renderers/SystemDiagramRenderer';
import { SvgEventsList } from '../../shared/SvgComponents.jsx';
import ScenarioToolbar from '../../shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../shared/StepControls/StepControls';
import NarrationPanel from '../../shared/NarrationPanel/NarrationPanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import ConceptPanel from '../../shared/ConceptPanel/ConceptPanel';
import styles from './DetailedTemplate.module.css';

export default function DetailedTemplate({ scenarios }) {
  const { activeId, active, viz, select, metrics } = useVisualizerScenario(scenarios);

  if (!viz) return null;

  const events = viz.events || [];
  const code = active?.code || [];
  const codeNotes = active?.codeNotes || [];
  const tradeoffs = active?.tradeoffs || [];
  const bestPractices = active?.bestPractices || [];
  const concepts = viz.concepts || [];

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={scenarios} active={activeId} onChange={select} />
      <NarrationPanel />

      <div className={styles.body}>
        <div className={styles.leftPanel}>
          <div className={styles.diagramArea}>
            <div className={styles.diagramWrap}>
              <SystemDiagramRenderer viz={viz} styles={styles} svgW={700} svgH={320} />
            </div>
            <SvgEventsList events={events} max={3} styles={styles} />
          </div>

          <div className={styles.conceptArea}>
            <ConceptPanel concepts={concepts} />
          </div>
        </div>

        <div className={styles.rightPanel}>
          <div className={styles.tabContainer}>
            <input type="radio" id="tab-code" name="detail-tab" defaultChecked />
            <input type="radio" id="tab-notes" name="detail-tab" />
            <input type="radio" id="tab-tradeoffs" name="detail-tab" />
            <input type="radio" id="tab-practices" name="detail-tab" />

            <div className={styles.tabLabels}>
              <label htmlFor="tab-code" className={styles.tabLabel}>Code</label>
              <label htmlFor="tab-notes" className={styles.tabLabel}>Notes</label>
              <label htmlFor="tab-tradeoffs" className={styles.tabLabel}>Trade-offs</label>
              <label htmlFor="tab-practices" className={styles.tabLabel}>Best Practices</label>
            </div>

            <div className={styles.tabContent}>
              <div id="tab-code-content" className={styles.tabPane}>
                {code.length > 0 ? (
                  <CodePanel code={code} language={active?.language || 'JavaScript'} />
                ) : (
                  <p className={styles.placeholder}>Code example not available</p>
                )}
              </div>

              <div id="tab-notes-content" className={styles.tabPane}>
                {codeNotes.length > 0 ? (
                  <div className={styles.notesList}>
                    {codeNotes.map((note, i) => (
                      <div key={i} className={styles.noteItem}>
                        <strong>{note.title}</strong>
                        <p>{note.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.placeholder}>No notes available</p>
                )}
              </div>

              <div id="tab-tradeoffs-content" className={styles.tabPane}>
                {tradeoffs.length > 0 ? (
                  <div className={styles.tradeoffsList}>
                    {tradeoffs.map((item, i) => (
                      <div key={i} className={styles.tradeoffItem}>
                        <div className={styles.tradeoffPro}>
                          <strong>✓ Pro:</strong> {item.pro}
                        </div>
                        <div className={styles.tradeoffCon}>
                          <strong>✗ Con:</strong> {item.con}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.placeholder}>No trade-offs listed</p>
                )}
              </div>

              <div id="tab-practices-content" className={styles.tabPane}>
                {bestPractices.length > 0 ? (
                  <ul className={styles.practicesList}>
                    {bestPractices.map((practice, i) => (
                      <li key={i} className={styles.practiceItem}>{practice}</li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.placeholder}>No best practices listed</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        {metrics.length > 0 && <MetricsPanel metrics={metrics} />}
        <StepControls />
      </div>
    </div>
  );
}
