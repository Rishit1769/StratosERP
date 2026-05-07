"use client";

import { useEffect, useMemo, useState } from "react";
import type { ActionBlueprint, RoleBlueprint } from "@/lib/role-blueprints";

type ActionState = {
  loading: boolean;
  status?: number;
  ok?: boolean;
  durationMs?: number;
  payload?: unknown;
  error?: string;
};

type SidebarSection = {
  id: string;
  title: string;
  detail: string;
  actionIds: string[];
};

const TOKEN_KEY = "stratos.jwtToken";
const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

const CSV_TEMPLATES: Record<string, string> = {
  "admin-ingest-students":
    "uid,email_id,current_semester,academic_year,password\n2023-CSE-A-01-2027,student1@tcetmumbai.in,5,3rd,Welcome@123\n",
  "admin-ingest-faculty":
    "name,email_id,designation_role,is_admin,is_hod,password\nProf. A Patil,apatil@tcetmumbai.in,Subject Incharge,false,false,Faculty@123\n",
  "admin-ingest-subjects":
    "name,semester_level,has_lab,lab_marks_weight\nData Structures,3,true,30\n",
  "admin-ingest-timetable":
    "day_of_week,start_time,end_time,subject_id,faculty_id\nMonday,09:00:00,10:00:00,1,1\n",
  "admin-config-set": "active_semester_type,start_date,end_date\nODD,2026-07-15,2026-12-10\n",
  "admin-exam-seating": "room,capacity\nA-301,60\nA-302,48\n",
  "admin-invigilation": "exam_date\n2026-05-25\n",
  "admin-notice-create":
    "title,target_audience,ai_filter_tags\nInternal assessment schedule updated,INSTITUTE,ACADEMIC|IMPORTANT\n",
  "admin-notice-ai":
    "context,target_audience\nSend low attendance warning to Semester 5 students below 75% attendance.,INSTITUTE\n",
};

function prettyPrint(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "Unable to render response.";
  }
}

function escapeCsvCell(value: unknown): string {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsvText(text: string): Array<Record<string, string>> {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = values[index] ?? "";
      return acc;
    }, {});
  });
}

function coerceValue(value: string): unknown {
  const normalized = value.trim();
  if (!normalized) return "";

  if (normalized.toLowerCase() === "true") return true;
  if (normalized.toLowerCase() === "false") return false;

  const asNumber = Number(normalized);
  if (!Number.isNaN(asNumber) && /^-?\d+(\.\d+)?$/.test(normalized)) {
    return asNumber;
  }

  return normalized;
}

function convertRowsToPayload(actionId: string, rows: Array<Record<string, string>>): Record<string, unknown> {
  if (!rows.length) return {};

  if (actionId === "admin-config-set") {
    const row = rows[0];
    return {
      active_semester_type: row.active_semester_type || "ODD",
      start_date: row.start_date || "",
      end_date: row.end_date || "",
    };
  }

  if (actionId === "admin-exam-seating") {
    return {
      classrooms: rows.map((row) => ({
        room: row.room,
        capacity: Number(row.capacity || 0),
      })),
    };
  }

  if (actionId === "admin-invigilation") {
    return {
      exam_date: rows[0].exam_date || "",
    };
  }

  if (actionId === "admin-notice-create") {
    const row = rows[0];
    return {
      title: row.title || "",
      target_audience: row.target_audience || "INSTITUTE",
      ai_filter_tags: (row.ai_filter_tags || "")
        .split(/[|;,]/)
        .map((item) => item.trim())
        .filter(Boolean),
    };
  }

  if (actionId === "admin-notice-ai") {
    const row = rows[0];
    return {
      context: row.context || "",
      target_audience: row.target_audience || "INSTITUTE",
    };
  }

  const convertedRows = rows.map((row) => {
    return Object.entries(row).reduce<Record<string, unknown>>((acc, [key, value]) => {
      acc[key] = coerceValue(value);
      return acc;
    }, {});
  });

  return convertedRows.length === 1 ? convertedRows[0] : { records: convertedRows };
}

