
import { useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowRight, Bell, CheckCircle2, ChevronRight,
  ClipboardList, FileSearch, LayoutDashboard, Menu, Plus, Search, ShieldCheck,
  Sparkles, Target, Waves, X, Zap, Clock3, CircleCheck, RefreshCw, Download, History
} from "lucide-react";
import { analyzeComplaintAPI } from "./api";
import "./App.css";

type Urgency = "Critical" | "High" | "Medium" | "Low";
type Status = "Pending" | "Assigned" | "Resolved";
type Section =
  | "Overview"
  | "AI Triage"
  | "Complaints"
  | "Duplicate Detection"
  | "Review Queue"
  | "History"
  | "Download Report";

type Complaint = {
  id: string;
  title: string;
  location: string;
  category: string;
  urgency: Urgency;
  status: Status;
  description: string;
  department: string;
  created: string;
};

type HistoryEntry = {
  id: string;
  complaintId: string;
  title: string;
  action: string;
  status: Status;
  timestamp: string;
};

type Analysis = {
  category: string;
  urgency: Urgency;
  department: string;
  action: string;
  reason: string;
};

const navItems: { name: Section; icon: typeof LayoutDashboard }[] = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "AI Triage", icon: Sparkles },
  { name: "Complaints", icon: ClipboardList },
  { name: "Duplicate Detection", icon: FileSearch },
  { name: "Review Queue", icon: ShieldCheck },
  { name: "History", icon: History },
  { name: "Download Report", icon: Download },
];

const initialComplaints: Complaint[] = [
  {
    id: "VD-1048",
    title: "Water supply stopped",
    location: "Block A · Hostel",
    category: "Water Supply",
    urgency: "High",
    status: "Pending",
    description: "No water supply since morning in the hostel.",
    department: "Water Department",
    created: "4 min ago",
  },
  {
    id: "VD-1047",
    title: "Exposed electrical wire",
    location: "Engineering Block · Floor 2",
    category: "Electrical Hazard",
    urgency: "Critical",
    status: "Assigned",
    description: "A damaged wire is exposed near a corridor.",
    department: "Electrical Department",
    created: "12 min ago",
  },
  {
    id: "VD-1046",
    title: "Garbage overflowing",
    location: "Cafeteria · East Gate",
    category: "Sanitation",
    urgency: "Medium",
    status: "Pending",
    description: "Waste bins have not been cleared.",
    department: "Sanitation Department",
    created: "26 min ago",
  },
  {
    id: "VD-1045",
    title: "Streetlight not working",
    location: "North Parking",
    category: "Street Lighting",
    urgency: "Low",
    status: "Resolved",
    description: "The streetlight near parking is not working.",
    department: "Electrical Department",
    created: "1 hr ago",
  },
  {
    id: "VD-1044",
    title: "Water leakage in corridor",
    location: "Block A · Ground Floor",
    category: "Water Supply",
    urgency: "High",
    status: "Assigned",
    description: "Water is leaking near the main corridor.",
    department: "Water Department",
    created: "1 hr ago",
  },
];

function localFallback(text: string): Analysis {
  const t = text.toLowerCase();

  if (/fire|smoke|exposed wire|live wire|electric shock|sparking|electrocution|short circuit/.test(t)) {
    return {
      category: /fire|smoke/.test(t) ? "Fire Safety" : "Electrical Hazard",
      urgency: "Critical",
      department: /fire|smoke/.test(t) ? "Emergency Services" : "Electrical Department",
      action: "Restrict access to the hazard and contact the responsible emergency team.",
      reason: "The complaint contains keywords associated with an immediate safety risk.",
    };
  }

  if (/water leak|water leakage|burst pipe|no water|water supply/.test(t)) {
    return {
      category: "Water Supply",
      urgency: "High",
      department: "Water Department",
      action: "Inspect the affected area and repair the reported fault.",
      reason: "The report indicates a possible water supply problem.",
    };
  }

  if (/garbage|waste|trash|dustbin|rubbish|dirty/.test(t)) {
    return {
      category: "Sanitation",
      urgency: "Medium",
      department: "Sanitation Department",
      action: "Schedule waste collection or inspect the affected area.",
      reason: "The report appears to concern sanitation or waste management.",
    };
  }

  if (/pothole|broken road|road damage/.test(t)) {
    return {
      category: "Road Maintenance",
      urgency: "Medium",
      department: "Public Works Department",
      action: "Inspect the road and assess repair requirements.",
      reason: "The report indicates a road maintenance issue.",
    };
  }

  if (/streetlight|street light|lamp not working|light not working/.test(t)) {
    return {
      category: "Street Lighting",
      urgency: "Low",
      department: "Electrical Department",
      action: "Inspect the streetlight and schedule a repair.",
      reason: "The report appears to describe routine lighting maintenance.",
    };
  }

  return {
    category: "General Complaint",
    urgency: "Medium",
    department: "General Services",
    action: "Review the report and assign the appropriate team.",
    reason: "No specific category matched; manual assessment is recommended.",
  };
}

