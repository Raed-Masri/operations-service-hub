import { useCallback, useEffect, useState } from "react";
import { api, ApiError, PEOPLE } from "./api";
import type { ServiceRequest, Status } from "./api";
import "./App.css";


const MOVES: Status[] = ["ASSIGNED", "IN_PROGRESS", "RESOLVED", "CANCELLED"];

const STATUS_LABEL: Record<Status, string> = {
  SUBMITTED: "Submitted",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  WAITING_ON_REQUESTER: "Waiting on requester",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function App() {
  const [userId, setUserId] = useState(PEOPLE[0].id);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ServiceRequest | null>(null);
  const [notice, setNotice] = useState<{
    kind: "error" | "done";
    text: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(async () => {
    try {
      setRequests(await api.list(userId));
    } catch (error) {
      setRequests([]);
      setNotice({ kind: "error", text: (error as ApiError).message });
    }
  }, [userId]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!openId) return;
    api
      .get(openId, userId)
      .then(setDetail)
      .catch((error: ApiError) =>
        setNotice({ kind: "error", text: error.message }),
      );
  }, [openId, userId]);


  function changeUser(next: string) {
    setUserId(next);
    setOpenId(null);
    setDetail(null);
    setNotice(null);
  }

  function openRequest(id: string) {
    setOpenId(id);
    setDetail(null);
    setNotice(null);
  }

  async function move(to: Status) {
    if (!detail) return;
    setBusy(true);
    setNotice(null);
    try {
      const updated = await api.transition(detail.id, to, userId);
      setDetail(updated);
      setNotice({
        kind: "done",
        text: `Moved to ${STATUS_LABEL[to].toLowerCase()}.`,
      });
      await loadList();
    } catch (error) {
      setNotice({ kind: "error", text: (error as ApiError).message });
    } finally {
      setBusy(false);
    }
  }

  const me = PEOPLE.find((person) => person.id === userId);

  return (
    <div className="app">
      <header className="bar">
        <h1>Service requests</h1>
        <label className="who">
          Acting as
          <select
            value={userId}
            onChange={(event) => changeUser(event.target.value)}
          >
            {PEOPLE.map((person) => (
              <option key={person.id} value={person.id}>
                {person.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      {notice && (
        <p className={`notice notice--${notice.kind}`} role="status">
          {notice.text}
        </p>
      )}

      <main className="split">
        <section className="queue" aria-label="Request queue">
          <p className="queue__count">
            {requests.length === 0
              ? `Nothing here for ${me?.label.split(" —")[0]}.`
              : `${requests.length} request${requests.length === 1 ? "" : "s"} you can see`}
          </p>

          <ul className="list">
            {requests.map((row) => (
              <li key={row.id}>
                <button
                  className={`row ${openId === row.id ? "row--open" : ""}`}
                  onClick={() => openRequest(row.id)}
                >
                  <span className="row__title">{row.title}</span>
                  <span className="row__meta">
                    <span
                      className={`dot dot--${row.status}`}
                      aria-hidden="true"
                    />
                    {STATUS_LABEL[row.status]} · {row.departmentId}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="detail" aria-label="Request detail">
          {!detail && (
            <p className="hint">Pick a request to see its history.</p>
          )}

          {detail && (
            <>
              <h2>{detail.title}</h2>
              <p className="detail__meta">
                <span
                  className={`dot dot--${detail.status}`}
                  aria-hidden="true"
                />
                {STATUS_LABEL[detail.status]} · {detail.departmentId} · asked by{" "}
                {detail.requesterId}
              </p>

              <div className="moves">
                {MOVES.map((to) => (
                  <button key={to} onClick={() => move(to)} disabled={busy}>
                    {STATUS_LABEL[to]}
                  </button>
                ))}
              </div>

              <h3>History</h3>
              <ol className="history">
                {detail.history?.map((event) => (
                  <li key={event.id}>
                    <span className="history__move">
                      {event.from ? `${STATUS_LABEL[event.from]} → ` : ""}
                      {STATUS_LABEL[event.to]}
                    </span>
                    <span className="history__who">
                      {event.changedBy} · {when(event.occurredAt)}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