function buildBodyTemplate(action: ActionBlueprint): string {
  if (!action.body) return "";

  const keys = Object.keys(action.body);
  if (!keys.length) return "";

  const values = keys.map((key) => {
    const raw = action.body?.[key as keyof typeof action.body];
    return typeof raw === "object" ? JSON.stringify(raw) : String(raw ?? "");
  });

  return `${keys.join(",")}\n${values.map(escapeCsvCell).join(",")}\n`;
}

function buildSections(role: RoleBlueprint): SidebarSection[] {
  if (role.slug !== "admin") {
    return [
      {
        id: "operations",
        title: "Operations",
        detail: "Run tasks for this role",
        actionIds: role.actions.map((action) => action.id),
      },
    ];
  }

  return [
    {
      id: "configuration",
      title: "Configuration",
      detail: "Semester and policy setup",
      actionIds: ["admin-config-get", "admin-config-set"],
    },
    {
      id: "ingestion",
      title: "Ingestion",
      detail: "Students, faculty, subjects, timetable",
      actionIds: [
        "admin-ingest-students",
        "admin-ingest-faculty",
        "admin-ingest-subjects",
        "admin-ingest-timetable",
      ],
    },
    {
      id: "semester",
      title: "Semester Progression",
      detail: "Promotion and transition controls",
      actionIds: ["admin-progress", "admin-config-get"],
    },
    {
      id: "exams",
      title: "Exam Planning",
      detail: "Seating and invigilation setup",
      actionIds: ["admin-exam-seating", "admin-invigilation"],
    },
    {
      id: "notices",
      title: "Notices",
      detail: "Create and review notices",
      actionIds: ["admin-notice-create", "admin-notice-ai", "admin-notice-list"],
    },
    {
      id: "records",
      title: "Records",
      detail: "Faculty, students, alumni and analytics",
      actionIds: ["admin-faculty-list", "admin-students-list", "admin-alumni-list", "admin-analytics"],
    },
  ];
}

