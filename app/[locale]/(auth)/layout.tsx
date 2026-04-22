import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 lg:px-10 h-16">
        <Link href="/" className="font-display text-lg">LaunchKit</Link>
        <LanguageToggle />
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        {children}
      </main>
    </div>
  );
}
