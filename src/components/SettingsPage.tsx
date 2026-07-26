import { useEffect, useState } from "react";
import type { CareerSave } from "../domain/models";
import { DATABASE_VERSION, RULESET_VERSION } from "../domain/models";

type Preferences = {
  darkMode: boolean;
  reducedMotion: boolean;
  compactTables: boolean;
  confirmContinue: boolean;
};

const defaults: Preferences = {
  darkMode: false,
  reducedMotion: false,
  compactTables: false,
  confirmContinue: true,
};

export function SettingsPage({ career }: { career: CareerSave }) {
  const [preferences, setPreferences] = useState<Preferences>(() => {
    try {
      return { ...defaults, ...JSON.parse(window.localStorage.getItem("gg-preferences") ?? "{}") };
    } catch {
      return defaults;
    }
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark-mode", preferences.darkMode);
    document.documentElement.classList.toggle("compact-tables", preferences.compactTables);
    document.documentElement.classList.toggle("reduced-motion", preferences.reducedMotion);
    window.localStorage.setItem("gg-preferences", JSON.stringify(preferences));
    setSaved(true);
    const timer = window.setTimeout(() => setSaved(false), 1200);
    return () => window.clearTimeout(timer);
  }, [preferences]);

  function toggle(key: keyof Preferences) {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <section className="settings-page">
      <div className="settings-heading">
        <div>
          <p className="eyebrow">Game preferences</p>
          <h1>Settings</h1>
          <p>Changes are stored locally and applied immediately.</p>
        </div>
        <span className={`save-indicator ${saved ? "visible" : ""}`}>Saved</span>
      </div>

      <div className="settings-layout">
        <div className="settings-panel">
          <div className="settings-section-title">
            <span>Interface</span>
            <p>Adjust the management experience on this device.</p>
          </div>
          <SettingToggle
            checked={preferences.darkMode}
            description="Use a low-glare dark palette across the club hub, tables and panels."
            label="Dark mode"
            onChange={() => toggle("darkMode")}
          />
          <SettingToggle
            checked={preferences.compactTables}
            description="Reduce row height to fit more squad and database records on screen."
            label="Compact tables"
            onChange={() => toggle("compactTables")}
          />
          <SettingToggle
            checked={preferences.reducedMotion}
            description="Remove drawer and hover transitions throughout the interface."
            label="Reduce motion"
            onChange={() => toggle("reducedMotion")}
          />
          <SettingToggle
            checked={preferences.confirmContinue}
            description="Ask before advancing past a deadline or unresolved squad task."
            label="Confirm before advancing"
            onChange={() => toggle("confirmContinue")}
          />
        </div>

        <aside className="save-details">
          <span>Current career</span>
          <h2>{career.coachName}</h2>
          <dl>
            <div><dt>Season</dt><dd>{career.season}</dd></div>
            <div><dt>Save schema</dt><dd>v{career.schemaVersion}</dd></div>
            <div><dt>Database</dt><dd>{DATABASE_VERSION}</dd></div>
            <div><dt>Ruleset</dt><dd>{RULESET_VERSION}</dd></div>
            <div><dt>Random seed</dt><dd>{career.seed}</dd></div>
          </dl>
          <p>Career data is stored in IndexedDB on this device. Cloud synchronization is outside the v1 scope.</p>
        </aside>
      </div>
    </section>
  );
}

function SettingToggle({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: () => void;
}) {
  return (
    <button className="setting-row" onClick={onChange} type="button">
      <span><strong>{label}</strong><small>{description}</small></span>
      <i className={checked ? "on" : ""}><b /></i>
    </button>
  );
}
