import { useState, useEffect, useRef } from "react";

const FILTERS = ["All", "Active", "Completed"];

function getStatus(task) {
  if (task.completed) return "completed";
  if (!task.deadline) return "active";
  const now = new Date(), due = new Date(task.deadline);
  if (due - now < 86400000 && due > now) return "soon";
  return "active";
}

function fmtDeadline(dl) {
  if (!dl) return null;
  return new Date(dl).toLocaleDateString("en-MY", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function quickDate(type) {
  const d = new Date();
  if (type === "today") d.setHours(23, 59, 0, 0);
  if (type === "tomorrow") { d.setDate(d.getDate() + 1); d.setHours(23, 59, 0, 0); }
  if (type === "weekend") {
    const day = d.getDay(), diff = day <= 5 ? 6 - day : 7;
    d.setDate(d.getDate() + diff); d.setHours(23, 59, 0, 0);
  }
  return d.toISOString().slice(0, 16);
}

const EMPTY_FORM = { title: "", deadline: "", place: "", person: "" };

export default function TodoApp() {
  const [tasks, setTasks] = useState(() => {
    try { const s = localStorage.getItem("todo_tasks_v7"); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });
  const [filter, setFilter] = useState("All");
  const [form, setForm] = useState(EMPTY_FORM);
  const [sheetMode, setSheetMode] = useState(null);
  const [editId, setEditId] = useState(null);
  const [swipedId, setSwipedId] = useState(null);
  const [history, setHistory] = useState(() => {
    try { const s = localStorage.getItem("todo_history"); return s ? JSON.parse(s) : { places: [], persons: [] }; }
    catch { return { places: [], persons: [] }; }
  });
  const titleRef = useRef();

  useEffect(() => {
    try { localStorage.setItem("todo_tasks_v7", JSON.stringify(tasks)); } catch {}
  }, [tasks]);

  useEffect(() => {
    try { localStorage.setItem("todo_history", JSON.stringify(history)); } catch {}
  }, [history]);

  useEffect(() => {
    if (sheetMode && titleRef.current) setTimeout(() => titleRef.current.focus(), 100);
  }, [sheetMode]);

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setSheetMode("add"); };
  const openEdit = task => { setForm({ title: task.title, deadline: task.deadline || "", place: task.place || "", person: task.person || "" }); setEditId(task.id); setSheetMode("edit"); setSwipedId(null); };
  const closeSheet = () => { setSheetMode(null); setEditId(null); };

  const saveTask = () => {
    if (!form.title.trim()) return;
    const place = form.place.trim(), person = form.person.trim();
    if (sheetMode === "add") {
      setTasks(p => [...p, { id: Date.now(), ...form, title: form.title.trim(), place, person, completed: false, createdAt: new Date().toISOString() }]);
    } else {
      setTasks(p => p.map(t => t.id === editId ? { ...t, ...form, title: form.title.trim(), place, person } : t));
    }
    setHistory(h => ({
      places: place && !h.places.includes(place) ? [place, ...h.places].slice(0, 8) : h.places,
      persons: person && !h.persons.includes(person) ? [person, ...h.persons].slice(0, 8) : h.persons,
    }));
    closeSheet();
  };

  const markComplete = id => { setSwipedId(null); setTasks(p => p.map(t => t.id === id ? { ...t, completed: !t.completed } : t)); };
  const remove = id => { setSwipedId(null); setTasks(p => p.filter(t => t.id !== id)); };

  const filtered = tasks.filter(t => {
    const s = getStatus(t);
    if (filter === "All") return true;
    if (filter === "Active") return s === "active" || s === "soon";
    if (filter === "Completed") return s === "completed";
  });

  const counts = {
    All: tasks.length,
    Active: tasks.filter(t => ["active","soon"].includes(getStatus(t))).length,
    Completed: tasks.filter(t => getStatus(t) === "completed").length,
  };

  const pct = tasks.length ? Math.round((counts.Completed / tasks.length) * 100) : 0;
  const inp = (extra={}) => ({ style: { width: "100%", boxSizing: "border-box", padding: "13px 14px", borderRadius: 12, border: "1.5px solid #E5E7EB", fontSize: 16, outline: "none", background: "#fff", ...extra } });
  const statusBorderColor = s => ({ soon: "#F59E0B", active: "#667eea", completed: "#22C55E" }[s] || "#667eea");

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #667eea 0%, #764ba2 100%)", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ padding: "52px 16px 20px", position: "sticky", top: 0, zIndex: 10, background: "linear-gradient(160deg, #667eea 0%, #764ba2 100%)" }}>
        <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 700, margin: "0 0 2px", letterSpacing: "-0.5px" }}>My Tasks</h1>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, margin: "0 0 14px" }}>
          {counts.Active} active · {counts.Completed} completed
        </p>
        {tasks.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>Progress</span>
              <span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{pct}%</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.25)", borderRadius: 99, height: 5 }}>
              <div style={{ width: `${pct}%`, height: "100%", background: "#fff", borderRadius: 99, transition: "width 0.4s" }} />
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              flexShrink: 0, padding: "8px 16px", borderRadius: 99, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: filter === f ? 600 : 400, whiteSpace: "nowrap",
              background: filter === f ? "#fff" : "rgba(255,255,255,0.18)",
              color: filter === f ? "#7C3AED" : "rgba(255,255,255,0.9)", minHeight: 44,
            }}>
              {f}{counts[f] > 0 ? ` (${counts[f]})` : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      <div style={{ padding: "12px 16px 120px" }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "4rem 1rem", color: "rgba(255,255,255,0.6)", fontSize: 14 }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>✨</div>
            {filter === "All" ? "No tasks yet — tap + to add one!" : `No ${filter.toLowerCase()} tasks.`}
          </div>
        )}

        {filtered.map(task => {
          const status = getStatus(task);
          const isDone = status === "completed";
          const isSoon = status === "soon";
          const swiped = swipedId === task.id;

          return (
            <div key={task.id} style={{ marginBottom: 10, position: "relative", overflow: "hidden", borderRadius: 16 }}>
              {/* Action bg */}
              <div style={{ position: "absolute", inset: 0, borderRadius: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ background: "#667eea", height: "100%", width: "50%", display: "flex", alignItems: "center", paddingLeft: 20, borderRadius: "16px 0 0 16px" }}>
                  <span style={{ fontSize: 20 }}>✏️</span>
                </div>
                <div style={{ background: "#EF4444", height: "100%", width: "50%", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 20, borderRadius: "0 16px 16px 0" }}>
                  <span style={{ fontSize: 20 }}>🗑</span>
                </div>
              </div>

              {/* Card */}
              <div style={{
                background: "#fff",
                borderRadius: 16, padding: "14px 16px",
                display: "flex", gap: 12, alignItems: "flex-start",
                boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                borderLeft: `4px solid ${statusBorderColor(status)}`,
                transform: swiped ? "translateX(-90px)" : "translateX(0)",
                transition: "transform 0.25s ease",
                position: "relative", zIndex: 1,
              }}>
                <div style={{ flex: 1, minWidth: 0 }} onClick={() => setSwipedId(swiped ? null : task.id)}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center", marginBottom: 5 }}>
                    <span style={{ fontSize: 15, fontWeight: 500, color: isDone ? "#9CA3AF" : "#111827", textDecoration: isDone ? "line-through" : "none", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                      {task.title}
                    </span>
                    {isDone && <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: "#F0FDF4", color: "#22C55E" }}>Completed</span>}
                    {isSoon && <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: "#FFFBEB", color: "#D97706" }}>Due soon</span>}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 12px" }}>
                    {task.deadline && <span style={{ fontSize: 12, color: "#6B7280" }}>🗓 {fmtDeadline(task.deadline)}</span>}
                    {task.place && <span style={{ fontSize: 12, color: "#6B7280" }}>📍 {task.place}</span>}
                    {task.person && <span style={{ fontSize: 12, color: "#6B7280" }}>👤 {task.person}</span>}
                  </div>
                </div>

                {swiped && (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => markComplete(task.id)} style={{ background: "#22C55E", border: "none", borderRadius: 10, padding: "8px 12px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", minHeight: 44 }}>{task.completed ? "↩" : "✓"}</button>
                    <button onClick={() => openEdit(task)} style={{ background: "#667eea", border: "none", borderRadius: 10, padding: "8px 12px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", minHeight: 44 }}>Edit</button>
                    <button onClick={() => remove(task.id)} style={{ background: "#EF4444", border: "none", borderRadius: 10, padding: "8px 12px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", minHeight: 44 }}>Delete</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FAB */}
      {!sheetMode && (
        <button onClick={openAdd} style={{
          position: "fixed", bottom: 28, right: 20,
          width: 60, height: 60, borderRadius: 99, border: "none",
          background: "#fff", color: "#7C3AED", fontSize: 30,
          boxShadow: "0 6px 24px rgba(0,0,0,0.2)", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
        }}>+</button>
      )}

      {/* Bottom sheet */}
      {sheetMode && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
          <div onClick={closeSheet} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }} />
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "#F9FAFB", borderRadius: "24px 24px 0 0",
            padding: "20px 16px 40px",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.2)",
            maxHeight: "90vh", overflowY: "auto",
          }}>
            <div style={{ width: 40, height: 4, background: "#D1D5DB", borderRadius: 99, margin: "0 auto 18px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827" }}>
                {sheetMode === "edit" ? "Edit Task" : "New Task"}
              </h3>
            </div>

            <textarea ref={titleRef} placeholder="What needs to be done?" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              rows={3}
              style={{ width: "100%", boxSizing: "border-box", padding: "13px 14px", borderRadius: 12, border: "1.5px solid #E5E7EB", fontSize: 16, outline: "none", background: "#fff", resize: "vertical", fontFamily: "inherit", marginBottom: 12 }}
            />

            <p style={{ fontSize: 12, fontWeight: 500, color: "#6B7280", margin: "0 0 8px" }}>⚡ Quick deadline</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {[["Today", "today"], ["Tomorrow", "tomorrow"], ["Weekend", "weekend"]].map(([label, type]) => (
                <button key={type} onClick={() => setForm(f => ({ ...f, deadline: quickDate(type) }))} style={{
                  flex: 1, padding: "10px 6px", borderRadius: 10, border: "1.5px solid",
                  fontSize: 13, fontWeight: 500, cursor: "pointer", minHeight: 44,
                  borderColor: form.deadline === quickDate(type) ? "#7C3AED" : "#E5E7EB",
                  background: form.deadline === quickDate(type) ? "#EDE9FE" : "#fff",
                  color: form.deadline === quickDate(type) ? "#7C3AED" : "#374151",
                }}>{label}</button>
              ))}
            </div>

            <label style={{ fontSize: 12, fontWeight: 500, color: "#6B7280", display: "block", marginBottom: 6 }}>Or pick a custom time</label>
            <input type="datetime-local" value={form.deadline}
              onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              {...inp({ marginBottom: 12 })}
            />

            <label style={{ fontSize: 12, fontWeight: 500, color: "#6B7280", display: "block", marginBottom: 6 }}>📍 Place</label>
            <input type="text" placeholder="e.g. KLCC, Office" value={form.place}
              onChange={e => setForm(f => ({ ...f, place: e.target.value }))}
              list="places-list" {...inp({ marginBottom: 8 })}
            />
            <datalist id="places-list">{history.places.map(p => <option key={p} value={p} />)}</datalist>
            {history.places.length > 0 && !form.place && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {history.places.slice(0,4).map(p => (
                  <button key={p} onClick={() => setForm(f => ({ ...f, place: p }))} style={{ padding: "5px 12px", borderRadius: 99, border: "1px solid #E5E7EB", background: "#fff", fontSize: 12, color: "#6B7280", cursor: "pointer", minHeight: 36 }}>📍 {p}</button>
                ))}
              </div>
            )}

            <label style={{ fontSize: 12, fontWeight: 500, color: "#6B7280", display: "block", marginBottom: 6 }}>👤 Person</label>
            <input type="text" placeholder="e.g. Ahmad, Sarah" value={form.person}
              onChange={e => setForm(f => ({ ...f, person: e.target.value }))}
              list="persons-list" {...inp({ marginBottom: 8 })}
            />
            <datalist id="persons-list">{history.persons.map(p => <option key={p} value={p} />)}</datalist>
            {history.persons.length > 0 && !form.person && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                {history.persons.slice(0,4).map(p => (
                  <button key={p} onClick={() => setForm(f => ({ ...f, person: p }))} style={{ padding: "5px 12px", borderRadius: 99, border: "1px solid #E5E7EB", background: "#fff", fontSize: 12, color: "#6B7280", cursor: "pointer", minHeight: 36 }}>👤 {p}</button>
                ))}
              </div>
            )}

            <button onClick={saveTask} disabled={!form.title.trim()} style={{
              width: "100%", padding: "15px", borderRadius: 14, border: "none",
              background: form.title.trim() ? "linear-gradient(135deg, #667eea, #764ba2)" : "#E5E7EB",
              color: form.title.trim() ? "#fff" : "#9CA3AF",
              fontSize: 16, fontWeight: 700,
              cursor: form.title.trim() ? "pointer" : "default",
              boxShadow: form.title.trim() ? "0 4px 16px rgba(102,126,234,0.4)" : "none",
              marginTop: 4, minHeight: 52,
            }}>{sheetMode === "edit" ? "Save Changes" : "Add Task"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
