"use client";

import { useEffect, useState } from "react";
import { houseThemes } from "@/lib/houses";
import { unavailableSources } from "@/lib/common-room/content";
import type { AssignedHouse, MembersResult, RoomMember } from "@/lib/common-room/types";
import styles from "../common-room.module.css";

export function MembersPanel({ house, onSessionExpired }: { house: AssignedHouse; onSessionExpired: () => void }) {
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<MembersResult | null>(null);
  const [member, setMember] = useState<RoomMember | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/common-room/members?page=${page}`, { signal: controller.signal, cache: "no-store" }).then(async (response) => {
      if (controller.signal.aborted) return;
      if (response.status === 401 || response.status === 403) { onSessionExpired(); return; }
      if (!response.ok) throw new Error("Directory unavailable");
      const payload = await response.json() as MembersResult;
      if (controller.signal.aborted) return;
      if (payload.status !== "ready" || !Array.isArray(payload.members)) throw new Error("Invalid directory response");
      if (payload.house !== house || payload.members.some((value) => value.house !== house)) { onSessionExpired(); return; }
      if (payload.members.some((value) => typeof value.name !== "string")) throw new Error("Invalid member response");
      setResult(payload);
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ status: "unavailable", message: "The house directory could not be reached. Please try again." });
    });
    return () => controller.abort();
  }, [house, page, attempt, onSessionExpired]);
  const changePage = (value: number) => { setResult(null); setMember(null); setPage(value); };
  return <section>
    <p>The names behind the colours. This directory contains only members of {houseThemes[house].name}.</p>
    {member && <aside className={styles.notice}><h3>{member.name}</h3><p>{houseThemes[member.house].name} member</p><small>No additional public profile information is available.</small></aside>}
    {!result ? <p role="status" className={styles.status}>Opening the house ledger…</p> : result.status === "unavailable" ? <div role="status"><p>{result.message}</p><button type="button" className={styles.paperButton} onClick={() => { setResult(null); setAttempt((value) => value + 1); }}>Retry directory</button></div> : <>
      {result.members.length === 0 ? <p className={styles.status}>No members were returned for this page.</p> : <ul className={styles.memberList}>{result.members.map((value, index) => <li key={`${value.name}-${index}`} data-testid="room-member"><button type="button" className={styles.memberButton} onClick={() => setMember(value)} aria-label={`View ${value.name}`}><span className={styles.avatar} aria-hidden="true">{value.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span><span><strong>{value.name}</strong><small>{houseThemes[value.house].name}</small></span></button></li>)}</ul>}
      <nav className={styles.pagination} aria-label="Directory pages"><button type="button" className={styles.paperButton} disabled={page === 0} onClick={() => changePage(page - 1)}>Previous page</button><span>Page {page + 1}</span><button type="button" className={styles.paperButton} disabled={result.nextPage === null} onClick={() => { if (result.nextPage !== null) changePage(result.nextPage); }}>Next page</button></nav>
    </>}
    <p><small>{unavailableSources.achievements.message}</small></p>
  </section>;
}
