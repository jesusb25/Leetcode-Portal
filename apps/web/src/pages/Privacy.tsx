import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { FireIcon } from "../components/FireIcon";
import { SiteFooter } from "../components/SiteFooter";
import { ThemeToggle } from "../components/ThemeToggle";
import { useThemePreference } from "../lib/theme";

// Public privacy policy. Required for Google OAuth consent-screen verification
// and linked from the homepage footer. Keep this accurate to what the app
// actually collects and stores — Google reviewers check that it matches the
// scopes you request and the data you handle.
const LAST_UPDATED = "June 10, 2026";
const CONTACT_EMAIL = "jesusballesteros2500@gmail.com";

export function Privacy() {
  const { isDark, setTheme } = useThemePreference();
  return (
    <div className="min-h-screen bg-stone-50 px-4 py-10 dark:bg-gray-950">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-4 flex justify-end">
          <ThemeToggle
            isDark={isDark}
            onToggle={() => setTheme(isDark ? "light" : "dark")}
          />
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-stone-500 transition hover:text-stone-800 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <FireIcon className="h-5 w-5" />
          <span>Leetcode SRS</span>
        </Link>

        <h1 className="mt-6 text-2xl font-bold text-stone-900 dark:text-gray-100">
          Privacy Policy
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-gray-400">
          Last updated: {LAST_UPDATED}
        </p>

        <div className="mt-8 space-y-8">
          <Section title="Overview">
            <P>
              Leetcode SRS (&ldquo;the app&rdquo;, &ldquo;we&rdquo;,
              &ldquo;us&rdquo;) is a personal spaced-repetition tool for tracking
              and reviewing LeetCode problems. This policy explains what
              information the app collects, how it is used, and the choices you
              have. We aim to collect only what is needed to run the service.
            </P>
          </Section>

          <Section title="Information we collect">
            <P>
              <strong className="font-semibold">Account information.</strong> The
              app lets you sign in with Google. When you do, our authentication
              provider (Supabase) receives basic profile information from your
              Google Account: your name, email address, profile picture, and a
              unique Google account identifier. We use this only to create and
              identify your account.
            </P>
            <P>
              <strong className="font-semibold">Content you create.</strong> As
              you use the app it stores the data you generate: the LeetCode
              problems you track (including any you add yourself), your review
              history and recall ratings, and the spaced-repetition schedule
              derived from them. New accounts are seeded with the public NeetCode
              150 problem list.
            </P>
            <P>
              <strong className="font-semibold">
                Technical and device data.
              </strong>{" "}
              Your browser stores a session token (so you stay signed in) and
              your light/dark theme preference in local storage. Our hosting
              providers may process standard technical information such as your
              IP address and request logs as part of delivering the service.
            </P>
          </Section>

          <Section title="How we use information">
            <P>We use the information described above to:</P>
            <Ul
              items={[
                "Authenticate you and keep you signed in.",
                "Store and display the problems, reviews, and schedules that make up your account.",
                "Operate, maintain, and secure the service.",
              ]}
            />
            <P>
              We do not use your information for advertising, and we do not sell
              your personal information.
            </P>
          </Section>

          <Section title="Google user data — Limited Use">
            <P>
              Leetcode SRS&rsquo;s use and transfer of information received from
              Google APIs will adhere to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements. We request only the basic
              profile and email scopes needed for sign-in, and we do not transfer
              this data to others except as needed to provide the service, comply
              with applicable law, or as part of a merger or acquisition.
            </P>
          </Section>

          <Section title="How information is stored and shared">
            <P>
              Your data is stored in a hosted PostgreSQL database provided by
              Supabase, and the application is hosted on Render. These providers
              act as our service providers (subprocessors) and process data on
              our behalf to run the app. We do not share your personal
              information with other third parties except:
            </P>
            <Ul
              items={[
                "With service providers that host and operate the app, under their respective terms;",
                "When required by law or to protect rights, safety, and security;",
                "With your consent.",
              ]}
            />
          </Section>

          <Section title="Data retention and deletion">
            <P>
              We keep your account data for as long as your account exists. You
              can request deletion of your account and all associated data at any
              time by emailing us at the address below. Once your account is
              deleted, your problems, reviews, and schedule are removed from the
              database.
            </P>
          </Section>

          <Section title="Your choices">
            <P>
              You may request access to, correction of, or deletion of your
              personal information by contacting us. You can also stop using the
              app at any time and request that your account be removed.
            </P>
          </Section>

          <Section title="Children">
            <P>
              The app is not directed to children under 13, and we do not
              knowingly collect personal information from them.
            </P>
          </Section>

          <Section title="Changes to this policy">
            <P>
              We may update this policy from time to time. When we do, we will
              revise the &ldquo;Last updated&rdquo; date above. Continued use of
              the app after a change means you accept the updated policy.
            </P>
          </Section>

          <Section title="Contact">
            <P>
              Questions about this policy or your data? Email{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="underline underline-offset-2"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </P>
          </Section>
        </div>

        <SiteFooter />
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-stone-900 dark:text-gray-100">
        {title}
      </h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}

function P({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm leading-relaxed text-stone-600 dark:text-gray-300">
      {children}
    </p>
  );
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-stone-600 dark:text-gray-300">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
