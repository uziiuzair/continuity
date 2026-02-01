"use client";

export default function GeneralPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium text-(--text-primary) mb-2">
          General Settings
        </h3>
        <p className="text-sm text-(--text-secondary)">
          Theme, language, and other general preferences will be available here.
        </p>
      </div>

      <div className="py-12 text-center text-(--text-secondary)/50 text-sm">
        Coming soon
      </div>
    </div>
  );
}
