import { useEffect, useState } from "react";
import { call, loadSettings } from "./api";
import Settings from "./Settings";

interface GenerationResult {
  output: {
    schema_version: string;
    input_id: string;
    template: string;
    course: {
      title: string;
      code: string;
      department: string;
      credits_ltp: string;
      course_type: string;
      summary: string;
    };
    course_outcomes: Array<{ id: string; statement: string; bloom_level: number }>;
    units: Array<{ number: number; title: string; lab: string | null }>;
    co_po_pso_map: Record<string, Record<string, { level: number; justification: string } | null>>;
    teaching_hours: { lectures: number; lab: number; tests_exams: number; total: number };
    assessment: {
      components: Array<{ name: string; weight_percent: number }>;
      co_coverage: Record<string, string[]>;
    };
    defects: Array<{
      code: string;
      location: { source: string; section: number | null; refs: string[] };
      description: string;
      fix: string;
    }>;
  };
  html: string;
}

export default function App() {
  const [openSettings, setOpenSettings] = useState(false);
  const [health, setHealth] = useState("checking...");
  const [role, setRole] = useState<"Author" | "Reviewer" | "HOD">("Author");
  const [specFile, setSpecFile] = useState<File | null>(null);
  const [blueprintFile, setBlueprintFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "matrix" | "defects" | "preview">("overview");

  useEffect(() => {
    call<{ status: string }>("/health")
      .then((d) => setHealth(d.status))
      .catch(() => setHealth("offline"));
  }, []);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const s = loadSettings();
    if (!s.key) {
      setError("Please add your AI provider API key in Settings first.");
      setOpenSettings(true);
      return;
    }

    if (!specFile) {
      setError("Please select a Course Specification file (.docx, .doc, .pdf, or .html).");
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append("spec", specFile);
      if (blueprintFile) {
        form.append("blueprint", blueprintFile);
      }

      const res = await call<GenerationResult>("/generate", {
        method: "POST",
        body: form,
      });

      setResult(res);
      setActiveTab("overview");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function downloadJson() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result.output, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "specforge_output.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadHtml() {
    if (!result) return;
    const blob = new Blob([result.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "spec.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px", fontFamily: "sans-serif", color: "#1f2937" }}>
      {/* Header bar */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "2px solid #1a3d7c",
          paddingBottom: "12px",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <h1 style={{ margin: 0, fontSize: "22px", color: "#1a3d7c" }}>SYLLAB~ATE: SpecForge Builder</h1>
          <span
            style={{
              fontSize: "12px",
              padding: "3px 8px",
              borderRadius: "12px",
              background: health === "up" ? "#dcfce7" : "#fee2e2",
              color: health === "up" ? "#166534" : "#991b1b",
              fontWeight: 600,
            }}
          >
            Server: {health}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <label style={{ fontSize: "13px", fontWeight: 500 }}>
            Role:
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              style={{ marginLeft: "6px", padding: "4px 8px", borderRadius: "4px", border: "1px solid #ccc" }}
            >
              <option value="Author">Author</option>
              <option value="Reviewer">Reviewer</option>
              <option value="HOD">HOD</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => setOpenSettings(true)}
            style={{
              padding: "6px 14px",
              background: "#1a3d7c",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            ⚙️ Settings
          </button>
        </div>
      </header>

      {/* Main Generation Panel */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px", alignItems: "start" }}>
        {/* Left Column: Upload Form */}
        <section
          style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "16px",
          }}
        >
          <h2 style={{ fontSize: "16px", marginTop: 0, marginBottom: "12px", color: "#111827" }}>
            Upload Documents
          </h2>

          <form onSubmit={handleGenerate} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                Course Specification <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="file"
                accept=".docx,.doc,.pdf,.html,.htm"
                onChange={(e) => setSpecFile(e.target.files?.[0] || null)}
                style={{ width: "100%", fontSize: "13px" }}
              />
              <span style={{ fontSize: "11px", color: "#6b7280" }}>.docx, .doc, .pdf, or .html</span>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                Blueprint (Optional)
              </label>
              <input
                type="file"
                accept=".docx,.doc,.pdf,.html,.htm"
                onChange={(e) => setBlueprintFile(e.target.files?.[0] || null)}
                style={{ width: "100%", fontSize: "13px" }}
              />
              <span style={{ fontSize: "11px", color: "#6b7280" }}>Question paper blueprint</span>
            </div>

            {error && (
              <div
                style={{
                  background: "#fee2e2",
                  color: "#991b1b",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !specFile}
              style={{
                padding: "10px",
                background: loading || !specFile ? "#9ca3af" : "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontWeight: 600,
                cursor: loading || !specFile ? "not-allowed" : "pointer",
                marginTop: "6px",
              }}
            >
              {loading ? "Generating Specification..." : "Generate Specification & Output"}
            </button>
          </form>

          {result && (
            <div style={{ marginTop: "20px", borderTop: "1px solid #e5e7eb", paddingTop: "14px" }}>
              <h3 style={{ fontSize: "14px", margin: "0 0 10px 0" }}>Export Files</h3>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={downloadJson}
                  style={{
                    flex: 1,
                    padding: "8px",
                    background: "#059669",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Download JSON
                </button>
                <button
                  type="button"
                  onClick={downloadHtml}
                  style={{
                    flex: 1,
                    padding: "8px",
                    background: "#4f46e5",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Download HTML
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Right Column: Output Viewer */}
        <section
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "16px",
            minHeight: "450px",
          }}
        >
          {!result && !loading && (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#6b7280" }}>
              <p style={{ fontSize: "15px", marginBottom: "8px" }}>No course specification generated yet.</p>
              <p style={{ fontSize: "13px" }}>
                Select a course specification file on the left and click <strong>Generate</strong>.
              </p>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: "center", padding: "80px 20px", color: "#2563eb" }}>
              <p style={{ fontSize: "16px", fontWeight: 600 }}>Analyzing course structure with AI...</p>
              <p style={{ fontSize: "13px", color: "#6b7280" }}>
                Extracting syllabus, verifying Bloom's taxonomy, calculating CO-PO map, and compiling compliance defects.
              </p>
            </div>
          )}

          {result && !loading && (
            <div>
              {/* Tab navigation */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  borderBottom: "1px solid #e5e7eb",
                  paddingBottom: "8px",
                  marginBottom: "14px",
                }}
              >
                {[
                  { id: "overview", label: "Overview" },
                  { id: "matrix", label: `CO-PO-PSO Map (${result.output.course_outcomes.length} COs)` },
                  { id: "defects", label: `Defects (${result.output.defects.length})` },
                  { id: "preview", label: "Spec Preview" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id as any)}
                    style={{
                      padding: "6px 12px",
                      background: activeTab === t.id ? "#1a3d7c" : "transparent",
                      color: activeTab === t.id ? "#fff" : "#4b5563",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              {activeTab === "overview" && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", marginBottom: "16px" }}>
                    <div style={{ background: "#f3f4f6", padding: "10px", borderRadius: "6px" }}>
                      <span style={{ fontSize: "11px", color: "#6b7280" }}>Course Title</span>
                      <div style={{ fontWeight: 600, fontSize: "14px" }}>{result.output.course.title}</div>
                    </div>
                    <div style={{ background: "#f3f4f6", padding: "10px", borderRadius: "6px" }}>
                      <span style={{ fontSize: "11px", color: "#6b7280" }}>Course Code & LTP</span>
                      <div style={{ fontWeight: 600, fontSize: "14px" }}>
                        {result.output.course.code} ({result.output.course.credits_ltp})
                      </div>
                    </div>
                    <div style={{ background: "#f3f4f6", padding: "10px", borderRadius: "6px" }}>
                      <span style={{ fontSize: "11px", color: "#6b7280" }}>Template</span>
                      <div style={{ fontWeight: 600, fontSize: "14px", textTransform: "capitalize" }}>
                        {result.output.template}
                      </div>
                    </div>
                    <div style={{ background: "#f3f4f6", padding: "10px", borderRadius: "6px" }}>
                      <span style={{ fontSize: "11px", color: "#6b7280" }}>Total Hours</span>
                      <div style={{ fontWeight: 600, fontSize: "14px" }}>
                        {result.output.teaching_hours.total} hrs ({result.output.teaching_hours.lectures}L + {result.output.teaching_hours.lab}P)
                      </div>
                    </div>
                  </div>

                  <h3 style={{ fontSize: "14px", margin: "14px 0 8px" }}>Course Summary</h3>
                  <p style={{ fontSize: "13px", lineHeight: "1.5", color: "#374151" }}>{result.output.course.summary}</p>

                  <h3 style={{ fontSize: "14px", margin: "14px 0 8px" }}>Course Outcomes</h3>
                  <ul style={{ paddingLeft: "20px", fontSize: "13px", lineHeight: "1.6" }}>
                    {result.output.course_outcomes.map((co) => (
                      <li key={co.id}>
                        <strong>{co.id}:</strong> {co.statement}{" "}
                        <span style={{ color: "#2563eb", fontWeight: 600 }}>(Bloom's Level L{co.bloom_level})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeTab === "matrix" && (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead>
                      <tr style={{ background: "#1a3d7c", color: "#fff" }}>
                        <th style={{ padding: "8px", border: "1px solid #ccc" }}>CO</th>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((p) => (
                          <th key={p} style={{ padding: "8px", border: "1px solid #ccc" }}>PO-{p}</th>
                        ))}
                        <th style={{ padding: "8px", border: "1px solid #ccc" }}>PSO-1</th>
                        <th style={{ padding: "8px", border: "1px solid #ccc" }}>PSO-2</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.output.course_outcomes.map((co) => (
                        <tr key={co.id}>
                          <td style={{ padding: "6px", border: "1px solid #ccc", fontWeight: 600 }}>{co.id}</td>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((p) => {
                            const cell = result.output.co_po_pso_map[co.id]?.[`PO-${p}`];
                            return (
                              <td
                                key={p}
                                title={cell?.justification}
                                style={{
                                  padding: "6px",
                                  border: "1px solid #ccc",
                                  textAlign: "center",
                                  background: cell?.level ? "#e0f2fe" : "#fff",
                                  fontWeight: cell?.level ? 600 : "normal",
                                }}
                              >
                                {cell?.level ?? ""}
                              </td>
                            );
                          })}
                          {[1, 2].map((ps) => {
                            const cell = result.output.co_po_pso_map[co.id]?.[`PSO-${ps}`];
                            return (
                              <td
                                key={ps}
                                title={cell?.justification}
                                style={{
                                  padding: "6px",
                                  border: "1px solid #ccc",
                                  textAlign: "center",
                                  background: cell?.level ? "#fef3c7" : "#fff",
                                  fontWeight: cell?.level ? 600 : "normal",
                                }}
                              >
                                {cell?.level ?? ""}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "defects" && (
                <div>
                  {result.output.defects.length === 0 ? (
                    <p style={{ fontSize: "13px", color: "#059669" }}>No statutory compliance defects detected.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {result.output.defects.map((d, i) => (
                        <div
                          key={i}
                          style={{
                            border: "1px solid #fecaca",
                            background: "#fff5f5",
                            borderRadius: "6px",
                            padding: "10px",
                            fontSize: "12px",
                          }}
                        >
                          <div style={{ fontWeight: 600, color: "#991b1b", marginBottom: "4px" }}>
                            [{d.code}] {d.location.section ? `Section ${d.location.section}` : "Course Spec"}
                          </div>
                          <div style={{ marginBottom: "4px" }}>{d.description}</div>
                          <div style={{ color: "#047857", fontWeight: 500 }}>Fix applied: {d.fix}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "preview" && (
                <div style={{ border: "1px solid #ccc", borderRadius: "6px", overflow: "hidden" }}>
                  <iframe
                    srcDoc={result.html}
                    title="Spec Preview"
                    style={{ width: "100%", height: "550px", border: "none" }}
                  />
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {openSettings && <Settings onClose={() => setOpenSettings(false)} />}
    </div>
  );
}
