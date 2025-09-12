import type { Contributor } from "@/lib/types";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@call/ui/components/avatar";
import { Button } from "@call/ui/components/button";
import { SquareDot } from "@call/ui/components/square-dot";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contributors of Call",
  description: "Meet the amazing contributors who make Call possible",
};

async function getContributors(): Promise<Contributor[]> {
  try {
    const response = await fetch(
      "https://api.github.com/repos/joincalldotco/Call/contributors",
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Call-Web-App",
        },
        next: { revalidate: 600 },
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch contributors");
      return [];
    }

    const contributors = (await response.json()) as Contributor[];

    const filteredContributors = contributors.filter(
      (contributor: Contributor) => contributor.type === "User"
    );

    return filteredContributors;
  } catch (error) {
    console.error("Error fetching contributors:", error);
    return [];
  }
}

export default async function Contributors() {
  const contributors = await getContributors();
  const topContributors = contributors.slice(0, 2);
  const otherContributors = contributors.slice(2);

  return (
    <main className="bg-muted dark:bg-background relative z-0 mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-16 px-6 py-20">
      {/* Top 2 Contributors */}
      {topContributors.length > 0 && (
        <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-12 px-6 pt-20">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <h1 className="font-lora text-primary/90 text-4xl font-bold">
              Top Aura farmers 😎
            </h1>
            <p className="text-muted-foreground max-w-md text-lg">
              The devs who farmed the most Aura by contributing to Call
            </p>
          </div>
          <div className="flex w-full flex-row justify-center gap-8">
            {topContributors.map((contributor) => (
              <Link
                key={contributor.id}
                href={contributor.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-background hover:border-primary/15 flex w-full max-w-sm flex-col items-center gap-6 rounded-3xl border px-8 py-8 transition-all duration-300 dark:border-white/5 dark:hover:border-white/10"
              >
                <Avatar className="h-20 w-20">
                  <AvatarImage
                    src={contributor.avatar_url}
                    alt={`${contributor.login}'s avatar`}
                  />
                  <AvatarFallback className="text-lg font-medium">
                    {contributor.login.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-center justify-center gap-2">
                  <p className="text-primary/90 text-lg font-semibold">
                    {contributor.login}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {contributor.contributions} Aura
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="bg-border relative mx-auto flex h-px w-full max-w-lg items-center justify-center gap-2 dark:bg-white/5">
        <SquareDot />
        <SquareDot position="bottomRight" />
      </div>

      {/* Other Contributors */}
      <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-12 px-6">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <h2 className="font-lora text-primary/90 text-3xl font-bold">
            Call Community
          </h2>
          <p className="text-muted-foreground max-w-md text-base">
            Every Aura matters. Meet the community behind Call.
          </p>
        </div>

        {otherContributors.length > 0 && (
          <div className="grid w-full grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {otherContributors.map((contributor) => (
              <Link
                key={contributor.id}
                href={contributor.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:border-ring group flex flex-col items-center gap-3 rounded-xl p-4 transition-colors duration-200"
              >
                <Avatar className="h-14 w-14">
                  <AvatarImage
                    src={contributor.avatar_url}
                    alt={`${contributor.login}'s avatar`}
                  />
                  <AvatarFallback className="text-sm font-medium">
                    {contributor.login.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="text-primary/80 group-hover:text-primary/90 w-full truncate text-sm font-medium transition-colors">
                    {contributor.login}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {contributor.contributions} Aura
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="relative mx-auto flex w-full max-w-2xl flex-col items-center justify-center gap-8 px-6 pb-20">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <h3 className="font-lora text-primary/90 text-2xl font-bold">
            Ready to Farm Aura?????
          </h3>
          <p className="text-muted-foreground max-w-md text-base">
            Start building the future of meetings with us.
          </p>
        </div>
        <div className="flex gap-4">
          <Button asChild size="lg">
            <Link
              href="https://github.com/joincalldotco/Call"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