export default function RoleWorkspace({ role }: { role: RoleBlueprint }) {
  const actionById = useMemo(() => {
    return role.actions.reduce<Record<string, ActionBlueprint>>((acc, action) => {
      acc[action.id] = action;
      return acc;
    }, {});
  }, [role.actions]);

  const sections = useMemo(() => buildSections(role), [role]);
  const [selectedSectionId, setSelectedSectionId] = useState(sections[0]?.id || "operations");
  const [token, setToken] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [bodyMap, setBodyMap] = useState<Record<string, string>>({});
  const [fileMap, setFileMap] = useState<Record<string, File | null>>({});
  const [csvFileMap, setCsvFileMap] = useState<Record<string, File | null>>({});
  const [actionState, setActionState] = useState<Record<string, ActionState>>({});

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_KEY) || "";
    setToken(storedToken);

    const nextBodyMap = role.actions.reduce<Record<string, string>>((acc, action) => {
      acc[action.id] = action.body ? JSON.stringify(action.body, null, 2) : "";
      return acc;
    }, {});

    setBodyMap(nextBodyMap);
    setFileMap({});
    setCsvFileMap({});
    setActionState({});
    setSearchQuery("");
    setSelectedSectionId(sections[0]?.id || "operations");
  }, [role.actions, sections]);

  const selectedSection = sections.find((section) => section.id === selectedSectionId) || sections[0];

  const visibleActions = useMemo(() => {
    if (!selectedSection) return [];
    const actions = selectedSection.actionIds
      .map((id) => actionById[id])
      .filter((action): action is ActionBlueprint => Boolean(action));

    const query = searchQuery.trim().toLowerCase();
    if (!query) return actions;

    return actions.filter((action) => {
      return (
        action.label.toLowerCase().includes(query) ||
        action.description.toLowerCase().includes(query)
      );
    });
  }, [actionById, searchQuery, selectedSection]);

  function downloadTemplate(action: ActionBlueprint): void {
    const template = CSV_TEMPLATES[action.id] || buildBodyTemplate(action);
    if (!template) {
      setActionState((prev) => ({
        ...prev,
        [action.id]: {
          ...prev[action.id],
          loading: false,
          error: "Template not available for this functionality.",
        },
      }));
      return;
    }

    const blob = new Blob([template], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${action.id}.template.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  async function convertCsvToJson(action: ActionBlueprint): Promise<void> {
    const csvFile = csvFileMap[action.id];
    if (!csvFile) {
      setActionState((prev) => ({
        ...prev,
        [action.id]: {
          ...prev[action.id],
          loading: false,
          error: "Please select a CSV file first.",
        },
      }));
      return;
    }

    try {
      const text = await csvFile.text();
      const rows = parseCsvText(text);
      if (!rows.length) {
        throw new Error("CSV file has no data rows.");
      }

      const payload = convertRowsToPayload(action.id, rows);
      setBodyMap((prev) => ({
        ...prev,
        [action.id]: JSON.stringify(payload, null, 2),
      }));

      setActionState((prev) => ({
        ...prev,
        [action.id]: {
          ...prev[action.id],
          loading: false,
          error: undefined,
        },
      }));
    } catch (error) {
      setActionState((prev) => ({
        ...prev,
        [action.id]: {
          ...prev[action.id],
          loading: false,
          error: error instanceof Error ? error.message : "Unable to parse CSV file.",
        },
      }));
    }
  }

  async function runAction(action: ActionBlueprint): Promise<void> {
    if (!token.trim()) {
      setActionState((prev) => ({
        ...prev,
        [action.id]: {
          loading: false,
          error: "Please login first.",
        },
      }));
      return;
    }

    const bodyText = bodyMap[action.id] || "";
    const isMultipart = action.transport === "multipart";
    const selectedFile = fileMap[action.id] || null;
    let parsedBody: Record<string, unknown> | undefined;

    if (action.method !== "GET" && action.method !== "DELETE" && bodyText.trim()) {
      try {
        const candidate = JSON.parse(bodyText);
        if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) {
          throw new Error("Payload must be a JSON object.");
        }
        parsedBody = candidate as Record<string, unknown>;
      } catch {
        setActionState((prev) => ({
          ...prev,
          [action.id]: {
            loading: false,
            error: "Please provide valid JSON.",
          },
        }));
        return;
      }
    }

    if (isMultipart && !selectedFile) {
      setActionState((prev) => ({
        ...prev,
        [action.id]: {
          loading: false,
          error: "Please attach the required CSV file.",
        },
      }));
      return;
    }

    setActionState((prev) => ({
      ...prev,
      [action.id]: {
        loading: true,
      },
    }));

    try {
      const response = await (async () => {
        if (!isMultipart) {
          return fetch("/api/proxy", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              baseUrl: DEFAULT_BASE_URL,
              path: action.path,
              method: action.method,
              token: token.trim(),
              bodyText,
            }),
          });
        }

        const formData = new FormData();
        formData.set("baseUrl", DEFAULT_BASE_URL);
        formData.set("path", action.path);
        formData.set("method", action.method);
        formData.set("fieldsJson", JSON.stringify(parsedBody || {}));
        formData.set("fileFieldName", action.fileFieldName || "file");
        formData.set("token", token.trim());
        formData.set("file", selectedFile as File);

        return fetch("/api/proxy", {
          method: "POST",
          body: formData,
        });
      })();

      const proxyPayload = (await response.json()) as {
        ok: boolean;
        status: number;
        durationMs: number;
        data: unknown;
        error?: string;
      };

      setActionState((prev) => ({
        ...prev,
        [action.id]: {
          loading: false,
          ok: response.ok && proxyPayload.ok,
          status: proxyPayload.status,
          durationMs: proxyPayload.durationMs,
          payload: proxyPayload.data,
          error: response.ok ? undefined : proxyPayload.error || "Request failed.",
        },
      }));
    } catch (error) {
      setActionState((prev) => ({
        ...prev,
        [action.id]: {
          loading: false,
          error: error instanceof Error ? error.message : "Unknown error.",
        },
      }));
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
      <aside className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] xl:sticky xl:top-5 xl:h-fit">
        <p className="px-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
          {role.roleName} Functions
        </p>
        <div className="mt-3 space-y-2">
          {sections.map((section) => {
            const selected = selectedSectionId === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setSelectedSectionId(section.id)}
                className={`w-full rounded-xl px-3 py-3 text-left transition ${
                  selected ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                <p className="text-sm font-semibold">{section.title}</p>
                <p className={`mt-1 text-xs ${selected ? "text-zinc-300" : "text-zinc-500"}`}>
                  {section.detail}
                </p>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">{selectedSection?.title || "Operations"}</h1>
            <p className="mt-1 text-sm text-zinc-600">{selectedSection?.detail}</p>
          </div>
          <label className="w-full max-w-md">
            <span className="sr-only">Search functionality</span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search functionality"
              className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:bg-white"
            />
          </label>
        </div>

        {!token ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Please login from the launcher before using this workspace.
          </p>
        ) : null}

        <div className="mt-5 space-y-4">
          {visibleActions.map((action) => {
            const state = actionState[action.id];
            const bodyText = bodyMap[action.id] || "";
            const selectedFile = fileMap[action.id];
            const csvInputFile = csvFileMap[action.id];
            const needsDetailsInput =
              action.method !== "GET" &&
              action.method !== "DELETE" &&
              !(action.transport === "multipart" && !action.body);

            return (
              <article key={action.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <h2 className="text-lg font-semibold text-zinc-900">{action.label}</h2>
                <p className="mt-1 text-sm text-zinc-600">{action.description}</p>

                {needsDetailsInput ? (
                  <>
                    <label className="mt-4 block">
                      <span className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Details</span>
                      <textarea
                        value={bodyText}
                        onChange={(event) =>
                          setBodyMap((prev) => ({
                            ...prev,
                            [action.id]: event.target.value,
                          }))
                        }
                        rows={8}
                        className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 outline-none transition focus:border-zinc-500"
                      />
                    </label>

                    <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-3">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">CSV Assist</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => downloadTemplate(action)}
                          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-100"
                        >
                          Download Template CSV
                        </button>
                        <input
                          type="file"
                          accept=".csv"
                          onChange={(event) =>
                            setCsvFileMap((prev) => ({
                              ...prev,
                              [action.id]: event.target.files?.[0] || null,
                            }))
                          }
                          className="block w-full max-w-xs cursor-pointer rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-900"
                        />
                        <button
                          type="button"
                          onClick={() => void convertCsvToJson(action)}
                          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-700"
                        >
                          Convert CSV to Form Data
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-zinc-500">
                        {csvInputFile ? `Selected: ${csvInputFile.name}` : "No CSV selected for conversion."}
                      </p>
                    </div>
                  </>
                ) : null}

                {action.transport === "multipart" ? (
                  <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-3">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">CSV Upload</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => downloadTemplate(action)}
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-100"
                      >
                        Download Template CSV
                      </button>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(event) =>
                          setFileMap((prev) => ({
                            ...prev,
                            [action.id]: event.target.files?.[0] || null,
                          }))
                        }
                        className="block w-full max-w-xs cursor-pointer rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-900"
                      />
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">
                      {selectedFile ? `Selected: ${selectedFile.name}` : "No file selected."}
                    </p>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void runAction(action)}
                    disabled={state?.loading}
                    className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-500"
                  >
                    {state?.loading ? "Running..." : "Execute"}
                  </button>

                  {state?.ok !== undefined ? (
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${state.ok ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                      {state.ok ? "Success" : "Failed"}
                    </span>
                  ) : null}

                  {state?.durationMs !== undefined ? (
                    <span className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700">
                      {state.durationMs} ms
                    </span>
                  ) : null}
                </div>

                {state?.error ? (
                  <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
                ) : null}

                {state?.payload !== undefined ? (
                  <pre className="mt-3 max-h-72 overflow-auto rounded-2xl bg-zinc-950 px-4 py-3 text-xs text-zinc-100">
                    {prettyPrint(state.payload)}
                  </pre>
                ) : null}
              </article>
            );
          })}

          {visibleActions.length === 0 ? (
            <p className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600">
              No functionality found in this section.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
