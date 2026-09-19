export interface HomeBanner {
  id: string;
  navLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  imageLabel: string;
  imageSrc?: string;
  imageSrcLight?: string;
  secondaryImageSrc?: string;
  secondaryImageSrcLight?: string;
  imageAlt?: string;
  secondaryImageAlt?: string;
  imagePresentation?: "fill" | "framed";
  detailsTheme?: "default" | "purple";
  seamlessBackground?: boolean;
  shineEffect?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
}

export const HOME_BANNERS: HomeBanner[] = Array.from({ length: 5 }, (_, index) => {
  const number = index + 1;
  const isProjectsBanner = number <= 5;
  return {
    id: `banner-${number}`,
    navLabel: `Banner ${number}`,
    eyebrow: number === 2
      ? "Project Command Center"
      : number === 3
      ? "AI-Assisted Site Surveys"
      : number === 4
      ? "AI-Assisted Room Design"
      : number === 5
      ? "AI-Assisted Signal Flow Design"
      : isProjectsBanner
      ? "Project Workspaces"
      : `Featured capability ${number}`,
    title: number === 2
      ? "One Project. Every Workflow. One Connected Team."
      : number === 3
      ? "Capture Every Detail. Build the Survey with AI."
      : number === 4
      ? "Turn Scope Details into Complete Room Designs"
      : number === 5
      ? "Turn System Requirements into Connected Signal Flows"
      : isProjectsBanner
      ? "Every AV Project, Clearly Organized"
      : `Feature headline for Banner ${number}`,
    description: number === 2
      ? "Move every AV project from opportunity to completion in one coordinated workspace. Access design, proposals, procurement, engineering, scheduling, programming, financials, rooms, and team assignments without losing project context."
      : number === 3
      ? "Document room dimensions, infrastructure, photos, and technical requirements in one structured workflow. Record on-site conversations and let AVGenix AI extract the relevant details directly into your survey—reducing manual entry and missed information."
      : number === 4
      ? "Let AVGenix automatically create rooms from your project scope, then refine floor plans, ceiling layouts, and elevations in one connected workspace. Position equipment visually while built-in calculations guide display sizing, viewing distances, and camera coverage."
      : number === 5
      ? "Generate signal flow diagrams from project scope and equipment selections, or upload equipment photos and let AVGenix AI create the equipment records for you. Refine connections visually, organize devices by location, trace every signal path, and export clear documentation for engineering and installation teams."
      : isProjectsBanner
      ? "Keep every opportunity, active project, and delivery team in one searchable workspace. Filter projects by client, stage, or assigned role, then open the complete project record with a single click."
      : "Feature details will appear here once the final content is available. This placeholder demonstrates the space available for a concise product story.",
    imageLabel: `Feature image ${number}`,
    detailsTheme: "purple" as const,
    seamlessBackground: false,
    shineEffect: true,
    ...(isProjectsBanner ? {
      imageSrc: number === 2
        ? "/home/project-inside-view-dark.png"
        : number === 3
        ? "/home/site-survey-banner-dark.png"
        : number === 4
        ? "/home/design-engineering-banner-dark.png"
        : number === 5
        ? "/home/signal-flow-banner-dark.png"
        : "/home/projects-view-banner-dark.png",
      imageSrcLight: number === 2
        ? "/home/project-inside-view.png"
        : number === 3
        ? "/home/site-survey-banner.png"
        : number === 4
        ? "/home/design-engineering-banner.png"
        : number === 5
        ? "/home/signal-flow-banner.png"
        : "/home/projects-view-banner-light.png",
      ...(number === 3 ? {
        secondaryImageSrc: "/home/site-survey-create-with-ai-banner-dark.png",
        secondaryImageSrcLight: "/home/site-survey-create-with-ai-banner.png",
        secondaryImageAlt: "AVGenix Create with AI panel for recording a conversation, extracting survey data, and applying it to a site survey",
      } : {}),
      imageAlt: number === 2
        ? "AVGenix project workspace showing milestones, project tools, rooms, costs, labor, margins, and team members"
        : number === 3
        ? "AVGenix Site Survey room assessment with structured AV site information, dimensions, notes, and required room photos"
        : number === 4
        ? "AVGenix Design Engineering workspace showing room design, display and camera calculations, floor and ceiling plans, and elevations"
        : number === 5
        ? "AVGenix Signal Flow Builder showing connected AV equipment, signal paths, room locations, and system annotations"
        : "AVGenix Projects view showing project filters and project records",
      imagePresentation: "framed" as const,
      ctaLabel: number === 3
        ? "Start a Site Survey"
        : number === 4
        ? "Open Room Designer"
        : number === 5
        ? "Open Signal Flow Builder"
        : "Go to Projects",
      ctaHref: "/projects",
    } : {}),
  };
});
