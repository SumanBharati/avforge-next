import type { HomeDemoVideo } from "@/lib/home-demo-videos";

function VideoPlaceholder({ demo }: { demo: HomeDemoVideo }) {
  if (demo.videoSrc) {
    return (
      <video
        className="aspect-square h-auto w-full rounded-3xl bg-slate-950 object-cover shadow-2xl shadow-violet-950/15"
        controls
        playsInline
        preload="metadata"
        poster={demo.posterSrc}
        aria-label={`${demo.title} walkthrough video`}
      >
        <source src={demo.videoSrc} />
        Your browser does not support embedded video.
      </video>
    );
  }

  return (
    <div
      className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-blue-600 to-indigo-950 shadow-2xl shadow-violet-950/15"
      role="img"
      aria-label={`${demo.title} walkthrough video placeholder`}
    >
      <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full border border-white/15" />
      <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full border border-white/10" />
      <div className="relative flex flex-col items-center px-8 text-center text-white">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-white/15 shadow-xl backdrop-blur-sm">
          <svg width="25" height="25" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-white/65">Walkthrough video</p>
        <p className="mt-2 font-display text-2xl font-bold sm:text-3xl">{demo.title}</p>
        <p className="mt-3 text-sm text-white/65">Video coming soon</p>
      </div>
    </div>
  );
}

export default function DemoVideoSection({ demos }: { demos: HomeDemoVideo[] }) {
  return (
    <section id="walkthroughs" className="scroll-mt-[124px] bg-forge-bg px-4 py-20 sm:px-6 sm:py-24 lg:px-8" aria-labelledby="demo-video-heading">
      <div className="mx-auto max-w-7xl">
        <header className="mx-auto mb-16 max-w-3xl text-center sm:mb-20">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-500">Product walkthroughs</p>
          <h2 id="demo-video-heading" className="mt-4 font-display text-3xl font-bold text-heading sm:text-4xl lg:text-5xl">See AVGenix in Action</h2>
          <p className="mt-5 text-base leading-7 text-muted sm:text-lg">Follow the workflows that connect AV design, project delivery, and equipment management in one place.</p>
        </header>

        <div className="flex flex-col gap-20 sm:gap-24 lg:gap-28">
          {demos.map((demo, index) => {
            const videoFirst = index % 2 === 0;
            return (
              <article key={demo.id} id={`demo-${demo.id}`} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16 xl:gap-24">
                <div className={`mx-auto w-full max-w-[540px] ${videoFirst ? "lg:order-1" : "lg:order-2"}`}>
                  <VideoPlaceholder demo={demo} />
                </div>
                <div className={`mx-auto w-full max-w-lg ${videoFirst ? "lg:order-2" : "lg:order-1"}`}>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-500">Walkthrough {index + 1}</p>
                  <h3 className="mt-3 font-display text-3xl font-bold leading-tight text-heading sm:text-4xl">{demo.title}</h3>
                  <p className="mt-5 text-base leading-7 text-muted sm:text-lg">{demo.description}</p>
                  <div className="mt-7 h-px w-16 bg-blue-500/50" />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
