import React, { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

// EmailJS Configuration (Shared service for all users)
const EMAILJS_CONFIG = {
  publicKey: "HEdnM-aY_1sDAPzrH",
  serviceId: "service_7fo3t1m",
  templateId: "template_p9yf2qp",
};

const DEFAULT_CATEGORIES = [
  "Productivity",
  "Security",
  "Social Media",
  "Entertainment",
  "Healthcare",
  "Banking",
  "Games",
];

const CURRENCIES = ["SGD", "USD", "CHF", "EUR", "JPY", "CAD"];

const BILLING_FREQUENCIES = ["Weekly", "Monthly", "Yearly", "Bi-yearly"];


const STORAGE_KEY_SUBS = "subscription-manager:subscriptions";
const STORAGE_KEY_PROFILE = "subscription-manager:userProfile";
const STORAGE_KEY_REMINDERS = "subscription-manager:reminders";
const STORAGE_KEY_DAILY = "subscription-manager:dailyMeta";

const ACCENT = "#6366f1";
const ACCENT_HOVER = "#4f46e5";

const APP_NAME_PRESETS = [
  "Netflix – 🎬",
  "Spotify – 🎧",
  "YouTube Premium – ▶️",
  "Amazon Prime Video – 📦",
  "Apple Music – 🍎🎵",
  "Disney+ – ✨",
  "Max (HBO) – 🟪",
  "Hulu – 🟩",
  "iCloud+ – ☁️",
  "Google One – 🔵",
  "Microsoft 365 – 🪟",
  "Adobe Creative Cloud – 🎨",
  "Dropbox – 📁",
  "Evernote – 🐘",
  "Notion – 🅽",
  "Canva Pro – 🎨💠",
  "ChatGPT Plus – 🤖",
  "Strava – 🏃‍♂️🔥",
  "Calm – 🌙",
  "Headspace – 🟠",
  "Audible – 🎧📚",
  "Kindle Unlimited – 📘",
  "Tinder – 🔥",
  "Bumble – 🐝",
  "LinkedIn Premium – 💼",
  "NordVPN – 🛡️",
  "ExpressVPN – 🔺",
  "PlayStation Plus – 🎮🔵",
  "Xbox Game Pass – 🎮🟩",
  "Nintendo Switch Online – 🎮🔴",
];

const TIMEZONES = [
  { id: "new-york", label: "New York (UTC-5)", offsetMinutes: -5 * 60 },
  { id: "buenos-aires", label: "Buenos Aires (UTC-3)", offsetMinutes: -3 * 60 },
  { id: "london", label: "London (UTC+0)", offsetMinutes: 0 },
  { id: "berlin", label: "Berlin (UTC+1)", offsetMinutes: 1 * 60 },
  { id: "cairo", label: "Cairo (UTC+2)", offsetMinutes: 2 * 60 },
  { id: "moscow", label: "Moscow (UTC+3)", offsetMinutes: 3 * 60 },
  { id: "istanbul", label: "Istanbul (UTC+3)", offsetMinutes: 3 * 60 },
  { id: "dubai", label: "Dubai (UTC+4)", offsetMinutes: 4 * 60 },
  { id: "mumbai", label: "Mumbai (UTC+5:30)", offsetMinutes: 5 * 60 + 30 },
  { id: "dhaka", label: "Dhaka (UTC+6)", offsetMinutes: 6 * 60 },
  { id: "bangkok", label: "Bangkok (UTC+7)", offsetMinutes: 7 * 60 },
  { id: "beijing", label: "Beijing (UTC+8)", offsetMinutes: 8 * 60 },
  { id: "tokyo", label: "Tokyo (UTC+9)", offsetMinutes: 9 * 60 },
  { id: "sydney", label: "Sydney (UTC+10)", offsetMinutes: 10 * 60 },
  { id: "auckland", label: "Auckland (UTC+13)", offsetMinutes: 13 * 60 },
];

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

  return result.toISOString().slice(0, 10);
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

function createEmptySubscription(defaultCurrency) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: crypto.randomUUID(),
    name: "",
    category: "",
    categoryMode: "select",
    description: "",
    amount: "",
    currency: defaultCurrency || "USD",
    frequency: "Monthly",
    status: "Active",
    startDate: today,
    renewalDate: addPeriodToDate(today, "Monthly"),
  };
}

