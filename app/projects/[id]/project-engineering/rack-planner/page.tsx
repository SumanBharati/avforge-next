// Renders the same Rack Builder tool as /designEngineering/rack-planner,
// but nested under Project Engineering's own route so its sidebar (Cable
// Pull Sheet / EDID & HDCP / Drawings) stays visible instead of being
// replaced by the standalone Design Engineering tool's own room sidebar.
// The component itself only reads ?room=/?project= — it takes no route
// params — so it renders identically from either path.
export { default } from "@/app/designEngineering/rack-planner/page";
