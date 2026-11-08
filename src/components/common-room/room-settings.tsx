import type { AssignedHouse } from "@/lib/common-room/types";
import type { RoomSettings } from "./use-room-settings";
import { MagicalOverlay } from "./panels/magical-overlay";
import styles from "./common-room.module.css";

type Props = { house: AssignedHouse; settings: RoomSettings; motion: boolean; open: boolean; onClose: () => void; onExited: () => void; onChange: (patch: Partial<RoomSettings>) => void; audioUnavailable: boolean; audioPaused: boolean; onResume: () => void };
export function RoomSettingsPanel({ house, settings, motion, open, onClose, onExited, onChange, audioUnavailable, audioPaused, onResume }: Props) {
  return <MagicalOverlay title="Room settings" house={house} motion={motion} open={open} onClose={onClose} onExited={onExited}>
    <p className={styles.settingsIntro}>Make yourself comfortable. These preferences belong to this room, not the rest of the festival.</p>
    <label className={styles.setting}><span>Rendering quality</span><select value={settings.quality} onChange={(event) => onChange({ quality: event.target.value as RoomSettings["quality"] })}><option value="auto">Automatic</option><option value="low">Low</option><option value="medium">Balanced</option><option value="high">High</option></select></label>
    <label className={styles.setting}><span>Motion</span><select value={settings.motion} onChange={(event) => onChange({ motion: event.target.value as RoomSettings["motion"] })}><option value="system">Follow device</option><option value="off">Off</option><option value="on">On</option></select></label>
    <label className={styles.setting}><span>Reading mode</span><input type="checkbox" checked={settings.lightweight} onChange={(event) => onChange({ lightweight: event.target.checked })} /></label>
    <h3>The sounds of the room</h3><p className={styles.settingsIntro}>Sound starts off each visit. Enable only what you would like to hear.</p>
    <label className={styles.setting}><span>Ambient sound</span><input type="checkbox" checked={settings.ambient} onChange={(event) => onChange({ ambient: event.target.checked })} /></label>
    <label className={styles.setting}><span>Object sounds</span><input type="checkbox" checked={settings.effects} onChange={(event) => onChange({ effects: event.target.checked })} /></label>
    {audioUnavailable && <p role="status" className={styles.status}>Audio could not be started in this browser. The room is still yours to explore.</p>}
    {audioPaused && <p className={styles.status}>Sound is paused. <button className={styles.paperButton} type="button" onClick={onResume}>Resume sound</button></p>}
    <aside className={styles.notice}><span className={styles.noticeLabel}>A work in atmosphere</span><p>Procedural 3D geometry and generated materials. Synthetic audio study — not recorded ambience or finished production assets.</p></aside>
  </MagicalOverlay>;
}
