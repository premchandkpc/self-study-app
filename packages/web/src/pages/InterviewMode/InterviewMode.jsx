import { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { QUESTIONS, CATEGORIES, DIFFICULTY_COLOR } from './questions';
import AnimatedBox from '../../components/shared/AnimatedBox/AnimatedBox';
import Button from '../../components/shared/Button/Button';
import Badge from '../../components/shared/Badge/Badge';
import styles from './InterviewMode.module.css';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function InterviewMode() {
  const [category, setCategory]     = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [deck, setDeck]             = useState([]);
  const [idx, setIdx]               = useState(0);
  const [flipped, setFlipped]       = useState(false);
  const [score, setScore]           = useState({ know: 0, skip: 0 });
  const [done, setDone]             = useState(false);
  const [timerOn, setTimerOn]       = useState(false);
  const [elapsed, setElapsed]       = useState(0);
  const timerRef                    = useRef(null);

  const buildDeck = useCallback(() => {
    let qs = QUESTIONS;
    if (category !== 'all')    qs = qs.filter((q) => q.category === category);
    if (difficulty !== 'all')  qs = qs.filter((q) => q.difficulty === difficulty);
    return shuffle(qs);
  }, [category, difficulty]);

  useEffect(() => {
    const d = buildDeck();
    setDeck(d);
  }, [buildDeck]); // eslint-disable-line react-hooks/set-state-in-effect

  useEffect(() => {
    setIdx(0);
    setFlipped(false);
    setScore({ know: 0, skip: 0 });
    setDone(false);
    setElapsed(0);
  }, [deck]); // eslint-disable-line react-hooks/set-state-in-effect

  useEffect(() => {
    if (timerOn && !done) {
      const id = setInterval(() => setElapsed((e) => e + 1), 1000);
      timerRef.current = id;
    } else {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { clearInterval(timerRef.current); timerRef.current = null; };
  }, [timerOn, done]);

  function next(knew) {
    setScore((s) => ({ ...s, [knew ? 'know' : 'skip']: s[knew ? 'know' : 'skip'] + 1 }));
    if (idx + 1 >= deck.length) {
      setDone(true);
    } else {
      setIdx((i) => i + 1);
      setFlipped(false);
    }
  }

  function restart() {
    const d = buildDeck();
    setDeck(d);
    setIdx(0);
    setFlipped(false);
    setScore({ know: 0, skip: 0 });
    setDone(false);
    setTimerOn(false);
    setElapsed(0);
  }

  const card = deck[idx];
  const progress = deck.length ? ((idx) / deck.length) * 100 : 0;
  const total = score.know + score.skip;
  const pct = total ? Math.round((score.know / total) * 100) : 0;

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className={styles.page}>
      {/* header */}
      <AnimatedBox animation="slide-up">
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Interview Mode</h1>
            <p className={styles.sub}>Flashcard-based interview prep. Test your knowledge across system design, algorithms, architecture, and distributed systems.</p>
          </div>
          <div className={styles.headerActions}>
            <button
              className={`${styles.timerToggle} ${timerOn ? styles.timerOn : ''}`}
              onClick={() => setTimerOn((t) => !t)}
            >
              ⏱ {timerOn ? fmt(elapsed) : 'Timer'}
            </button>
            <Button variant="ghost" size="sm" onClick={restart} icon="🔀">Shuffle</Button>
          </div>
        </div>
      </AnimatedBox>

      {/* filters */}
      <AnimatedBox animation="slide-up" delay={50}>
        <div className={styles.filters}>
          <div className={styles.filterRow}>
            <span className={styles.filterLabel}>Category</span>
            <div className={styles.chips}>
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  className={`${styles.chip} ${category === c.id ? styles.chipActive : ''}`}
                  style={category === c.id ? { '--chip-color': c.color } : {}}
                  onClick={() => setCategory(c.id)}
                >
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.filterRow}>
            <span className={styles.filterLabel}>Difficulty</span>
            <div className={styles.chips}>
              {['all', 'easy', 'medium', 'hard'].map((d) => (
                <button
                  key={d}
                  className={`${styles.chip} ${difficulty === d ? styles.chipActive : ''}`}
                  style={difficulty === d && d !== 'all' ? { '--chip-color': DIFFICULTY_COLOR[d] } : {}}
                  onClick={() => setDifficulty(d)}
                >
                  {d === 'all' ? '🌐 All' : d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </AnimatedBox>

      {/* progress bar */}
      <div className={styles.progressWrap}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <span className={styles.progressText}>{idx} / {deck.length}</span>
      </div>

      {/* score chips */}
      <div className={styles.scoreRow}>
        <span className={styles.scoreKnow}>✅ Know: {score.know}</span>
        <span className={styles.scoreSkip}>⏭ Skip: {score.skip}</span>
      </div>

      {/* card area */}
      {done ? (
        <DoneScreen score={score} elapsed={elapsed} fmt={fmt} pct={pct} onRestart={restart} />
      ) : !card ? (
        <div className={styles.empty}>No questions match filter. Adjust category or difficulty.</div>
      ) : (
        <div className={styles.cardArea}>
          {/* card */}
          <div
            className={`${styles.cardFlip} ${flipped ? styles.flipped : ''}`}
            onClick={() => setFlipped((f) => !f)}
          >
            <div className={styles.cardInner}>
              {/* front */}
              <div className={styles.cardFront}>
                <div className={styles.cardMeta}>
                  <Badge variant={card.category} size="xs">{CATEGORIES.find((c) => c.id === card.category)?.label || card.category}</Badge>
                  <span className={styles.diffDot} style={{ background: DIFFICULTY_COLOR[card.difficulty] }} />
                  <span className={styles.diffLabel} style={{ color: DIFFICULTY_COLOR[card.difficulty] }}>{card.difficulty}</span>
                  <span className={styles.cardNum}>#{card.id}</span>
                </div>
                <div className={styles.question}>{card.q}</div>
                <div className={styles.flipHint}>Click to reveal answer →</div>
              </div>

              {/* back */}
              <div className={styles.cardBack}>
                <div className={styles.answerLabel}>Answer</div>
                <div className={styles.answer}>{card.a}</div>
                <div className={styles.flipHint}>Click to flip back</div>
              </div>
            </div>
          </div>

          {/* action buttons */}
          <div className={styles.actions}>
            <Button
              variant="ghost"
              size="md"
              onClick={() => next(false)}
              disabled={!flipped}
            >
              ⏭ Skip
            </Button>
            <Button
              variant="success"
              size="md"
              onClick={() => next(true)}
              disabled={!flipped}
            >
              ✅ Know It
            </Button>
          </div>

          <p className={styles.actionHint}>Flip card first, then mark Know It or Skip</p>
        </div>
      )}
    </div>
  );
}

function DoneScreen({ score, elapsed, fmt, pct, onRestart }) {
  const grade = pct >= 80 ? { label: 'Ready to Interview!', color: 'var(--pod-running)', icon: '🎉' }
              : pct >= 60 ? { label: 'Almost There',        color: 'var(--node-comparing)', icon: '💪' }
              :              { label: 'Keep Practicing',     color: 'var(--pod-crash)',   icon: '📚' };

  return (
    <AnimatedBox animation="bounce-in">
      <div className={styles.done}>
        <div className={styles.doneIcon}>{grade.icon}</div>
        <div className={styles.doneGrade} style={{ color: grade.color }}>{grade.label}</div>
        <div className={styles.doneStats}>
          <div className={styles.doneStat}>
            <span className={styles.doneStatVal} style={{ color: 'var(--pod-running)' }}>{score.know}</span>
            <span className={styles.doneStatLbl}>Know It</span>
          </div>
          <div className={styles.doneStat}>
            <span className={styles.doneStatVal} style={{ color: 'var(--pod-crash)' }}>{score.skip}</span>
            <span className={styles.doneStatLbl}>Skipped</span>
          </div>
          <div className={styles.doneStat}>
            <span className={styles.doneStatVal} style={{ color: 'var(--text-accent)' }}>{pct}%</span>
            <span className={styles.doneStatLbl}>Score</span>
          </div>
          {elapsed > 0 && (
            <div className={styles.doneStat}>
              <span className={styles.doneStatVal} style={{ color: 'var(--text-muted)' }}>{fmt(elapsed)}</span>
              <span className={styles.doneStatLbl}>Time</span>
            </div>
          )}
        </div>
        <div className={styles.doneBar}>
          <div className={styles.doneBarFill} style={{ width: `${pct}%`, background: grade.color }} />
        </div>
        <Button variant="primary" size="md" icon="🔀" onClick={onRestart}>
          Try Again
        </Button>
      </div>
    </AnimatedBox>
  );
}
