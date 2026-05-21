import Card, { CardHeader } from '../Card/Card';
import styles from './CaseStudy.module.css';

export default function CaseStudy({ name, caseStudy }) {
  if (!caseStudy) return null;

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{name}</h2>

      {caseStudy.overview && (
        <section className={styles.section}>
          <p className={styles.overviewText}>{caseStudy.overview}</p>
        </section>
      )}

      {caseStudy.architectureTiers && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>🏛️ Architecture Tiers</h3>
          <div className={styles.tierList}>
            {caseStudy.architectureTiers.map((tier, i) => (
              <div key={i} className={styles.tierItem}>
                <span className={styles.tierBadge}>{tier.name}</span>
                <p className={styles.tierDesc}>{tier.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {caseStudy.components && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>⚙️ Component Deep Dive</h3>
          <div className={styles.componentGrid}>
            {caseStudy.components.map((comp, i) => (
              <Card key={i} variant="default" className={styles.componentCard}>
                <h4 className={styles.componentName}>{comp.name}</h4>
                <p className={styles.componentDesc}>{comp.desc}</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      {caseStudy.flow && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>🔄 Request Lifecycle</h3>
          <div className={styles.flowSteps}>
            {caseStudy.flow.map((step, i) => (
              <div key={i} className={styles.flowStep}>
                <div className={styles.stepNumber}>{i + 1}</div>
                <p className={styles.stepText}>{step}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {caseStudy.protocolFlow && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>🔌 Protocol & Internal Flows</h3>
          <div className={styles.protocolGrid}>
            {caseStudy.protocolFlow.wsLifecycle && (
              <div className={styles.protocolCard}>
                <h4 className={styles.subTitle}>WebSocket Lifecycle</h4>
                <p className={styles.monoText}>{caseStudy.protocolFlow.wsLifecycle}</p>
              </div>
            )}
            {caseStudy.protocolFlow.e2ee && (
              <div className={styles.protocolCard}>
                <h4 className={styles.subTitle}>E2EE (Signal Protocol)</h4>
                <p className={styles.monoText}>{caseStudy.protocolFlow.e2ee}</p>
              </div>
            )}
            {caseStudy.protocolFlow.dedup && (
              <div className={styles.protocolCard}>
                <h4 className={styles.subTitle}>Idempotency / Dedup</h4>
                <p className={styles.monoText}>{caseStudy.protocolFlow.dedup}</p>
              </div>
            )}
            {caseStudy.protocolFlow.backpressure && (
              <div className={styles.protocolCard}>
                <h4 className={styles.subTitle}>Backpressure</h4>
                <p className={styles.monoText}>{caseStudy.protocolFlow.backpressure}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {caseStudy.databaseSchema && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>🗄️ Database Architecture</h3>
          <p className={styles.rationaleText}>{caseStudy.databaseSchema.rationale}</p>
          <div className={styles.tableGrid}>
            {caseStudy.databaseSchema.tables.map((tbl, i) => (
              <div key={i} className={styles.tableCard}>
                <div className={styles.tableHeader}>
                  <span className={styles.tableName}>{tbl.name}</span>
                  <span className={styles.tableEngine}>{tbl.engine}</span>
                </div>
                <p className={styles.tableDesc}>{tbl.desc}</p>
              </div>
            ))}
          </div>
          {caseStudy.databaseSchema.sharding && (
            <div className={styles.dbMeta}>
              <strong>Sharding:</strong> {caseStudy.databaseSchema.sharding}
            </div>
          )}
          {caseStudy.databaseSchema.consistency && (
            <div className={styles.dbMeta}>
              <strong>Consistency:</strong> {caseStudy.databaseSchema.consistency}
            </div>
          )}
        </section>
      )}

      {caseStudy.failureModes && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>⚠️ Failure Mode Analysis</h3>
          <div className={styles.failureGrid}>
            {caseStudy.failureModes.map((fm, i) => (
              <div key={i} className={styles.failureCard}>
                <h4 className={styles.failureName}>{fm.name}</h4>
                <p className={styles.failureDesc}>{fm.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {caseStudy.performance && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>📊 Performance Deep Dive</h3>
          <div className={styles.perfRow}>
            <div className={styles.perfBox}>
              <span className={styles.perfLabel}>P50</span>
              <span className={styles.perfValue}>{caseStudy.performance.p50}</span>
            </div>
            <div className={styles.perfBox}>
              <span className={styles.perfLabel}>P95</span>
              <span className={styles.perfValue}>{caseStudy.performance.p95}</span>
            </div>
            <div className={styles.perfBox}>
              <span className={styles.perfLabel}>P99</span>
              <span className={styles.perfValue}>{caseStudy.performance.p99}</span>
            </div>
          </div>
          {caseStudy.performance.breakdown && (
            <div className={styles.perfList}>
              <h4 className={styles.subTitle}>Latency Breakdown</h4>
              {caseStudy.performance.breakdown.map((item, i) => (
                <div key={i} className={styles.perfItem}>{item}</div>
              ))}
            </div>
          )}
          {caseStudy.performance.bottlenecks && (
            <div className={styles.perfList}>
              <h4 className={styles.subTitle}>Bottlenecks & Mitigations</h4>
              {caseStudy.performance.bottlenecks.map((item, i) => (
                <div key={i} className={styles.perfItem}>{item}</div>
              ))}
            </div>
          )}
        </section>
      )}

      {caseStudy.infraEvolution && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>📈 Infrastructure Evolution</h3>
          <div className={styles.evolutionList}>
            {caseStudy.infraEvolution.map((phase, i) => (
              <div key={i} className={styles.evolutionPhase}>
                <div className={styles.phaseBadge}>{phase.phase}</div>
                <p className={styles.phaseDesc}>{phase.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {caseStudy.distributedSystems && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>🌍 Distributed Systems Decisions</h3>
          <div className={styles.dsGrid}>
            {caseStudy.distributedSystems.map((ds, i) => (
              <div key={i} className={styles.dsCard}>
                <h4 className={styles.dsConcept}>{ds.concept}</h4>
                <p className={styles.dsDecision}>{ds.decision}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {caseStudy.challenges && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>⚡ Key Challenges</h3>
          <ul className={styles.challengeList}>
            {caseStudy.challenges.map((challenge, i) => (
              <li key={i} className={styles.challengeItem}>{challenge}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
