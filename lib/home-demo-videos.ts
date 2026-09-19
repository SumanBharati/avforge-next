export interface HomeDemoVideo {
  id: string;
  title: string;
  description: string;
  videoSrc?: string;
  posterSrc?: string;
}

export const HOME_DEMO_VIDEOS: HomeDemoVideo[] = [
  {
    id: "room-designer",
    title: "Room Designer",
    description: "See how an AV room moves from initial dimensions to a coordinated layout with equipment, coverage, annotations, and elevations.",
  },
  {
    id: "signal-flow",
    title: "Signal Flow Builder",
    description: "Walk through building a readable signal-flow drawing, connecting devices, organizing locations, and keeping the design tied to the project BOM.",
  },
  {
    id: "rack-builder",
    title: "Rack Builder",
    description: "Explore rack planning with equipment placement, physical sizing, power information, and shared equipment identity across the design tools.",
  },
  {
    id: "project-management",
    title: "Project Management",
    description: "Follow schedules, people, milestones, tasks, reports, and project activity from one coordinated workspace.",
  },
  {
    id: "library-procurement",
    title: "Equipment Library and Procurement",
    description: "See how reusable equipment data flows into designs, proposals, purchasing, receiving, and inventory management.",
  },
];
