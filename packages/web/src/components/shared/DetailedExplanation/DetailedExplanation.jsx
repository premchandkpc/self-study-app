import { useState } from 'react';
import Card from '../Card/Card';
import styles from './DetailedExplanation.module.css';

export default function DetailedExplanation({ topic: _topic, data }) {
  const [expandedSection, setExpandedSection] = useState(0);

  if (!data) return null;

  const sections = [
    { title: '📖 Deep Dive Explanation', content: data.deepDive },
    { title: '💻 Code Examples', content: data.codeExample, isCode: true },
    { title: '🎨 Visualization', content: data.visualization, isCode: true },
    { title: '🌍 Real-World at Scale', content: data.realWorldScales },
    { title: '⚡ Performance Tips', content: data.performanceTips, isList: true },
  ];

  return (
    <div className={styles.container}>
      <Card variant="elevated" className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.mainTitle}>{data.title}</h2>
          <p className={styles.subtitle}>Complete technical breakdown with code & visualization</p>
        </div>

        <div className={styles.sections}>
          {sections.map((section, idx) => (
            <div
              key={idx}
              className={`${styles.section} ${expandedSection === idx ? styles.expanded : ''}`}
            >
              <div
                className={styles.sectionHeader}
                onClick={() => setExpandedSection(expandedSection === idx ? -1 : idx)}
              >
                <h3 className={styles.sectionTitle}>{section.title}</h3>
                <span className={styles.expandIcon}>
                  {expandedSection === idx ? '▼' : '▶'}
                </span>
              </div>

              {expandedSection === idx && (
                <div className={styles.sectionContent}>
                  {section.isList ? (
                    <ul className={styles.tipsList}>
                      {section.content.map((tip, i) => (
                        <li key={i} className={styles.tipItem}>{tip}</li>
                      ))}
                    </ul>
                  ) : section.isCode ? (
                    <pre className={styles.codeBlock}>
                      <code>{section.content}</code>
                    </pre>
                  ) : (
                    <div className={styles.textContent}>
                      {section.content.split('\n\n').map((paragraph, i) => (
                        <p key={i} className={styles.paragraph}>{paragraph.trim()}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
