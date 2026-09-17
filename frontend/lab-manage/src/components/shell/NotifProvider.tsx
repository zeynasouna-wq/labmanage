"use client";

import { useState, useCallback, useRef } from "react";
import { NotifContext } from "@/lib/contexts";

// ─── Notification System ─────────────────────────────────────────────
export function NotifProvider({ children }: { children: React.ReactNode }) {
  const [notifs, setNotifs] = useState<any[]>([]);
  const notifCountRef = useRef(0);
  const add = useCallback((msg: any, type: string = "success") => {
    const id = ++notifCountRef.current;
    setNotifs((n) => [...n, { id, msg, type }]);
    setTimeout(() => setNotifs((n) => n.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <NotifContext.Provider value={add}>
      {children}
      <div className="notif-container">
        {notifs.map((n) => (
          <div key={n.id} className={`notif ${n.type}`}>{n.msg}</div>
        ))}
      </div>
    </NotifContext.Provider>
  );
}
