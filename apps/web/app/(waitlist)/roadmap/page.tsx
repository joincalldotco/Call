import Link from "next/link";
import { Badge } from "@call/ui/components/badge";
import { siteConfig } from "@/lib/site";
import { Icons } from "@call/ui/components/icons";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Call - Roadmap",
};

type Status = "completed" | "in-progress" | "not-started";

function StatusBadge({ status }: { status: Status }) {
  const labelMap: Record<Status, string> = {
    completed: "Completed",
    "in-progress": "In progress",
    "not-started": "Not started",
  };

  const colorMap: Record<Status, string> = {
    completed: "bg-emerald-500 text-white border-emerald-500",
    "in-progress": "bg-blue-500 text-white border-blue-500",
    "not-started": "bg-zinc-600 text-white border-zinc-600",
  };

  return <Badge className={colorMap[status]}>{labelMap[status]}</Badge>;
}

export default function Page() {
  return (
    <section className="pt-30 relative mx-auto w-full max-w-5xl px-6 pb-16">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Roadmap</h1>
        <Badge
          asChild
          className="cursor-pointer gap-1 bg-[#202020] text-white hover:bg-[#202020]/80"
        >
          <a
            href="https://github.com/joincalldotco"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open Source"
          >
            <Icons.github className="h-3 w-3" /> Open Source
          </a>
        </Badge>
      </header>

      <div className="mb-10 flex items-center gap-4">
        <img
          src="https://pbs.twimg.com/profile_images/1920915385798283264/v267Rbux_400x400.jpg"
          alt="@yassratti avatar"
          width={56}
          height={56}
          className="h-14 w-14 rounded-full object-cover"
        />
        <div className="flex flex-col">
          <span className="text-muted-foreground text-sm">19/08/2025</span>
          <Link
            href="https://x.com/yassratti"
            target="_blank"
            rel="noreferrer"
            className="font-medium hover:underline"
          >
            @yassratti
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-8">
        {/* First things first */}
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">
              First things first
            </h2>
            <StatusBadge status="completed" />
          </div>
          <p className="text-muted-foreground mt-2 text-lg">
            Create the repo, set up the stack, and launch the waitlist with a
            Twitter announcement. That’s where we start.
          </p>
        </div>

        {/* Video calls */}
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">
              Video calls (experimental with mediasoup)
            </h2>
            <StatusBadge status="completed" />
          </div>
          <p className="text-muted-foreground mt-2 text-lg">
            The goal is to have full control of the conference with no
            intermediaries. Minimum features inside a call:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-lg">
            <li>Chat between members</li>
            <li>Screen sharing</li>
            <li>Media controls (mute/unmute, turn camera off, hang up)</li>
            <li>See participant list</li>
            <li>Join via link or code</li>
          </ul>
        </div>

        {/* History & Meetings */}
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">
              History & Meetings
            </h2>
            <StatusBadge status="completed" />
          </div>
          <p className="text-muted-foreground mt-2 text-lg">
            Every call should leave a record: who joined, date, duration, etc.
            Users should also be able to delete history. It’ll also be possible
            to schedule meetings (incomplete for now, but planned to integrate
            with <span className="font-medium">cal.com</span>, who already
            showed interest in having us in their app store).
          </p>
        </div>

        {/* Teams */}
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">
              Teams (basic)
            </h2>
            <StatusBadge status="completed" />
          </div>
          <p className="text-muted-foreground mt-2 text-lg">
            The idea is that the team can join a meeting with one single click,
            no need to generate links or repeat setup every time.
          </p>
        </div>

        {/* Contacts */}
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">Contacts</h2>
            <StatusBadge status="completed" />
          </div>
          <p className="text-muted-foreground mt-2 text-lg">
            Have contacts inside the app to start instant calls without leaving
            the app or sharing links.
          </p>
        </div>

        {/* Use without signup */}
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">
              Use the app without signing up
            </h2>
            <StatusBadge status="in-progress" />
          </div>
          <p className="text-muted-foreground mt-2 text-lg">
            Craft a great experience for trying the app with no account
            required: join calls, explore core features, and get real value
            before creating an account.
          </p>
        </div>

        {/* Notifications */}
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">
              Notifications
            </h2>
            <StatusBadge status="completed" />
          </div>
          <p className="text-muted-foreground mt-2 text-lg">
            Everything comes here:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-lg">
            <li>If someone schedules a call with you (via cal.com)</li>
            <li>Direct call invitations</li>
            <li>When your team starts a meeting</li>
          </ul>
        </div>

        {/* What’s next */}
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">
              What’s next?
            </h2>
            <StatusBadge status="not-started" />
          </div>
          <div className="flex items-center gap-3">
            <p className="text-muted-foreground mt-2 text-lg">
              After all of the above is stable and performance is solid:
            </p>
            <StatusBadge status="in-progress" />
          </div>

          <ol className="mt-2 list-decimal space-y-3 pl-5 text-sm">
            <li className="text-lg">
              <span className="text-lg font-medium">UI/UX</span>: make the
              experience exceptional.
            </li>
            <li className="text-lg">
              <span className="text-lg font-medium">AI features</span>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-lg">
                <li>Automatic meeting summaries</li>
                <li>Chat with the meeting content</li>
              </ul>
            </li>
            <li className="text-lg">
              <span className="text-lg font-medium">Record meetings</span>
            </li>
            <li className="text-lg">
              <span className="text-lg font-medium">For fun</span> a “no-show
              fine” option: if people don’t show up, the held money goes to the
              ones who were waiting lol
            </li>
          </ol>
        </div>
      </div>
      <p className="text-muted-foreground mt-8 text-xs">Updated regularly.</p>
    </section>
  );
}