function normalizeAnalysis(payload: unknown, text: string): Analysis {
  const fallback = localFallback(text);
  if (!payload || typeof payload !== "object") return fallback;

  const root = payload as Record<string, unknown>;
  const nested = (root.analysis ?? root.result ?? root.data ?? root) as Record<string, unknown>;

  const read = (...keys: string[]) => {
    for (const key of keys) {
      const value = nested[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return undefined;
  };

  const rawUrgency = read("urgency", "priority", "severity")?.toLowerCase();

  const urgency: Urgency =
    rawUrgency === "critical" || rawUrgency === "emergency" ? "Critical" :
    rawUrgency === "high" ? "High" :
    rawUrgency === "low" ? "Low" :
    rawUrgency === "medium" || rawUrgency === "moderate" ? "Medium" :
    fallback.urgency;

  return {
    category: read("category", "classification", "issue_type") ?? fallback.category,
    urgency,
    department: read("department", "assigned_department") ?? fallback.department,
    action: read("recommended_action", "action", "recommendation") ?? fallback.action,
    reason: read("explanation", "reason", "justification") ?? fallback.reason,
  };
}

const urgencyClass = (urgency: Urgency) =>
  `urgency urgency-${urgency.toLowerCase()}`;

export default function App() {
  const [section, setSection] = useState<Section>("Overview");
  const [complaints, setComplaints] = useState<Complaint[]>(initialComplaints);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [duplicateText, setDuplicateText] = useState("");
  const [toast, setToast] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  };

  const navigate = (next: Section) => {
    setSection(next);
    setMobileOpen(false);
    setSearch("");
    setFilter("All");
  };

  const stats = {
    total: complaints.length,
    critical: complaints.filter(
      c => c.urgency === "Critical" && c.status !== "Resolved"
    ).length,
    pending: complaints.filter(c => c.status === "Pending").length,
    resolved: complaints.filter(c => c.status === "Resolved").length,
  };

  const visibleComplaints = useMemo(
    () =>
      complaints.filter(c => {
        const query =
          `${c.id} ${c.title} ${c.location} ${c.category} ${c.department}`.toLowerCase();
        const matchesSearch = query.includes(search.toLowerCase());
        const matchesFilter = filter === "All" || c.urgency === filter;
        const matchesQueue = section !== "Review Queue" || c.status !== "Resolved";
        return matchesSearch && matchesFilter && matchesQueue;
      }),
    [complaints, search, filter, section]
  );

  const runAnalysis = async () => {
    const text = description.trim();

    if (text.length < 8) {
      notify("Please enter a more detailed complaint.");
      return;
    }

    setLoading(true);
    setAnalysis(null);

    try {
      const response = await analyzeComplaintAPI({
        complaint: text,
        source: "Campus",
        language: "English",
      });

      setAnalysis(normalizeAnalysis(response, text));
      notify("Backend analysis complete.");
    } catch (error) {
      console.error("VEDHA analysis request failed:", error);
      notify("Backend unavailable. Check that FastAPI is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  const submitComplaint = () => {
    if (!description.trim() || !location.trim()) {
      notify("Enter both complaint description and location.");
      return;
    }

    if (!analysis) {
      notify("Run triage analysis before submitting.");
      return;
    }

    const item: Complaint = {
      id: `VD-${1049 + complaints.length - initialComplaints.length}`,
      title: description.trim().split(/[.!?\n]/)[0].slice(0, 55),
      location: location.trim(),
      category: analysis.category,
      urgency: analysis.urgency,
      status: "Pending",
      description: description.trim(),
      department: analysis.department,
      created: "Just now",
    };

    setComplaints(prev => [item, ...prev]);

    setHistoryEntries(prev => [
      {
        id: `${Date.now()}-submitted`,
        complaintId: item.id,
        title: item.title,
        action: "Complaint submitted",
        status: item.status,
        timestamp: new Date().toLocaleString(),
      },
      ...prev,
    ]);

    setDescription("");
    setLocation("");
    setAnalysis(null);
    setSection("Complaints");
    notify(`${item.id} added to the review queue.`);
  };

  const updateStatus = (id: string, status: Status) => {
    const complaint = complaints.find(item => item.id === id);
    if (!complaint) return;

    setComplaints(prev =>
      prev.map(c => c.id === id ? { ...c, status } : c)
    );

    setHistoryEntries(prev => [
      {
        id: `${Date.now()}-${id}`,
        complaintId: id,
        title: complaint.title,
        action: `Status changed from ${complaint.status} to ${status}`,
        status,
        timestamp: new Date().toLocaleString(),
      },
      ...prev,
    ]);

    notify(`${id} marked ${status.toLowerCase()}.`);
  };

  const downloadReport = () => {
    if (complaints.length === 0) {
      notify("No complaints available to download.");
      return;
    }

    const headers = [
      "Complaint ID", "Title", "Description", "Location",
      "Category", "Urgency", "Status", "Department", "Created",
    ];

    const escapeCSV = (value: unknown) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const rows = complaints.map(item => [
      item.id,
      item.title,
      item.description,
      item.location,
      item.category,
      item.urgency,
      item.status,
      item.department,
      item.created,
    ]);

    const csv = [
      headers.map(escapeCSV).join(","),
      ...rows.map(row => row.map(escapeCSV).join(",")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `VEDHA-Report-${new Date().toISOString().slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    notify("Complaint report downloaded.");
  };

  const downloadHistory = () => {
    if (historyEntries.length === 0) {
      notify("No history activity available to download.");
      return;
    }

    const headers = [
      "Complaint ID", "Title", "Action", "Status", "Timestamp",
    ];

    const escapeCSV = (value: unknown) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const rows = historyEntries.map(item => [
      item.complaintId,
      item.title,
      item.action,
      item.status,
      item.timestamp,
    ]);

    const csv = [
      headers.map(escapeCSV).join(","),
      ...rows.map(row => row.map(escapeCSV).join(",")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `VEDHA-History-${new Date().toISOString().slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    notify("History downloaded.");
  };

  const duplicateMatches = useMemo(() => {
    const words = [
      ...new Set(duplicateText.toLowerCase().match(/[a-z]{3,}/g) ?? []),
    ];

    if (!words.length) return [];

    return complaints
      .map(item => {
        const candidate: string[]=
          `${item.title} ${item.description} ${item.location}`
            .toLowerCase()
            .match(/[a-z]{3,}/g) ?? [];

        const overlap = words.filter(word => candidate.includes(word)).length;
        return { ...item, score: overlap / words.length };
      })
      .filter(item => item.score >= 0.25)
      .sort((a, b) => b.score - a.score);
  }, [duplicateText, complaints]);

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="grid-overlay" />

      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Waves size={23} /></div>
          <div>
            <div className="brand-name">VEDHA<span>.</span></div>
            <div className="brand-subtitle">CAMPUS INTELLIGENCE</div>
          </div>
          <button
            className="icon-button mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="nav-list">
          {navItems.map(({ name, icon: Icon }) => (
            <button
              key={name}
              onClick={() => navigate(name)}
              className={`nav-item ${section === name ? "nav-active" : ""}`}
            >
              <Icon size={18} />
              <span>{name}</span>
              {name === "Review Queue" && stats.pending > 0 && (
                <span className="nav-count">{stats.pending}</span>
              )}
              {section === name && <span className="nav-indicator" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        <div className="system-card">
          <div className="system-card-top">
            <span className="pulse-dot" /> SYSTEM STATUS
            <span className="system-online">ONLINE</span>
          </div>
          <div className="system-title">VEDHA Intelligence</div>
          <div className="system-description">FastAPI triage integration</div>
          <div className="system-progress"><span /></div>
          <div className="system-meta">
            <span>Backend API</span>
            <span>{loading ? "Analyzing…" : "Ready"}</span>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="avatar">V</div>
          <div className="user-info">
            <strong>VEDHA Admin</strong>
            <span>Human reviewer</span>
          </div>
          <span className="admin-badge">ADMIN</span>
        </div>
      </aside>

      {mobileOpen && (
        <button
          className="mobile-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        />
      )}

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="mobile-menu-button icon-button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <span className="breadcrumb-muted">Workspace</span>
            <ChevronRight size={14} className="muted" />
            <span className="breadcrumb-current">{section}</span>
          </div>

          <div className="topbar-actions">
            <div className="system-pill">
              <span className="pulse-dot" /> Systems operational
            </div>
            <button
              className="icon-button notification-button"
              onClick={() => navigate("Review Queue")}
              aria-label="Open review queue"
            >
              <Bell size={18} />
              {stats.pending > 0 && <span className="notification-dot" />}
            </button>
            <div className="top-avatar">V</div>
          </div>
        </header>

        <div className="page-content">
          {section === "Overview" && (
            <>
              <section className="hero-card">
                <div className="hero-content">
                  <div className="eyebrow">
                    <span className="eyebrow-line" />
                    INTELLIGENCE FOR BETTER CAMPUSES
                  </div>
                  <h1>Make every report<br /><span>count.</span></h1>
                  <p>
                    Turn campus complaints into actionable intelligence.
                    Prioritize urgent issues, discover patterns, and help teams
                    respond faster.
                  </p>
                  <div className="hero-actions">
                    <button
                      className="primary-button"
                      onClick={() => navigate("AI Triage")}
                    >
                      <Sparkles size={17} /> Analyze a complaint
                      <ArrowRight size={16} />
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() => navigate("Complaints")}
                    >
                      Explore reports <ChevronRight size={16} />
                    </button>
                  </div>
                  <div className="hero-proof">
                    <span><CheckCircle2 size={15} /> Explainable triage</span>
                    <span><ShieldCheck size={15} /> Human-reviewed decisions</span>
                  </div>
                </div>

                <div className="hero-visual" aria-hidden="true">
                  <div className="orbit orbit-outer" />
                  <div className="orbit orbit-middle" />
                  <div className="orbit orbit-inner" />
                  <div className="core-glow" />
                  <div className="core"><Waves size={42} /></div>
                  <div className="orbit-node node-one"><Zap size={17} /></div>
                  <div className="orbit-node node-two"><Activity size={17} /></div>
                  <div className="orbit-node node-three"><Target size={17} /></div>
                  <div className="orbit-node node-four"><ShieldCheck size={17} /></div>
                  <div className="visual-label visual-label-one">TRIAGE <span>ACTIVE</span></div>
                  <div className="visual-label visual-label-two">SIGNAL DETECTED <span>●</span></div>
                </div>
                <div className="hero-bottom-line" />
              </section>

              <div className="section-heading">
                <div>
                  <div className="eyebrow small-eyebrow">LIVE OVERVIEW</div>
                  <h2>Operational snapshot</h2>
                </div>
                <div className="live-label"><span className="pulse-dot" /> DEMO DATA</div>
              </div>

              <div className="stats-grid">
                <StatCard icon={<ClipboardList size={19} />} label="Total complaints" value={stats.total} caption="All submitted reports" accent="blue" />
                <StatCard icon={<AlertTriangle size={19} />} label="Critical attention" value={stats.critical} caption="Unresolved safety cases" accent="red" />
                <StatCard icon={<Clock3 size={19} />} label="Awaiting review" value={stats.pending} caption="Pending human review" accent="amber" />
                <StatCard icon={<CircleCheck size={19} />} label="Resolved cases" value={stats.resolved} caption="Marked resolved" accent="green" />
              </div>

              <div className="dashboard-grid">
                <section className="panel complaints-panel">
                  <PanelTitle
                    icon={<Activity size={17} />}
                    title="Recent complaints"
                    subtitle="Latest reports in your workspace"
                    action="View all"
                    onAction={() => navigate("Complaints")}
                  />
                  <ComplaintTable
                    complaints={complaints.slice(0, 4)}
                    onStatus={updateStatus}
                    compact
                  />
                </section>

                <section className="panel insight-panel">
                  <PanelTitle
                    icon={<Sparkles size={17} />}
                    title="Intelligence insights"
                    subtitle="Signals from current demo data"
                  />
                  <div className="insight-highlight">
                    <div className="insight-icon"><AlertTriangle size={20} /></div>
                    <div>
                      <div className="insight-kicker">PRIORITY SIGNAL</div>
                      <strong>
                        {stats.critical} critical case{stats.critical === 1 ? "" : "s"} need attention
                      </strong>
                      <p>Check safety-related reports before routine maintenance.</p>
                    </div>
                  </div>
                  <div className="insight-row">
                    <span className="insight-row-icon"><Clock3 size={15} /></span>
                    <span>Pending review</span><strong>{stats.pending}</strong>
                  </div>
                  <div className="insight-row">
                    <span className="insight-row-icon"><CheckCircle2 size={15} /></span>
                    <span>Resolved reports</span><strong>{stats.resolved}</strong>
                  </div>
                  <div className="insight-note">
                    <ShieldCheck size={15} />
                    <span>Automated suggestions should be verified by a human reviewer.</span>
                  </div>
                </section>
              </div>

              <section className="workflow-strip">
                <div className="section-heading">
                  <div>
                    <div className="eyebrow small-eyebrow">THE VEDHA WORKFLOW</div>
                    <h2>From report to resolution</h2>
                  </div>
                </div>
                <div className="workflow-steps">
                  <WorkflowStep number="01" title="Collect" text="Capture the issue and location." icon={<ClipboardList size={18} />} />
                  <ChevronRight className="workflow-arrow" size={18} />
                  <WorkflowStep number="02" title="Triage" text="Suggest category and urgency." icon={<Sparkles size={18} />} />
                  <ChevronRight className="workflow-arrow" size={18} />
                  <WorkflowStep number="03" title="Detect" text="Find potentially similar reports." icon={<FileSearch size={18} />} />
                  <ChevronRight className="workflow-arrow" size={18} />
                  <WorkflowStep number="04" title="Resolve" text="Human reviewer updates status." icon={<CheckCircle2 size={18} />} />
                </div>
              </section>
            </>
          )}

          {section === "AI Triage" && (
            <>
              <PageHeading
                eyebrow="INTELLIGENCE ENGINE"
                title="AI complaint triage"
                description="Classify a new report, estimate urgency, and recommend the next action."
              />

              <div className="triage-layout">
                <section className="panel triage-form-panel">
                  <PanelTitle
                    icon={<Sparkles size={17} />}
                    title="New complaint analysis"
                    subtitle="Describe the problem in plain language"
                  />

                  <label className="field-label" htmlFor="complaint-description">
                    Complaint description <span>*</span>
                  </label>
                  <textarea
                    id="complaint-description"
                    className="text-area"
                    value={description}
                    onChange={e => {
                      setDescription(e.target.value);
                      setAnalysis(null);
                    }}
                    placeholder="Example: An exposed electrical wire is sparking near the hostel entrance..."
                    rows={6}
                  />
                  <div className="field-helper">
                    Include the issue, its impact, and any immediate safety concerns.
                  </div>

                  <label className="field-label" htmlFor="complaint-location">
                    Location <span>*</span>
                  </label>
                  <input
                    id="complaint-location"
                    className="text-input"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. Block A, ground floor"
                  />

                  <div className="example-prompts">
                    <span>Quick examples</span>
                    <button onClick={() => {
                      setDescription("An exposed electrical wire is sparking near the hostel entrance.");
                      setLocation("Hostel entrance");
                      setAnalysis(null);
                    }}>Electrical hazard</button>
                    <button onClick={() => {
                      setDescription("Water supply has stopped in the hostel since morning.");
                      setLocation("Hostel Block A");
                      setAnalysis(null);
                    }}>Water outage</button>
                    <button onClick={() => {
                      setDescription("Garbage bins are overflowing near the cafeteria.");
                      setLocation("Cafeteria");
                      setAnalysis(null);
                    }}>Garbage issue</button>
                  </div>

                  <button
                    className="primary-button full-button"
                    onClick={runAnalysis}
                    disabled={loading}
                  >
                    <Sparkles size={17} />
                    {loading ? "Analyzing with backend…" : "Run triage analysis"}
                    {!loading && <ArrowRight size={16} />}
                  </button>
                  <p className="disclaimer">
                    <ShieldCheck size={14} /> Decision support only. Human review is required.
                  </p>
                </section>

                <section className={`panel analysis-panel ${analysis ? "analysis-ready" : ""}`}>
                  <div className="analysis-panel-head">
                    <div className="analysis-symbol"><Activity size={22} /></div>
                    <div>
                      <div className="eyebrow small-eyebrow">ANALYSIS OUTPUT</div>
                      <h3>{analysis ? "Analysis complete" : "Awaiting input"}</h3>
                    </div>
                    <span className={`analysis-state ${analysis ? "state-ready" : ""}`}>
                      <span className="pulse-dot" /> {analysis ? "COMPLETE" : "READY"}
                    </span>
                  </div>

                  {!analysis ? (
                    <div className="empty-analysis">
                      <div className="empty-rings"><Sparkles size={28} /></div>
                      <strong>Your analysis appears here</strong>
                      <p>Run triage to view the suggested category, urgency, department, and next action.</p>
                      <div className="mini-feature-list">
                        <span><CheckCircle2 size={14} /> Category classification</span>
                        <span><CheckCircle2 size={14} /> Urgency recommendation</span>
                        <span><CheckCircle2 size={14} /> Action suggestion</span>
                      </div>
                    </div>
                  ) : (
                    <div className="analysis-results">
                      <div className="result-label">SUGGESTED URGENCY</div>
                      <div className="result-urgency-row">
                        <span className={urgencyClass(analysis.urgency)}>{analysis.urgency}</span>
                        <span className="confidence-note">FastAPI result · verify before action</span>
                      </div>
                      <div className="result-divider" />
                      <div className="result-label">CLASSIFICATION</div>
                      <div className="result-value">{analysis.category}</div>
                      <div className="result-label">RESPONSIBLE DEPARTMENT</div>
                      <div className="result-value">{analysis.department}</div>
                      <div className="result-label">RECOMMENDED NEXT ACTION</div>
                      <div className="recommendation">
                        <Zap size={16} /><span>{analysis.action}</span>
                      </div>
                      <div className="reason-box">
                        <strong>Why this result?</strong><p>{analysis.reason}</p>
                      </div>
                      <button className="primary-button full-button" onClick={submitComplaint}>
                        <Plus size={17} /> Submit to review queue <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                </section>
              </div>
            </>
          )}

          {section === "Complaints" && (
            <>
              <PageHeading
                eyebrow="REPORT MANAGEMENT"
                title="Complaint registry"
                description="Search reports, review suggested urgency, and update case status."
                action={
                  <button
                    className="primary-button"
                    onClick={() => {
                      setDescription("");
                      setLocation("");
                      setAnalysis(null);
                      navigate("AI Triage");
                    }}
                  >
                    <Plus size={17} /> New complaint
                  </button>
                }
              />
              <ComplaintFilters
                search={search}
                setSearch={setSearch}
                urgency={filter}
                setUrgency={setFilter}
                count={visibleComplaints.length}
              />
              <section className="panel full-table-panel">
                <ComplaintTable complaints={visibleComplaints} onStatus={updateStatus} />
              </section>
            </>
          )}

          {section === "Duplicate Detection" && (
            <>
              <PageHeading
                eyebrow="SIMILARITY CHECK"
                title="Duplicate detection"
                description="Find existing reports that may describe the same issue."
              />

              <div className="duplicate-layout">
                <section className="panel duplicate-input-panel">
                  <PanelTitle
                    icon={<FileSearch size={17} />}
                    title="Check a new report"
                    subtitle="Compare it with existing complaint text"
                  />
                  <label className="field-label" htmlFor="duplicate-description">
                    Complaint to compare
                  </label>
                  <textarea
                    id="duplicate-description"
                    className="text-area"
                    rows={5}
                    value={duplicateText}
                    onChange={e => setDuplicateText(e.target.value)}
                    placeholder="e.g. The hostel has no water supply since morning..."
                  />
                  <div className="duplicate-tip">
                    <ShieldCheck size={15} /> This demo uses word overlap against the current registry, not the backend semantic detector.
                  </div>
                  <div className="duplicate-actions">
                    <button
                      className="primary-button"
                      onClick={() => {
                        if (duplicateText.trim().length < 5) {
                          notify("Enter a complaint to compare.");
                        } else {
                          notify(`${duplicateMatches.length} possible match(es) found.`);
                        }
                      }}
                    >
                      <Search size={16} /> Find similar reports
                    </button>
                    <button className="secondary-button" onClick={() => setDuplicateText("")}>
                      Clear
                    </button>
                  </div>
                </section>

                <section className="panel duplicate-results-panel">
                  <PanelTitle
                    icon={<Target size={17} />}
                    title="Potential matches"
                    subtitle={`${duplicateMatches.length} matching reports`}
                  />
                  {!duplicateText.trim() ? (
                    <EmptyState
                      icon={<FileSearch size={25} />}
                      title="Ready to compare"
                      text="Enter a complaint to see possible matches from the current registry."
                    />
                  ) : duplicateMatches.length === 0 ? (
                    <EmptyState
                      icon={<CheckCircle2 size={25} />}
                      title="No likely matches found"
                      text="No reports passed the current word-overlap threshold. This does not guarantee the report is unique."
                    />
                  ) : (
                    <div className="duplicate-list">
                      {duplicateMatches.map(item => (
                        <div className="duplicate-item" key={item.id}>
                          <div className="duplicate-score">
                            {Math.round(item.score * 100)}<small>%</small>
                          </div>
                          <div className="duplicate-item-info">
                            <strong>{item.title}</strong>
                            <span>{item.id} · {item.location}</span>
                            <div className="duplicate-item-meta">
                              <span className={urgencyClass(item.urgency)}>{item.urgency}</span>
                              <span className={`status status-${item.status.toLowerCase()}`}>{item.status}</span>
                            </div>
                          </div>
                          <button
                            className="icon-button"
                            onClick={() => notify(`Review ${item.id} in Complaints.`)}
                            aria-label={`Review ${item.id}`}
                          >
                            <ArrowRight size={17} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </>
          )}

          {section === "Review Queue" && (
            <>
              <PageHeading
                eyebrow="HUMAN OVERSIGHT"
                title="Review queue"
                description="Verify reports and urgency recommendations before assigning or resolving cases."
              />
              <div className="review-banner">
                <div className="review-banner-icon"><ShieldCheck size={23} /></div>
                <div>
                  <strong>Human-in-the-loop review</strong>
                  <p>Automated recommendations support decisions but do not replace human judgment.</p>
                </div>
                <div className="review-banner-count">
                  <strong>{stats.pending}</strong><span>pending</span>
                </div>
              </div>
              <ComplaintFilters
                search={search}
                setSearch={setSearch}
                urgency={filter}
                setUrgency={setFilter}
                count={visibleComplaints.length}
              />
              <section className="panel full-table-panel">
                <ComplaintTable complaints={visibleComplaints} onStatus={updateStatus}  />
              </section>
            </>
          )}

          {section === "History" && (
            <>
              <PageHeading
                eyebrow="ACTIVITY LOG"
                title="Complaint history"
                description="Track complaint submissions and status changes recorded during this session."
                action={
                  <button
                    className="primary-button"
                    onClick={downloadHistory}
                    disabled={historyEntries.length === 0}
                  >
                    <Download size={17} /> Download history
                  </button>
                }
              />

              <div className="history-summary-grid">
                <div className="history-summary-card">
                  <Clock3 size={20} />
                  <span>Recorded activities</span>
                  <strong>{historyEntries.length}</strong>
                </div>
                <div className="history-summary-card">
                  <ClipboardList size={20} />
                  <span>Complaints tracked</span>
                  <strong>{new Set(historyEntries.map(item => item.complaintId)).size}</strong>
                </div>
              </div>

              <section className="panel history-panel">
                <PanelTitle
                  icon={<RefreshCw size={17} />}
                  title="Activity timeline"
                  subtitle="Newest activity appears first"
                />

                {historyEntries.length === 0 ? (
                  <EmptyState
                    icon={<Clock3 size={25} />}
                    title="No history recorded yet"
                    text="Submit a complaint or change a complaint's status to start building the activity history."
                  />
                ) : (
                  <div className="history-list">
                    {historyEntries.map(item => (
                      <div className="history-item" key={item.id}>
                        <div className="history-icon"><CheckCircle2 size={18} /></div>
                        <div className="history-item-content">
                          <strong>{item.action}</strong>
                          <p>{item.title}</p>
                          <span>{item.complaintId} · {item.timestamp}</span>
                        </div>
                        <span className={`status status-${item.status.toLowerCase()}`}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {section === "Download Report" && (
            <>
              <PageHeading
                eyebrow="DATA EXPORT"
                title="Download reports"
                description="Export VEDHA complaint records and recorded activity for review and documentation."
              />

              <div className="report-download-grid">
                <section className="panel report-download-card">
                  <div className="report-download-icon"><ClipboardList size={25} /></div>
                  <span className="eyebrow small-eyebrow">COMPLAINT REGISTRY</span>
                  <h3>Complete complaint report</h3>
                  <p>
                    Export complaint IDs, descriptions, locations, categories,
                    urgency levels, current statuses, departments, and creation labels.
                  </p>
                  <div className="report-download-meta">
                    <span>Available records</span>
                    <strong>{complaints.length}</strong>
                  </div>
                  <button
                    className="primary-button full-button"
                    onClick={downloadReport}
                    disabled={complaints.length === 0}
                  >
                    <Download size={17} /> Download CSV report
                  </button>
                </section>

                <section className="panel report-download-card">
                  <div className="report-download-icon"><Clock3 size={25} /></div>
                  <span className="eyebrow small-eyebrow">ACTIVITY TRACKING</span>
                  <h3>History report</h3>
                  <p>
                    Export recorded complaint submissions and status changes,
                    including the action, status, and timestamp.
                  </p>
                  <div className="report-download-meta">
                    <span>Recorded activities</span>
                    <strong>{historyEntries.length}</strong>
                  </div>
                  <button
                    className="secondary-button full-button"
                    onClick={downloadHistory}
                    disabled={historyEntries.length === 0}
                  >
                    <Download size={17} /> Download history CSV
                  </button>
                </section>
              </div>

              <div className="report-format-note">
                <ShieldCheck size={17} />
                <p>
                  Reports download as CSV files that can be opened in Excel or Google Sheets.
                  The complaint report includes current records; the history report includes
                  activities recorded during this session.
                </p>
              </div>
            </>
          )}

          <footer className="page-footer">
            <span><span className="footer-dot" /> VEDHA SYSTEM ACTIVE</span>
            <span>Explainable triage · Human-reviewed decisions</span>
            <span>Hackathon prototype</span>
          </footer>
        </div>
      </main>

      {toast && (
        <div className="toast-message">
          <CheckCircle2 size={18} />
          <span>{toast}</span>
          <button onClick={() => setToast("")} aria-label="Dismiss notification">
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow small-eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="heading-action">{action}</div>}
    </div>
  );
}

function PanelTitle({
  icon,
  title,
  subtitle,
  action,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="panel-title">
      <div className="panel-title-icon">{icon}</div>
      <div className="panel-title-copy">
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      {action && (
        <button className="text-action" onClick={onAction}>
          {action} <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  caption,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  caption: string;
  accent: string;
}) {
  return (
    <div className={`stat-card stat-${accent}`}>
      <div className="stat-top">
        <div className="stat-icon">{icon}</div>
        <span className="stat-indicator"><span /> LIVE</span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-bottom"><span>{caption}</span></div>
      <div className="stat-glow" />
    </div>
  );
}

function WorkflowStep({
  number,
  icon,
  title,
  text,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="workflow-step">
      <div className="workflow-step-top">
        <span className="workflow-number">{number}</span>
        <span className="workflow-icon">{icon}</span>
      </div>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function ComplaintFilters({
  search,
  setSearch,
  urgency,
  setUrgency,
  count,
}: {
  search: string;
  setSearch: (v: string) => void;
  urgency: string;
  setUrgency: (v: string) => void;
  count: number;
}) {
  return (
    <div className="filter-toolbar">
      <div className="search-box">
        <Search size={17} />
        <input
          aria-label="Search complaints"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search ID, title, location..."
        />
        {search && (
          <button onClick={() => setSearch("")} aria-label="Clear search">
            <X size={14} />
          </button>
        )}
      </div>
      <div className="filter-select">
        <Activity size={15} />
        <select
          aria-label="Filter urgency"
          value={urgency}
          onChange={e => setUrgency(e.target.value)}
        >
          <option value="All">All urgencies</option>
          <option>Critical</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
      </div>
      <div className="result-count">{count} reports</div>
    </div>
  );
}

function ComplaintTable({
  complaints,
  onStatus,
  compact = false,
}: {
  complaints: Complaint[];
  onStatus: (id: string, status: Status) => void;
  compact?: boolean;
  reviewMode?: boolean;
}) {
  if (!complaints.length) {
    return (
      <EmptyState
        icon={<Search size={24} />}
        title="No complaints found"
        text="Try changing your search or urgency filter."
      />
    );
  }

  return (
    <div className="table-scroll">
      <table className="complaint-table">
        <thead>
          <tr>
            <th>REPORT</th>
            <th>LOCATION</th>
            <th>URGENCY</th>
            <th>STATUS</th>
            {!compact && <th>DEPARTMENT</th>}
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>
          {complaints.map(item => (
            <tr key={item.id}>
              <td>
                <div className="report-cell">
                  <span className="report-id">{item.id}</span>
                  <strong>{item.title}</strong>
                  <span className="report-time">{item.created}</span>
                </div>
              </td>
              <td><span className="location-cell">{item.location}</span></td>
              <td>
                <span className={urgencyClass(item.urgency)}>
                  <span className="urgency-dot" />{item.urgency}
                </span>
              </td>
              <td>
                <span className={`status status-${item.status.toLowerCase()}`}>
                  {item.status}
                </span>
              </td>
              {!compact && (
                <td><span className="department-cell">{item.department}</span></td>
              )}
              <td>
                <div className="table-actions">
                  {item.status !== "Resolved" ? (
                    <button
                      className="action-button"
                      onClick={() =>
                        onStatus(
                          item.id,
                          item.status === "Pending" ? "Assigned" : "Resolved"
                        )
                      }
                      title={item.status === "Pending" ? "Assign complaint" : "Resolve complaint"}
                    >
                      {item.status === "Pending"
                        ? <ShieldCheck size={15} />
                        : <CheckCircle2 size={15} />}
                      <span>{item.status === "Pending" ? "Assign" : "Resolve"}</span>
                    </button>
                  ) : (
                    <span className="done-label">
                      <CheckCircle2 size={14} /> Done
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}
