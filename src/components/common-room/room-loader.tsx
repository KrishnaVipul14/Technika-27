import styles from "./common-room.module.css";

export function RoomLoader({ stage = "Preparing your common room" }: { stage?: string }) {
  return <div className={styles.loader} role="status" aria-live="polite"><span className={styles.loaderMark} aria-hidden="true">✧</span><span className={styles.eyebrow}>Beyond the ordinary</span><p>{stage}</p><span className={styles.loaderLine} aria-hidden="true" /></div>;
}
