import { memo } from 'react';
import styles from '../RedisVisualizer.module.css';

export const PubSubView = memo(function PubSubView({ viz }) {
  const channels = viz.channels || [];
  const subscribers = viz.subscribers || [];
  const pub = viz.publisher;

  return (
    <div className={styles.pubSubLayout}>
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
});
