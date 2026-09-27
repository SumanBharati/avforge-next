// Deliberately NOT wrapped in ProGate, unlike the paid-feature routes
// (projects, procurement, time-tracking, etc). Account Settings covers
// team administration — general info, members, billing — which has to
// stay reachable regardless of subscription status: a non-owner member
// needs it to leave a non-Pro team (see the Leave Team action on
// app/org/members), and an admin needs it to reach Manage Billing/Upgrade
// in the first place. Gating it would make both impossible.
export default function OrganizationSettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