function getCurrentTimeInTimezone(offsetMinutes) {
  const now = new Date();
  const utcMinutesTotal = now.getUTCHours() * 60 + now.getUTCMinutes();
  let tzMinutesTotal = utcMinutesTotal + offsetMinutes;

  const MINUTES_PER_DAY = 1440;
  tzMinutesTotal = ((tzMinutesTotal % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;

  const hh = Math.floor(tzMinutesTotal / 60);
  const mm = tzMinutesTotal % 60;

  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}

function getCurrentMinutesInTimezone(offsetMinutes) {
  const now = new Date();
  const utcMinutesTotal = now.getUTCHours() * 60 + now.getUTCMinutes();
  let tzMinutesTotal = utcMinutesTotal + offsetMinutes;

  const MINUTES_PER_DAY = 1440;
  tzMinutesTotal = ((tzMinutesTotal % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;

  return tzMinutesTotal;
}

function parseTimeToMinutes(hhmm) {
  if (!hhmm) return null;
  const [hoursStr, minutesStr] = hhmm.split(":");
  const hours = Number.parseInt(hoursStr, 10);
  const minutes = Number.parseInt(minutesStr, 10);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

// ---------------------------------------------------------------------------
// APP
// ---------------------------------------------------------------------------

export default function App() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [userProfile, setUserProfile] = useState({
    defaultCurrency: "USD",
    email: "",
    reminderTime: "09:00",
    timezoneId: "",
    fxManual: {},
  });
  const [remindersSent, setRemindersSent] = useState({});
  const [dailyMeta, setDailyMeta] = useState({ lastRunDate: "", lastRunMinutes: null });
  const [view, setView] = useState("table");
  const [emailJsLoaded, setEmailJsLoaded] = useState(false);
  const [lastEmailStatus, setLastEmailStatus] = useState("");

  // Initial load
  useEffect(() => {
    const profile = JSON.parse(localStorage.getItem(STORAGE_KEY_PROFILE) || "{}");
    setUserProfile({
      defaultCurrency: profile.defaultCurrency || "USD",
      email: profile.email || "",
      reminderTime: profile.reminderTime || "09:00",
      timezoneId: profile.timezoneId || "",
      fxManual: profile.fxManual || {},
    });

    const subsFromStorage = JSON.parse(localStorage.getItem(STORAGE_KEY_SUBS) || "[]");
    let initialSubs = subsFromStorage;

    if (!subsFromStorage || subsFromStorage.length === 0) {
      initialSubs = [createEmptySubscription(profile.defaultCurrency || "USD")];
    }
    setSubscriptions(initialSubs);

    const reminders = JSON.parse(localStorage.getItem(STORAGE_KEY_REMINDERS) || "{}");
    setRemindersSent(reminders);

    const dm = JSON.parse(
      localStorage.getItem(STORAGE_KEY_DAILY) || '{"lastRunDate":"","lastRunMinutes":null}'
    );
    setDailyMeta({ lastRunDate: dm.lastRunDate || "", lastRunMinutes: dm.lastRunMinutes ?? null });
  }, []);

  // Persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SUBS, JSON.stringify(subscriptions));
  }, [subscriptions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_REMINDERS, JSON.stringify(remindersSent));
  }, [remindersSent]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_DAILY, JSON.stringify(dailyMeta));
  }, [dailyMeta]);

  // Load EmailJS on mount
  useEffect(() => {
    const existingScript = document.querySelector('script[src*="emailjs"]');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
    script.async = true;
    script.onload = () => {
      if (window.emailjs) {
        window.emailjs.init(EMAILJS_CONFIG.publicKey);
        setEmailJsLoaded(true);
        console.log('✅ EmailJS loaded and initialized');
      } else {
        console.error('❌ EmailJS object not found after script load');
      }
    };
    script.onerror = () => {
      console.error('❌ Failed to load EmailJS script');
      setLastEmailStatus('Failed to load EmailJS library');
    };
    document.head.appendChild(script);

    return () => {
      const scriptToRemove = document.querySelector('script[src*="emailjs"]');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, []);

  // Daily reminder check
  useEffect(() => {
    if (!emailJsLoaded) {
      console.log('⏳ Reminder check paused: waiting for EmailJS to load');
      return;
    }

    if (!userProfile.email || !userProfile.reminderTime || !userProfile.timezoneId) {
      console.log('⏭️ Reminder check skipped: missing email, time, or timezone');
      return;
    }

    const tz = TIMEZONES.find((t) => t.id === userProfile.timezoneId);
    if (!tz) {
      console.log('⏭️ Reminder check skipped: invalid timezone');
      return;
    }

    const targetMinutes = parseTimeToMinutes(userProfile.reminderTime);
    if (targetMinutes == null) {
      console.log('⏭️ Reminder check skipped: invalid reminder time');
      return;
    }

    console.log('✅ Reminder checker active. Monitoring reminder schedule...');

    const checkAndSendReminders = () => {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const lastRunMinutes =
        typeof dailyMeta.lastRunMinutes === "number" ? dailyMeta.lastRunMinutes : null;

      const currentMinutes = getCurrentMinutesInTimezone(tz.offsetMinutes);
      const alreadyHandledToday =
        dailyMeta.lastRunDate === todayStr && lastRunMinutes != null && lastRunMinutes >= targetMinutes;

      if (currentMinutes < targetMinutes || alreadyHandledToday) {
        return;
      }

      const currentHHMM = getCurrentTimeInTimezone(tz.offsetMinutes);
      console.log(`⏰ Current time in ${tz.label}: ${currentHHMM}, Target: ${userProfile.reminderTime}`);
      console.log('🎯 Reminder window reached! Checking subscriptions...');

      const updatedReminders = { ...remindersSent };
      let changed = false;

      subscriptions.forEach((sub) => {
        if (sub.status !== "Active") return;
        if (!sub.renewalDate) return;

        const d = daysUntil(sub.renewalDate);
        if (d == null) return;
        if (d >= 5 || d < 0) return;

        const key = `${sub.id}:${sub.renewalDate}`;
        if (updatedReminders[key]) {
          console.log(`⏭️ Already sent reminder for: ${sub.name}`);
          return;
        }

        console.log(`📧 Sending reminder for: ${sub.name} (renews in ${d} days)`);

        if (window.emailjs && emailJsLoaded) {
          const templateParams = {
            to_email: userProfile.email,
            subscription_name: sub.name || "(unnamed subscription)",
            days_until_renewal: d === 0 ? "0 (today)" : d.toString(),
            renewal_date: sub.renewalDate,
          };

          window.emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, templateParams).then(
            (response) => {
              console.log('✅ Email sent successfully!', response.status, response.text);
              setLastEmailStatus(`✅ Email sent to ${userProfile.email} at ${new Date().toLocaleTimeString()}`);
            },
            (error) => {
              console.error('❌ Failed to send email:', error);
              setLastEmailStatus(`❌ Failed: ${error.text || error.message}`);
            }
          );
        } else {
          console.error('❌ EmailJS not loaded');
          setLastEmailStatus('❌ EmailJS not loaded');
        }

        updatedReminders[key] = true;
        changed = true;
      });

      if (changed) {
        setRemindersSent(updatedReminders);
        setDailyMeta({ lastRunDate: todayStr, lastRunMinutes: currentMinutes });
      }
    };

    checkAndSendReminders();

    const interval = setInterval(() => {
      checkAndSendReminders();
    }, 60 * 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAndSendReminders();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    subscriptions,
    userProfile.email,
    userProfile.reminderTime,
    userProfile.timezoneId,
    remindersSent,
    dailyMeta.lastRunDate,
    dailyMeta.lastRunMinutes,
    emailJsLoaded,
  ]);

  // Handlers
  function addSubscription() {
    setSubscriptions((prev) => [
      ...prev,
      createEmptySubscription(userProfile.defaultCurrency || "USD"),
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

  // Test email function
  function sendTestEmail() {
    if (!userProfile.email) {
      alert('Please enter your email address in Settings first');
      return;
    }

    if (!window.emailjs) {
      alert('EmailJS library not loaded. Please refresh the page.');
      setLastEmailStatus('❌ EmailJS library not found');
      console.error('window.emailjs is undefined');
      return;
    }

    if (!emailJsLoaded) {
      alert('EmailJS is still loading. Please wait a moment and try again.');
      return;
    }

    setLastEmailStatus('📤 Sending test email...');
    console.log('=== EMAIL TEST STARTED ===');
    console.log('To:', userProfile.email);

    const templateParams = {
      to_email: userProfile.email,
      subscription_name: "Netflix (Test)",
      days_until_renewal: "3",
      renewal_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    };

    window.emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, templateParams)
      .then(
        function(response) {
          console.log('✅ SUCCESS!', response);
          setLastEmailStatus(`✅ Test email sent successfully to ${userProfile.email}!`);
          alert(`✅ Test email sent to ${userProfile.email}! Check your inbox (and spam folder).`);
        },
        function(error) {
          console.error('❌ FAILED:', error);
          const errorMsg = error.text || error.message || `Status ${error.status || 'unknown'}`;
          setLastEmailStatus(`❌ Failed: ${errorMsg}`);
          alert(`❌ Failed: ${errorMsg}`);
        }
      )
      .catch(function(err) {
        console.error('❌ CATCH block error:', err);
        setLastEmailStatus(`❌ Unexpected error: ${err.message}`);
      });
  }

  // Monthly total computation
  function computeMonthlyTotal() {
    if (!subscriptions || subscriptions.length === 0) return null;
    const base = userProfile.defaultCurrency || "USD";
    const fxManual = userProfile.fxManual || {};

    let total = 0;
    let hasAny = false;

    subscriptions.forEach((sub) => {
      if (sub.status !== "Active") return;
      const amount = parseFloat(sub.amount || "0");
      if (!amount || Number.isNaN(amount)) return;

      let monthly = amount;
      switch (sub.frequency) {
        case "Weekly":
          monthly = (amount * 52) / 12;
          break;
        case "Monthly":
          monthly = amount;
          break;
        case "Yearly":
          monthly = amount / 12;
          break;
        case "Bi-yearly":
          monthly = amount / 24;
          break;
        default:
          monthly = amount;
      }

      let converted = monthly;

      if (sub.currency !== base) {
        const rate = fxManual[sub.currency];
        if (rate && !Number.isNaN(rate) && rate > 0) {
          converted = monthly * rate;
        } else {
          converted = monthly;
        }
      }

      hasAny = true;
      total += converted;
    });

    if (!hasAny) return null;
    return total;
  }

  const monthlyTotal = computeMonthlyTotal();
  const baseCurrency = userProfile.defaultCurrency || "USD";

  // Calculate stats for dashboard
  const activeCount = subscriptions.filter(s => s.status === "Active").length;
  const upcomingRenewals = subscriptions.filter(s => {
    if (s.status !== "Active") return false;
    const d = daysUntil(s.renewalDate);
    return d != null && d >= 0 && d < 7;
  }).length;

  // Render table view
  function renderTableView() {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur-sm rounded-2xl p-6 border border-indigo-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 font-medium">Active Subscriptions</p>
                <p className="text-3xl font-bold text-white mt-1">{activeCount}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-sm rounded-2xl p-6 border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-slate-400 font-medium">
                  <span>Monthly Total</span>
                  <div className="relative group inline-flex items-center justify-center">
                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-500/20 text-emerald-200 text-[10px] font-semibold border border-emerald-400/40 cursor-default">
                      i
                    </span>
                    <div className="pointer-events-none absolute left-0 top-6 z-20 w-64 rounded-lg border border-emerald-500/30 bg-slate-900/90 px-3 py-2 text-left text-xs text-slate-200 opacity-0 shadow-xl transition-opacity duration-200 group-hover:opacity-100">
                      Monthly total prorates longer billing cycles into monthly equivalents (weekly × 52 ÷ 12, yearly ÷ 12, bi-yearly ÷ 24).
                    </div>
                  </div>
                </div>
                <p className="text-3xl font-bold text-white mt-1">
                  {monthlyTotal ? `${monthlyTotal.toFixed(0)} ${baseCurrency}` : "—"}
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-sm rounded-2xl p-6 border border-amber-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 font-medium">Upcoming Renewals</p>
                <p className="text-3xl font-bold text-white mt-1">{upcomingRenewals}</p>
              </div>
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">⏰</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Table Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-slate-900/90 to-slate-800/90 border-b border-slate-800/80 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-xl">📋</span>
              Your Subscriptions
            </h2>
            <button
              onClick={addSubscription}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
              style={{ 
                background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_HOVER} 100%)`,
              }}
            >
              <span className="text-lg leading-none">+</span>
              Add Subscription
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-800/80">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider min-w-[16rem]">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Cost</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Frequency</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Last payment</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Next Renewal</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {subscriptions.map((sub) => {
                  const d = daysUntil(sub.renewalDate);
                  let renewalBadge = null;

                  if (sub.status === "Active" && sub.renewalDate && d != null) {
                    if (d < 5 && d >= 0) {
                      renewalBadge = (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse">
                          <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                          {d === 0 ? "Today!" : `${d}d`}
                        </span>
                      );
                    } else if (d < 0) {
                      renewalBadge = (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-700/50 text-slate-400">
                          Overdue
                        </span>
                      );
                    }
                  }

                  return (
                    <tr
                      key={sub.id}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        sub.status === "Cancelled" ? "opacity-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 align-top min-w-[16rem]">
                        <div className="space-y-2">
                          <select
                            className="w-full rounded-lg bg-slate-950/80 border border-slate-700/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                updateSubscription(sub.id, { name: e.target.value });
                              }
                            }}
                          >
                            <option value="">Quick select...</option>
                            {APP_NAME_PRESETS.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            className="w-full rounded-lg bg-slate-950/80 border border-slate-700/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                            placeholder="Custom name..."
                            value={sub.name}
                            onChange={(e) =>
                              updateSubscription(sub.id, { name: e.target.value })
                            }
                          />
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {sub.categoryMode === "custom" ? (
                          <input
                            type="text"
                            className="w-full rounded-lg bg-slate-950/80 border border-slate-700/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                            placeholder="Type category..."
                            value={sub.category}
                            onChange={(e) =>
                              updateSubscription(sub.id, { category: e.target.value })
                            }
                            onBlur={(e) =>
                              handleCustomCategoryBlur(sub.id, e.target.value)
                            }
                          />
                        ) : (
                          <select
                            className="w-full rounded-lg bg-slate-950/80 border border-slate-700/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                            value={sub.category || ""}
                            onChange={(e) =>
                              handleCategoryChange(sub.id, e.target.value)
                            }
                          >
                            <option value="">Select...</option>
                            {categories.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                            <option value="__custom__">+ Custom</option>
                          </select>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="text"
                          className="w-full rounded-lg bg-slate-950/80 border border-slate-700/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                          placeholder="Notes..."
                          value={sub.description}
                          onChange={(e) =>
                            updateSubscription(sub.id, { description: e.target.value })
                          }
                        />
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-24 rounded-lg bg-slate-950/80 border border-slate-700/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                            value={sub.amount}
                            onChange={(e) =>
                              updateSubscription(sub.id, { amount: e.target.value })
                            }
                          />
                          <select
                            className="w-20 rounded-lg bg-slate-950/80 border border-slate-700/50 px-2 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                            value={sub.currency}
                            onChange={(e) =>
                              updateSubscription(sub.id, { currency: e.target.value })
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

                      <td className="px-4 py-3">
                        <select
                          className="w-full rounded-lg bg-slate-950/80 border border-slate-700/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                          value={sub.frequency}
                          onChange={(e) =>
                            updateSubscription(sub.id, { frequency: e.target.value })
                          }
                        >
                          {BILLING_FREQUENCIES.map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="date"
                          className="w-full rounded-lg bg-slate-950/80 border border-slate-700/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                          value={sub.startDate || ""}
                          onChange={(e) =>
                            updateSubscription(sub.id, { startDate: e.target.value })
                          }
                        />
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <input
                            type="date"
                            className="w-full rounded-lg bg-slate-900/50 border border-slate-700/30 px-3 py-2 text-sm text-slate-300 cursor-not-allowed"
                            value={sub.renewalDate || ""}
                            readOnly
                          />
                          {renewalBadge}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => renewSubscription(sub.id)}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 transition-colors"
                          >
                            Renew
                          </button>
                          <button
                            onClick={() => deleteSubscription(sub.id)}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Total monthly spend:
              </span>
              <span className="text-2xl font-bold text-white">
                {monthlyTotal ? `${monthlyTotal.toFixed(2)} ${baseCurrency}` : "—"}
              </span>
            </div>
            {monthlyTotal && (
              <p className="text-xs text-slate-500 mt-1">
                Converted using your manual FX rates where applicable
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderSettingsView() {
    const base = userProfile.defaultCurrency || "USD";
    const fxManual = userProfile.fxManual || {};

    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-slate-900/90 to-slate-800/90 border-b border-slate-800/80 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-xl">⚙️</span>
              Settings
            </h2>
            <button
              onClick={() => setView("table")}
              className="text-sm px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Back to Subscriptions
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Default Currency
              </label>
              <select
                className="w-full rounded-lg bg-slate-950/80 border border-slate-700/50 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                value={userProfile.defaultCurrency}
                onChange={(e) =>
                  setUserProfile((prev) => ({
                    ...prev,
                    defaultCurrency: e.target.value,
                    fxManual: {},
                  }))
                }
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500">
                All subscriptions will be converted to this currency for totals
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email for Reminders
              </label>
              <input
                type="email"
                className="w-full rounded-lg bg-slate-950/80 border border-slate-700/50 px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                value={userProfile.email}
                onChange={(e) =>
                  setUserProfile((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                placeholder="you@example.com"
              />
              <p className="mt-2 text-xs text-slate-500">
                Receive renewal reminders at this email address (powered by EmailJS)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Timezone
                </label>
                <select
                  className="w-full rounded-lg bg-slate-950/80 border border-slate-700/50 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                  value={userProfile.timezoneId}
                  onChange={(e) =>
                    setUserProfile((prev) => ({
                      ...prev,
                      timezoneId: e.target.value,
                    }))
                  }
                >
                  <option value="">Select timezone...</option>
                  {TIMEZONES.map((tz) => (
                    <option key={tz.id} value={tz.id}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Reminder Time
                </label>
                <input
                  type="time"
                  className="w-full rounded-lg bg-slate-950/80 border border-slate-700/50 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                  value={userProfile.reminderTime}
                  onChange={(e) =>
                    setUserProfile((prev) => ({
                      ...prev,
                      reminderTime: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Reminders are sent daily at this time while the app is open. You'll receive actual emails for subscriptions renewing within 5 days.
            </p>

            <div className="mt-4 p-4 rounded-lg bg-slate-950/60 border border-slate-700/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-300">Email Service Status:</span>
                  {emailJsLoaded ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                      Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></span>
                      Loading...
                    </span>
                  )}
                </div>
                <button
                  onClick={sendTestEmail}
                  disabled={!emailJsLoaded || !userProfile.email}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Send Test Email
                </button>
              </div>
              {lastEmailStatus && (
                <p className="text-xs text-slate-400 mt-2">
                  {lastEmailStatus}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-2">
                This in-browser app will wake up at your selected time while it is open and connected. If the tab is closed
                or the device is offline, reminders will be sent as soon as you reopen the app after that time.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">
                Manual Exchange Rates
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Set conversion rates for currencies to {base}. Example: if 1 USD = 1.35 SGD, enter 1.35.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CURRENCIES.filter((c) => c !== base).map((cur) => (
                  <div
                    key={cur}
                    className="flex items-center gap-3 rounded-lg bg-slate-950/60 px-4 py-3 border border-slate-700/50"
                  >
                    <span className="text-sm text-slate-300 font-medium whitespace-nowrap">
                      1 {cur} =
                    </span>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      className="flex-1 rounded-lg bg-slate-900/80 border border-slate-700/50 px-3 py-2 text-sm text-white text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                      value={
                        fxManual[cur] !== undefined && fxManual[cur] !== null
                          ? fxManual[cur]
                          : ""
                      }
                      onChange={(e) => {
                        const raw = e.target.value;
                        const num = raw === "" ? "" : Number.parseFloat(raw || "0");
                        setUserProfile((prev) => ({
                          ...prev,
                          fxManual: {
                            ...prev.fxManual,
                            [cur]: raw === "" || Number.isNaN(num) ? "" : num,
                          },
                        }));
                      }}
                      placeholder="0.00"
                    />
                    <span className="text-sm text-slate-300 font-medium">
                      {base}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-slate-800/80 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-xl">📡</span>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Subscription Radar
              </h1>
            </div>
          </div>
          <button
            onClick={() => setView(view === "table" ? "settings" : "table")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:scale-105"
            style={{ 
              background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_HOVER} 100%)`,
            }}
          >
            <span className="text-lg">{view === "table" ? "⚙️" : "📋"}</span>
            {view === "table" ? "Settings" : "Dashboard"}
          </button>
        </div>
      </header>

      <main className="flex-1">
        {view === "table" ? renderTableView() : renderSettingsView()}
      </main>

      <footer className="border-t border-slate-800/80 bg-slate-900/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 text-center text-sm text-slate-500">
          Track and manage all your subscriptions in one place
        </div>
      </footer>
    </div>
  );
}
