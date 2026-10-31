import { unavailableSources } from "@/lib/common-room/content";
import styles from "../common-room.module.css";

export function NoticeBoardPanel() {
  return <div>
    <p>Letters from the festival will find their way to this board. Only official, connected information will be shown here.</p>
    {([ ["Latest announcements", "announcements"], ["Festival schedule", "schedule"], ["Workshops & event updates", "workshops"] ] as const).map(([title, key]) => <section className={styles.notice} key={key}>
      <h4>{title}</h4><span className={styles.noticeLabel}>Awaiting an official source</span><p>{unavailableSources[key].message}</p>
    </section>)}
    <small>Publication dates and read/unread status will be available when supported by the notice service.</small>
  </div>;
}
