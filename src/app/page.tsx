import Assistant from "@/components/Assistant";

export default function Home() {
  return (
    <>
      <header className="bg-slate-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <h1 className="text-3xl font-bold tracking-tight">SmogSense</h1>
          <p className="mt-1 max-w-2xl text-slate-200">
            Live air quality for your city, turned into a personal plan: when to go out, how to keep indoor air clean, and greener choices with their real impact.
          </p>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-5xl px-4 py-8 focus:outline-none">
        <Assistant />
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-slate-700">
          <p>
            Air-quality data:{" "}
            <a className="underline" href="https://openaq.org" rel="noopener noreferrer">OpenAQ</a> and{" "}
            <a className="underline" href="https://data.gov.in" rel="noopener noreferrer">CPCB via data.gov.in</a>. AQI follows the CPCB National AQI method.
            Advice is general guidance, not medical advice.
          </p>
        </div>
      </footer>
    </>
  );
}
