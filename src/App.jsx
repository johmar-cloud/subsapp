import React, { useEffect, useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

const DEFAULT_CATEGORIES = [
  "Productivity",
  "Security",
  "Social Media",
  "Entertainment",
  "Healthcare",
  "Banking",
  "Games",
];

const CURRENCIES = ["USD", "EUR", "SGD", "CHF", "CAD", "JPY"];

const BILLING_FREQUENCIES = ["Weekly", "Monthly", "Yearly", "Bi-yearly"];

const SUB_STATUSES = ["Active", "Cancelled"];

const STORAGE_KEY_SUBS = "subscription-manager:subscriptions";
const STORAGE_KEY_PROFILE = "subscription-manager:userProfile";
const STORAGE_KEY_REMINDERS = "subscription-manager:reminders";
const STORAGE_KEY_DAILY = "subscription-manager:dailyMeta";

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function addPeriodToDate(startDateStr, frequency) {
  if (!startDateStr) return "";
  const date = new Date(startDateStr);
  if (Number.isNaN(date.getTime())) return "";

  const result = new Date(date);

  switch (frequency) {
    case "Weekly":
      result.setDate(result.getDate() + 7);
      break;
    case "Monthly":
      result.setMonth(result.getMonth() + 1);
      break;
    case "Yearly":
      result.setFullYear(result.getFullYear() + 1);
      break;
    case "Bi-yearly":
      result.setFullYear(result.getFullYear() + 2);
      break;
    default:
      return "";
  }

  return result.toISOString().slice(0, 10); // YYYY-MM-DD
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;

  const today = new Date();
  const oneDayMs = 1000 * 60 * 60 * 24;

  const diffMs =
    Date.UTC(target.getFullYear(), target.getMonth(), target.getDate()) -
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

  return Math.round(diffMs / oneDayMs);
}

function loadFromStorage(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// MAIN APP
// ---------------------------------------------------------------------------

export default function App() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [userProfile, setUserProfile] = useState({
    name: "",
    email: "",
    remindersEnabled: true,
    reminderTime: "09:00", // HH:MM
  });
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [remindersSent, setRemindersSent] = useState({});
  const [dailyMeta, setDailyMeta] = useState({ lastRunDate: "" });

  // -------------------------------------------------------------------------
  // INITIAL LOAD
  // -------------------------------------------------------------------------
  useEffect(() => {
    const subs = loadFromStorage(STORAGE_KEY_SUBS, []);
    const profile = loadFromStorage(STORAGE_KEY_PROFILE, {
      name: "",
      email: "",
      remindersEnabled: true,
      reminderTime: "09:00",
    });
    const reminders = loadFromStorage(STORAGE_KEY_REMINDERS, {});
    const dm = loadFromStorage(STORAGE_KEY_DAILY, { lastRunDate: "" });

    setSubscriptions(subs);
    setUserProfile(profile);
    setRemindersSent(reminders);
    setDailyMeta(dm);

    if (!profile.name || !profile.email) {
      setShowProfileDialog(true);
    }
  }, []);

  // PERSIST
  useEffect(() => {
    saveToStorage(STORAGE_KEY_SUBS, subscriptions);
  }, [subscriptions]);

  useEffect(() => {
    saveToStorage(STORAGE_KEY_PROFILE, userProfile);
  }, [userProfile]);

  useEffect(() => {
    saveToStorage(STORAGE_KEY_REMINDERS, remindersSent);
  }, [remindersSent]);

  useEffect(() => {
    saveToStorage(STORAGE_KEY_DAILY, dailyMeta);
  }, [dailyMeta]);

  // -------------------------------------------------------------------------
  // DAILY REMINDER CHECK (FRONT-END ONLY)
  // -------------------------------------------------------------------------
  // This tries to send reminder emails once per day at userProfile.reminderTime
  // while the app is open in a tab.
  useEffect(() => {
    if (
      !userProfile.remindersEnabled ||
      !userProfile.reminderTime ||
      !userProfile.email
    ) {
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const hhmm = now.toTimeString().slice(0, 5); // "HH:MM"
      if (hhmm !== userProfile.reminderTime) return;

      const todayStr = now.toISOString().slice(0, 10);
      if (dailyMeta.lastRunDate === todayStr) return;

      // Build and "send" reminders for any subscription with < 5 days to renewal
      const updatedReminders = { ...remindersSent };
      let changed = false;

      subscriptions.forEach((sub) => {
        if (sub.status !== "Active") return;
        if (!sub.renewalDate) return;

        const d = daysUntil(sub.renewalDate);
        if (d == null) return;
        if (d >= 5 || d < 0) return; // only 0,1,2,3,4 days

        const key = `${sub.id}:${sub.renewalDate}`;
        if (updatedReminders[key]) return; // already reminded for this cycle

        const message = `Dear ${userProfile.name || "user"}, your subscription to ${
          sub.name || "(no name)"
        } will renew in less than ${d} days!`;

        // TODO: replace this console.log with a real email API call
        console.log("[Subscription Reminder EMAIL]", {
          to: userProfile.email,
          message,
        });

        // Example if you have a backend route:
        // fetch("/api/send-email", {
        //   method: "POST",
        //   headers: { "Content-Type": "application/json" },
        //   body: JSON.stringify({
        //     to: userProfile.email,
        //     subject: "Subscription renewal reminder",
        //     text: message,
        //   }),
        // });

        updatedReminders[key] = true;
        changed = true;
      });

      if (changed) {
        setRemindersSent(updatedReminders);
      }
      setDailyMeta({ lastRunDate: todayStr });
    }, 60 * 1000); // check every minute

    return () => clearInterval(interval);
  }, [
    subscriptions,
    userProfile,
    remindersSent,
    dailyMeta.lastRunDate,
  ]);

  // -------------------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------------------

  function handleProfileSave(e) {
    e.preventDefault();
    if (!userProfile.name || !userProfile.email) return;
    setShowProfileDialog(false);
  }

  function addSubscription() {
    const today = new Date().toISOString().slice(0, 10);

    setSubscriptions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "",
        category: "",
        categoryMode: "select",
        description: "",
        amount: "",
        currency: "USD",
        frequency: "Monthly",
        status: "Active",
        startDate: today,
        renewalDate: addPeriodToDate(today, "Monthly"),
      },
    ]);
  }

  function updateSubscription(id, patch) {
    setSubscriptions((prev) =>
      prev.map((sub) => {
        if (sub.id !== id) return sub;
        const next = { ...sub, ...patch };

        if (patch.frequency || patch.startDate) {
          const freq = patch.frequency || sub.frequency;
          const start = patch.startDate || sub.startDate;
          next.renewalDate = addPeriodToDate(start, freq);
        }

        return next;
      })
    );
  }

  function handleCategoryChange(id, value) {
    if (value === "__custom__") {
      updateSubscription(id, { categoryMode: "custom", category: "" });
      return;
    }
    updateSubscription(id, { categoryMode: "select", category: value });
  }

  function handleCustomCategoryBlur(id, value) {
    const trimmed = value.trim();
    if (!trimmed) return;

    setCategories((prev) =>
      prev.includes(trimmed) ? prev : [...prev, trimmed]
    );
    updateSubscription(id, { category: trimmed, categoryMode: "select" });
  }

  function renewSubscription(id) {
    const todayStr = new Date().toISOString().slice(0, 10);
    setSubscriptions((prev) =>
      prev.map((sub) => {
        if (sub.id !== id) return sub;
        const renewalDate = addPeriodToDate(todayStr, sub.frequency);
        return {
          ...sub,
          startDate: todayStr,
          renewalDate,
        };
      })
    );
  }

  function deleteSubscription(id) {
    if (!window.confirm("Delete this subscription?")) return;
    setSubscriptions((prev) => prev.filter((s) => s.id !== id));
  }

  // -------------------------------------------------------------------------
  // DERIVED METRICS
  // -------------------------------------------------------------------------

  const totalActive = useMemo(
    () => subscriptions.filter((s) => s.status === "Active").length,
    [subscriptions]
  );

  const upcomingRenewals = useMemo(
    () =>
      subscriptions.filter((s) => {
        const d = daysUntil(s.renewalDate);
        return s.status === "Active" && d != null && d >= 0 && d < 5;
      }).length,
    [subscriptions]
  );

  const totalCostLabel = useMemo(() => {
    if (subscriptions.length === 0) return "—";

    const uniqueCurrencies = new Set(
      subscriptions
        .filter((s) => s.status === "Active" && s.amount)
        .map((s) => s.currency)
    );
    if (uniqueCurrencies.size === 0) return "—";
    if (uniqueCurrencies.size > 1) return "Mixed currencies";

    const currency = [...uniqueCurrencies][0];

    let total = 0;
    subscriptions.forEach((s) => {
      if (s.status !== "Active") return;
      const amount = parseFloat(s.amount || "0");
      if (!amount) return;

      switch (s.frequency) {
        case "Weekly":
          total += (amount * 52) / 12;
          break;
        case "Monthly":
          total += amount;
          break;
        case "Yearly":
          total += amount / 12;
          break;
        case "Bi-yearly":
          total += amount / 24;
          break;
        default:
          break;
      }
    });

    return `${currency} ${total.toFixed(2)}/month (approx)`;
  }, [subscriptions]);

  // -------------------------------------------------------------------------
  // UI
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* HEADER */}
      <header className="border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900/90">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-4 gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
              Subscription Radar
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              Track your apps, costs, and renewal dates in one place.
            </p>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              {userProfile.name && userProfile.email ? (
                <button
                  onClick={() => setShowProfileDialog(true)}
                  className="text-xs px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900/60 hover:bg-slate-800/80 transition"
                >
                  {userProfile.name} • {userProfile.email}
                </button>
              ) : (
                <button
                  onClick={() => setShowProfileDialog(true)}
                  className="text-xs px-3 py-1.5 rounded-full border border-amber-500/60 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 transition"
                >
                  Set name & email
                </button>
              )}

              <button
                onClick={addSubscription}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-medium text-slate-900 shadow-sm hover:bg-emerald-400 transition"
              >
                <span className="text-base leading-none">＋</span>
                Add subscription
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>
                Daily reminder:{" "}
                {userProfile.remindersEnabled
                  ? userProfile.reminderTime || "not set"
                  : "Off"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-4 md:py-6 space-y-4 md:space-y-6">
          {/* Info cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 md:p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Active subscriptions
              </p>
              <p className="mt-1 text-2xl font-semibold">{totalActive}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 md:p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Renewing in &lt; 5 days
              </p>
              <p className="mt-1 text-2xl font-semibold text-amber-300">
                {upcomingRenewals}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 md:p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Approx. monthly cost
              </p>
              <p className="mt-1 text-sm md:text-base font-medium">
                {totalCostLabel}
              </p>
            </div>
          </div>

          {/* Table card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-slate-950/60 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-sm md:text-base font-semibold text-slate-100">
                Subscriptions
              </h2>
              <p className="text-xs text-slate-500">
                Fill the table — everything saves automatically.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-xs md:text-sm">
                <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Name</th>
                    <th className="px-3 py-2 text-left font-medium">
                      Category
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      Description
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      Cost / Currency
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      Frequency
                    </th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">
                      Start date
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      Renewal date
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      Actions
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      Renewal status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.length === 0 && (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-3 py-6 text-center text-slate-500"
                      >
                        No subscriptions yet. Click{" "}
                        <span className="font-semibold">Add subscription</span>{" "}
                        to get started.
                      </td>
                    </tr>
                  )}

                  {subscriptions.map((sub) => {
                    const d = daysUntil(sub.renewalDate);
                    let renewalLabel = "OK";
                    let renewalStyle =
                      "inline-flex items-center rounded-full border border-emerald-500/60 px-2.5 py-0.5 text-[11px] text-emerald-300 bg-emerald-500/10";

                    if (sub.status !== "Active" || !sub.renewalDate) {
                      renewalLabel = "—";
                      renewalStyle =
                        "inline-flex items-center rounded-full border border-slate-700 px-2.5 py-0.5 text-[11px] text-slate-400 bg-slate-800/60";
                    } else if (d != null && d < 5 && d >= 0) {
                      renewalLabel =
                        d === 0 ? "Renews today!" : `Renewal in ${d} days!`;
                      renewalStyle =
                        "inline-flex items-center rounded-full border border-rose-500/60 px-2.5 py-0.5 text-[11px] text-rose-100 bg-rose-500/20 animate-pulse";
                    } else if (d != null && d < 0) {
                      renewalLabel = "Past renewal";
                      renewalStyle =
                        "inline-flex items-center rounded-full border border-rose-500/40 px-2.5 py-0.5 text-[11px] text-rose-200 bg-rose-500/10";
                    }

                    const rowMuted =
                      sub.status === "Cancelled"
                        ? "opacity-60 bg-slate-900/40"
                        : "";

                    return (
                      <tr
                        key={sub.id}
                        className={`border-t border-slate-800/80 ${rowMuted}`}
                      >
                        {/* Name */}
                        <td className="px-3 py-2 align-top">
                          <input
                            type="text"
                            className="w-full rounded-md bg-slate-950/60 border border-slate-800 px-2 py-1 text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            placeholder="e.g. Netflix"
                            value={sub.name}
                            onChange={(e) =>
                              updateSubscription(sub.id, {
                                name: e.target.value,
                              })
                            }
                          />
                        </td>

                        {/* Category */}
                        <td className="px-3 py-2 align-top">
                          {sub.categoryMode === "custom" ? (
                            <input
                              type="text"
                              className="w-full rounded-md bg-slate-950/60 border border-amber-500/60 px-2 py-1 text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                              placeholder="Type category, then leave field"
                              value={sub.category}
                              onChange={(e) =>
                                updateSubscription(sub.id, {
                                  category: e.target.value,
                                })
                              }
                              onBlur={(e) =>
                                handleCustomCategoryBlur(
                                  sub.id,
                                  e.target.value
                                )
                              }
                            />
                          ) : (
                            <select
                              className="w-full rounded-md bg-slate-950/60 border border-slate-800 px-2 py-1 text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              value={sub.category || ""}
                              onChange={(e) =>
                                handleCategoryChange(sub.id, e.target.value)
                              }
                            >
                              <option value="">Select…</option>
                              {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                              <option value="__custom__">+ Custom…</option>
                            </select>
                          )}
                        </td>

                        {/* Description */}
                        <td className="px-3 py-2 align-top">
                          <input
                            type="text"
                            className="w-full rounded-md bg-slate-950/60 border border-slate-800 px-2 py-1 text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            placeholder="Short note"
                            value={sub.description}
                            onChange={(e) =>
                              updateSubscription(sub.id, {
                                description: e.target.value,
                              })
                            }
                          />
                        </td>

                        {/* Cost / Currency */}
                        <td className="px-3 py-2 align-top">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-20 md:w-24 rounded-md bg-slate-950/60 border border-slate-800 px-2 py-1 text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              value={sub.amount}
                              onChange={(e) =>
                                updateSubscription(sub.id, {
                                  amount: e.target.value,
                                })
                              }
                            />
                            <select
                              className="w-20 md:w-24 rounded-md bg-slate-950/60 border border-slate-800 px-2 py-1 text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              value={sub.currency}
                              onChange={(e) =>
                                updateSubscription(sub.id, {
                                  currency: e.target.value,
                                })
                              }
                            >
                              {CURRENCIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        {/* Frequency */}
                        <td className="px-3 py-2 align-top">
                          <select
                            className="w-full rounded-md bg-slate-950/60 border border-slate-800 px-2 py-1 text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            value={sub.frequency}
                            onChange={(e) =>
                              updateSubscription(sub.id, {
                                frequency: e.target.value,
                              })
                            }
                          >
                            {BILLING_FREQUENCIES.map((f) => (
                              <option key={f} value={f}>
                                {f}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Status */}
                        <td className="px-3 py-2 align-top">
                          <select
                            className="w-full rounded-md bg-slate-950/60 border border-slate-800 px-2 py-1 text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            value={sub.status}
                            onChange={(e) =>
                              updateSubscription(sub.id, {
                                status: e.target.value,
                              })
                            }
                          >
                            {SUB_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Start date */}
                        <td className="px-3 py-2 align-top">
                          <input
                            type="date"
                            className="w-full rounded-md bg-slate-950/60 border border-slate-800 px-2 py-1 text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            value={sub.startDate || ""}
                            onChange={(e) =>
                              updateSubscription(sub.id, {
                                startDate: e.target.value,
                              })
                            }
                          />
                        </td>

                        {/* Renewal date (read-only) */}
                        <td className="px-3 py-2 align-top">
                          <input
                            type="date"
                            className="w-full rounded-md bg-slate-950/40 border border-slate-800 px-2 py-1 text-xs md:text-sm text-slate-300"
                            value={sub.renewalDate || ""}
                            readOnly
                          />
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-2 align-top">
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => renewSubscription(sub.id)}
                              className="rounded-full bg-emerald-500/90 px-2 py-1 text-[11px] font-medium text-slate-950 hover:bg-emerald-400 transition"
                            >
                              Renew
                            </button>
                            <button
                              onClick={() => deleteSubscription(sub.id)}
                              className="rounded-full bg-slate-900 px-2 py-1 text-[11px] text-slate-400 hover:bg-rose-600/20 hover:text-rose-200 transition"
                            >
                              Delete
                            </button>
                          </div>
                        </td>

                        {/* Renewal status */}
                        <td className="px-3 py-2 align-top">
                          <span className={renewalStyle}>{renewalLabel}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-[11px] md:text-xs text-slate-500">
            · Columns I &amp; J from your original sheet are intentionally
            ignored.
            <br />
            · Renewal status turns light red and shows “renewal in X days!” when
            there are less than 5 days left.
          </p>
        </div>
      </main>

      {/* USER PROFILE DIALOG */}
      {showProfileDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/95 p-5 shadow-2xl shadow-black/80">
            <h2 className="text-lg font-semibold mb-1">
              Reminder settings & profile
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              We&apos;ll use your name and email to send reminder messages when
              a subscription renewal is less than 5 days away.
              <br />
              Daily reminder runs at the time you choose, based on your device
              local time.
            </p>

            <form onSubmit={handleProfileSave} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Your name
                </label>
                <input
                  type="text"
                  className="w-full rounded-md bg-slate-950/70 border border-slate-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  value={userProfile.name}
                  onChange={(e) =>
                    setUserProfile((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  className="w-full rounded-md bg-slate-950/70 border border-slate-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  value={userProfile.email}
                  onChange={(e) =>
                    setUserProfile((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-200">
                  <input
                    type="checkbox"
                    className="rounded border-slate-600 bg-slate-950"
                    checked={userProfile.remindersEnabled}
                    onChange={(e) =>
                      setUserProfile((prev) => ({
                        ...prev,
                        remindersEnabled: e.target.checked,
                      }))
                    }
                  />
                  Enable daily reminder
                </label>

                <div className="flex items-center gap-1 text-xs text-slate-300">
                  <span>Time:</span>
                  <input
                    type="time"
                    className="rounded-md bg-slate-950/70 border border-slate-800 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={userProfile.reminderTime}
                    onChange={(e) =>
                      setUserProfile((prev) => ({
                        ...prev,
                        reminderTime: e.target.value,
                      }))
                    }
                    required={userProfile.remindersEnabled}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setShowProfileDialog(false)}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-medium text-slate-950 hover:bg-emerald-400 transition"
                >
                  Save
                </button>
              </div>
            </form>

            <p className="mt-3 text-[10px] text-slate-500">
              For true 24/7 emails (even when this page is closed), connect this
              app to a backend or email service with a daily scheduler.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
