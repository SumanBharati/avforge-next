// Seeds a stable org/project/room fixture for the Claude E2E test user,
// using the service role key (bypasses RLS) so it mirrors exactly what the
// UI itself would insert without having to click through onboarding.
// Idempotent — safe to re-run; reuses existing rows if already seeded.
//
// Usage: node --env-file=.env.local scripts/testing/seed-fixture.mjs
// Writes scripts/testing/.fixture.json (gitignored) with the ids Playwright needs.

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL || "claude-e2e-test@avforge.local";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — run with node --env-file=.env.local");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: userList, error: userErr } = await admin.auth.admin.listUsers();
  if (userErr) throw userErr;
  const user = userList.users.find((u) => u.email === TEST_EMAIL);
  if (!user) throw new Error(`Test user ${TEST_EMAIL} not found — run create-test-user.mjs first`);

  // Org
  let { data: org } = await admin.from("organizations").select("*").eq("created_by", user.id).limit(1).maybeSingle();
  if (!org) {
    const slug = "claude-e2e-org-" + crypto.randomUUID().slice(0, 8);
    const { data: newOrg, error } = await admin.from("organizations").insert({ name: "Claude E2E Org", slug, created_by: user.id }).select().single();
    if (error) throw error;
    org = newOrg;
    await admin.from("organization_members").insert({ org_id: org.id, user_id: user.id, role: "superadmin" });
    console.log(`Created org: ${org.id}`);
  } else {
    console.log(`Reusing org: ${org.id}`);
  }
  await admin.from("user_preferences").upsert({ user_id: user.id, active_org_id: org.id }, { onConflict: "user_id" });

  // Project
  let { data: project } = await admin.from("projects").select("*").eq("org_id", org.id).eq("name", "Claude E2E Project").maybeSingle();
  if (!project) {
    const { data: newProject, error } = await admin.from("projects").insert({
      org_id: org.id,
      user_id: user.id,
      name: "Claude E2E Project",
      job_number: "E2E-0001",
      client_name: "Internal Test",
      created_by: "Claude E2E Test",
      phase: "opportunity",
    }).select().single();
    if (error) throw error;
    project = newProject;
    console.log(`Created project: ${project.id}`);
  } else {
    console.log(`Reusing project: ${project.id}`);
  }

  // Site survey with one building + one room
  let { data: surveyRow } = await admin.from("site_surveys").select("data").eq("project_id", project.id).maybeSingle();
  let roomId;
  if (!surveyRow?.data?.buildings?.[0]?.rooms?.[0]) {
    roomId = crypto.randomUUID();
    const surveyData = {
      buildings: [{
        id: crypto.randomUUID(),
        name: "Site",
        data: {},
        rooms: [{ id: roomId, name: "Test Room", data: { room_width: "16", room_length: "20", room_height: "9" } }],
      }],
    };
    if (surveyRow) {
      await admin.from("site_surveys").update({ data: surveyData }).eq("project_id", project.id);
    } else {
      await admin.from("site_surveys").insert({ project_id: project.id, user_id: user.id, data: surveyData });
    }
    console.log(`Created room: ${roomId}`);
  } else {
    roomId = surveyRow.data.buildings[0].rooms[0].id;
    console.log(`Reusing room: ${roomId}`);
  }

  // Signal Flow baseline: a Laptop wired to Display A, plus an unconnected
  // Display B as a reconnect target — enough to hang a flag off a port,
  // and to drag an existing connection's endpoint onto a different device.
  // Always reset to this known state on seed — this room only ever exists for
  // automated verification, so there's no real edit history worth preserving.
  const signalFlowData = {
    devices: [
      {
        id: 1, type: "Laptop", mfr: "Generic", model: "—", color: "#8b5cf6",
        x: 300, y: 220, w: 120, h: 56, rackMounted: false,
        ports: [
          { id: "1-p0", side: "right", signal: "hdmi", dir: "out", label: "HDMI" },
          { id: "1-p1", side: "right", signal: "usb", dir: "out", label: "USB" },
        ],
      },
      {
        id: 2, type: "Display / TV", mfr: "Generic", model: "—", color: "#8b5cf6",
        x: 650, y: 120, w: 120, h: 56, rackMounted: false,
        ports: [{ id: "2-p0", side: "left", signal: "hdmi", dir: "in", label: "HDMI" }],
      },
      {
        id: 3, type: "Display / TV", mfr: "Generic", model: "—", color: "#8b5cf6",
        x: 650, y: 320, w: 120, h: 56, rackMounted: false,
        ports: [{ id: "3-p0", side: "left", signal: "hdmi", dir: "in", label: "HDMI" }],
      },
    ],
    connections: [
      // Manually right-angle-routed (waypoints), not a smooth spline — used
      // to verify that deleting Display A keeps these bends instead of
      // collapsing the cable back into a curve.
      { id: 100, from: { deviceId: 1, portId: "1-p0" }, to: { deviceId: 2, portId: "2-p0" }, signal: "hdmi", waypoints: [{ x: 500, y: 248 }, { x: 500, y: 148 }] },
    ],
    rooms: [],
    annotations: [],
    nextId: 4,
    annotNextId: 1,
  };
  const { data: existingToolData } = await admin.from("tool_data").select("id").eq("project_id", project.id).eq("tool", "signal-flow").eq("room_id", roomId).maybeSingle();
  if (existingToolData) {
    await admin.from("tool_data").update({ data: signalFlowData }).eq("id", existingToolData.id);
  } else {
    await admin.from("tool_data").insert({ project_id: project.id, user_id: user.id, tool: "signal-flow", room_id: roomId, data: signalFlowData });
  }
  console.log("Reset Signal Flow baseline (Laptop -> Display A, Display B unconnected) for the fixture room");

  const fixture = { userId: user.id, orgId: org.id, projectId: project.id, roomId };
  writeFileSync(new URL("./.fixture.json", import.meta.url), JSON.stringify(fixture, null, 2));
  console.log("Wrote scripts/testing/.fixture.json:", fixture);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
