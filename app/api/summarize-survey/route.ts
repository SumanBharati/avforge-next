import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { transcript, existingRooms } = await req.json();

    if (!transcript || typeof transcript !== "string" || transcript.trim().length < 10) {
      return NextResponse.json({ error: "Transcript too short" }, { status: 400 });
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 16000,
      system: `You are an AV site survey expert. Extract structured site survey data from a conversation transcript between an AV engineer and a client.

Return ONLY valid JSON (no markdown, no explanation) with this structure:
{
  "building": {
    "building_address": "",
    "site_contact_name": "",
    "site_contact_phone": "",
    "site_contact_email": "",
    "building_notes": ""
  },
  "rooms": [
    {
      "room_name": "",
      "scope_of_work": "",
      "room_purpose": "",
      "room_length": "",
      "room_length_in": "",
      "room_width": "",
      "room_width_in": "",
      "room_height": "",
      "room_height_in": "",
      "room_notes": "",

      "outlet_locations": "",
      "electrical_notes": "",

      "light_control": "",
      "light_zones": "",
      "has_projection": "",
      "ambient_light_level": "",
      "lighting_notes": "",

      "ambient_noise": "",
      "nc_rating": "",
      "hvac_noise": "",
      "hvac_diffuser_locations": "",
      "sound_isolation": "",
      "stc_rating": "",
      "reflective_surfaces": "",
      "acoustic_treatment": "",
      "rt60_estimate": "",
      "sound_masking": "",
      "acoustics_notes": "",

      "network_drops": "",
      "network_drop_locations": "",
      "client_provides_network": "",
      "idf_mdf_location": "",
      "switch_type": "",
      "poe_available": "",
      "vlan_available": "",
      "multicast": "",
      "internet_bandwidth": "",
      "wifi_coverage": "",
      "network_notes": "",

      "conduit_existing": "",
      "cable_tray": "",
      "ceiling_access": "",
      "plenum_space": "",
      "plenum_rated": "",
      "floor_boxes": "",
      "wall_penetrations": "",
      "firestop": "",
      "rack_location": "",
      "rack_space": "",
      "pathway_notes": "",

      "display_type": "",
      "content_type": "",
      "display_mounting": "",
      "structural_support": "",
      "existing_displays": "",
      "camera_locations": "",
      "camera_requirements": "",
      "display_notes": "",

      "audio_use": "",
      "speaker_type": "",
      "mic_type": "",
      "mic_pickup_zones": "",
      "aec_required": "",
      "existing_audio": "",
      "assistive_listening": "",
      "audio_notes": "",

      "control_platform": "",
      "touch_panel_location": "",
      "scheduling_panel": "",
      "uc_platform": "",
      "byod_requirements": "",
      "existing_control": "",
      "occupancy_sensor": "",
      "control_notes": "",

      "ceiling_weight": "",
      "ceiling_support_detail": "",
      "wall_backing": "",
      "seismic_zone": "",
      "structural_notes": "",

      "ada_required": "",
      "ada_reach": "",
      "fire_alarm": "",
      "emergency_paging": "",
      "code_jurisdiction": "",
      "compliance_notes": ""
    }
  ]
}

Rules:
- Only include fields that are clearly mentioned or can be confidently inferred from the conversation.
- Leave fields empty ("") if not discussed.
- If multiple rooms are discussed, create separate entries for each.
- Dimensions should be separated into feet and inches (e.g., 25 feet 6 inches → room_length: "25", room_length_in: "6").
- Numeric fields (room_length, room_width, room_height, ambient_noise, ambient_light_level, network_drops, plenum_space): return just the number as a string.

- scope_of_work: A concise summary of the AV scope of work for this room — what systems are being installed or upgraded, key requirements, and any constraints or special considerations mentioned.

Free-form textarea fields — use these as catch-alls for details that don't fit a select option:
- control_notes: touch panel REQUIREMENTS beyond location — quantity, make/model (e.g. "Crestron TSW-770"), screen size, features (LED bar, mic, scheduling), mounting specifics. Also auto-on/off, integration with lighting/HVAC/shades, scheduling platform.
- existing_control: existing control processors, touch panels, keypads — make/model, condition, reuse or replace.
- audio_notes / existing_audio / mic_pickup_zones: audio detail that doesn't fit mic_type / speaker_type / aec_required.
- display_notes / existing_displays: display detail beyond display_type / content_type / display_mounting.
- network_notes: IT contacts, firewall, QoS, cloud service access.
- pathway_notes / structural_notes / compliance_notes / room_notes / building_notes / lighting_notes / electrical_notes / acoustics_notes: section-level overflow.

For "select" type fields, use the EXACT option text from these choices:
- room_purpose: Boardroom, Conference Room, Huddle Room, Training Room, Classroom, Lecture Hall, Auditorium, Courtroom, Council Chamber, Command Center, Lobby, Digital Signage, Multipurpose, Divisible, Worship Space, Performance Venue, Other
- light_control, has_projection, client_provides_network: Yes, No
- nc_rating: "NC-20 or below (very quiet)", "NC-25 (quiet conference room)", "NC-30 (standard office)", "NC-35 (open office / classroom)", "NC-40 (lobby / public space)", "NC-45+ (noisy / industrial)", "Unknown — needs measurement"
- hvac_noise: "Not noticeable", "Slightly noticeable", "Moderately noticeable — may affect speech", "Significant — will require mitigation", "Severe — diffusers directly over mic zones"
- sound_isolation: "Not a concern", "Moderate — adjacent offices", "High — adjacent courtroom / boardroom", "Critical — SCIF / classified", "Unknown"
- stc_rating: "STC 30-35 (standard single drywall)", "STC 40-45 (double drywall / insulated)", "STC 50-55 (rated partition)", "STC 55+ (high isolation / masonry)", "Unknown"
- rt60_estimate: "< 0.4s (very dead / treated)", "0.4–0.6s (good for conferencing)", "0.6–0.8s (acceptable)", "0.8–1.2s (reverberant — needs treatment)", "1.2s+ (very reverberant)", "Unknown"
- sound_masking: "None", "Existing system — functional", "Existing system — non-functional", "Planned / specified", "Recommended"
- poe_available: "Yes — PoE+ (802.3at, 30W)", "Yes — PoE++ (802.3bt, 60W/90W)", "Standard PoE only (802.3af, 15.4W)", "No PoE — midspan injectors needed", "Unknown"
- vlan_available: "Yes — existing AV VLAN", "Yes — IT will create", "No — shared network", "Unknown — needs coordination with IT"
- multicast: "Supported and configured", "Supported — needs configuration", "Not supported", "Unknown"
- wifi_coverage: "Strong — enterprise AP in/near room", "Moderate", "Weak — may need AP", "No WiFi", "Unknown"
- cable_tray: "Yes — cable tray with capacity", "Yes — J-hooks on existing runs", "No — will need to install", "No access above ceiling", "Unknown"
- ceiling_access: "Full access — lift tiles anywhere", "Limited — obstructed by ductwork/structure", "No access — hard lid / concrete deck", "Partial — some tiles accessible"
- plenum_rated: "Yes — air-handling plenum space", "No — non-plenum (ducted return)", "Unknown — needs verification"
- wall_penetrations: "Yes — standard drywall", "Limited — rated walls (need firestop)", "No — concrete / CMU", "Mixed — varies by wall"
- firestop: "Yes — rated walls/floors", "Partial — some penetrations", "No", "Unknown"
- rack_location: "In-room credenza / furniture", "Dedicated AV closet (adjacent)", "Shared telecom / IDF room", "Ceiling / above-ceiling plenum", "Remote / headend room", "Not determined"
- display_type: "Flat Panel (LED/LCD)", "Projector + Screen", "LED Video Wall (direct-view)", "Dual / Multi-display", "Interactive Display / Touch", "Projector + Flat Panel (hybrid)", "Not determined"
- content_type: "Presentations / Spreadsheets (analytical)", "Video Conferencing", "Video Playback", "Digital Signage", "Medical Imaging", "CAD / Engineering Drawings", "Mixed / General", "Other"
- display_mounting: "Drywall on stud (needs backing)", "Plywood backing behind drywall", "Concrete / CMU (tapcon / anchor)", "Recessed / Niche", "Floor stand / Cart", "Ceiling mount", "Not determined"
- structural_support: "Yes — engineer confirmed", "Yes — solid backing visible", "No — needs structural verification", "No — insufficient support", "Unknown"
- camera_requirements: "Single fixed camera (huddle)", "Single PTZ camera", "Dual camera (room + whiteboard)", "Auto-tracking / AI framing", "Multiple cameras (production)", "Not required"
- audio_use: "Speech reinforcement only", "Video conferencing (full-duplex)", "Background music / paging", "Presentation + conferencing", "Performance / live event", "Courtroom / council recording", "Mixed / all of the above"
- speaker_type: "Ceiling speakers (distributed)", "Wall-mounted speakers", "Soundbar (display-integrated)", "Pendant speakers", "Line array", "Under-table speakers (privacy)", "Not determined"
- mic_type: "Ceiling microphone array", "Table boundary mics (wired)", "Table boundary mics (wireless)", "Gooseneck / podium mic", "Handheld wireless", "Lapel / lavalier wireless", "Beamforming bar (integrated)", "USB speakerphone", "Multiple types", "Not determined"
- aec_required: "Yes — video / audio conferencing", "No — local reinforcement only", "Yes — via DSP (Biamp, QSC, etc.)", "Yes — via USB device (built-in)"
- assistive_listening: "Yes — hearing loop (induction)", "Yes — RF system", "Yes — IR system", "Yes — type not determined", "No — not required for this space", "Unknown"
- control_platform: "Crestron", "Extron", "Q-SYS (QSC)", "AMX (Harman)", "Savant", "Zoom Rooms native", "Teams Rooms native", "Vendor-agnostic / no processor", "Not determined"
- touch_panel_location: "Table-top", "Wall-mounted (at entry)", "Wall-mounted (at presenter)", "Lectern / podium", "On display (OSD)", "iPad / mobile device", "No touch panel (scheduling only)", "Not determined"
- scheduling_panel: "Yes — at room entry", "No", "Planned", "Existing — make/model:"
- uc_platform: "Microsoft Teams Rooms", "Zoom Rooms", "Cisco Webex", "Google Meet", "BYOD only (no dedicated platform)", "Dual-platform (Teams + Zoom)", "Other", "Not determined"
- byod_requirements: "Required — primary use case", "Required — supplemental to UC platform", "Nice to have", "Not needed", "Not determined"
- occupancy_sensor: "Yes — existing", "Yes — planned", "No — not required", "Not determined"
- ceiling_weight: "Standard (not load-rated)", "Load-rated (specify lbs)", "Open — steel structure above", "Concrete deck — anchor directly", "Unknown"
- seismic_zone: "Not applicable", "Zone 1–2 (low)", "Zone 3 (moderate)", "Zone 4 (high — California, Pacific NW)", "Unknown — check local code"
- ada_required: "Yes — public / assembly space", "Yes — government facility", "Partial — ALS only", "No — private space", "Unknown"
- ada_reach: "Verified — 15\\" to 48\\" AFF", "Needs verification", "Not applicable"
- fire_alarm: "Required — mute audio on alarm", "Required — visual strobe in room", "Not required", "Unknown"
- emergency_paging: "Required — integration with AV speakers", "Separate system (not AV)", "Not required", "Unknown"

IMPORTANT for touch panels: touch_panel_location is a LOCATION select only. Any discussion of quantity, make/model, screen size, features, or specific hardware requirements for touch panels goes in control_notes. Existing touch panels being reused/replaced goes in existing_control.
${existingRooms?.length ? `\nExisting rooms in the survey: ${existingRooms.join(", ")}. Update these if referenced, or add new ones.` : ""}`,
      messages: [{ role: "user", content: `Here is the conversation transcript from a site survey:\n\n${transcript}` }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";

    // Try to parse JSON from the response
    let data;
    try {
      // Handle case where Claude wraps in ```json
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
      data = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response", raw: text }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Summarize survey error:", error);
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
