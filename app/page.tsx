import Image from "next/image";
import Link from "next/link";
import { HeroInstrument } from "@/components/HeroInstrument";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { COURSE } from "@/lib/course";
import { getBench, scoreById } from "@/lib/experiments/bench";
import sweep from "@/lib/experiments/sweep.json";

export default function HomePage() {
  const bench = getBench();
  const wet = scoreById(bench, "wet-bulb");
  const boundary = scoreById(bench, "boundary-break");
  const late = scoreById(bench, "late-letters");

  return (
    <>
      <SiteHeader />
      <main>
        <section className="grid lg:min-h-[calc(100vh-4.5rem)] lg:grid-cols-12">
          <div className="flex flex-col justify-between px-5 py-10 md:px-10 lg:col-span-7 lg:py-14">
            <div>
              <p className="kicker rise text-brass">
                {COURSE.code} · {COURSE.subject} · {COURSE.student} · {COURSE.registration}
              </p>
              <h1 className="display rise delay-1 mt-5 max-w-xl text-[3.3rem] leading-[0.92] md:text-7xl">
                Watch a model age in the weather.
              </h1>
              <p className="rise delay-2 mt-6 max-w-lg text-lg leading-8 text-ink-soft">
                Production models fail quietly. Inputs drift, the decision boundary moves, and the labels come back late.
                Heliograph reads those three changes apart and names the next action: hold, inspect, or retrain.
              </p>
              <div className="rise delay-3 mt-8 flex flex-wrap items-center gap-5">
                <Link href="/observatory" className="bg-ink px-5 py-3 text-sm text-paper transition hover:bg-sea">
                  Enter the observatory
                </Link>
                <Link href="/desk" className="text-sm underline decoration-brass underline-offset-4">
                  Cast a front
                </Link>
                <Link href="/report" className="text-sm underline decoration-brass underline-offset-4">
                  Read the report
                </Link>
              </div>
            </div>
            <div className="rise delay-4 mt-12 max-w-md">
              <HeroInstrument />
            </div>
          </div>
          <div className="relative min-h-[70vh] overflow-hidden bg-ink lg:col-span-5 lg:min-h-full">
            <Image
              src="/images/hero-ridge.jpg"
              alt="A brass heliograph on a wooden tripod, facing a coastal wind farm in low sun"
              fill
              priority
              className="kenburns object-cover"
              sizes="(min-width: 1024px) 42vw, 100vw"
            />
            <p className="absolute bottom-4 left-4 bg-paper/90 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink">
              North array · last light
            </p>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:px-8 lg:grid-cols-3">
          <Failure
            index="01"
            title="The probe moves"
            body={`Humidity jumps two standard deviations. PSI crosses 0.25 in ${wet.psiDelay} samples. Calibration holds, so the ticket says inspect. A retrain would spend labels on a sensor.`}
            href="/observatory?scenario=wet-bulb"
          />
          <Failure
            index="02"
            title="The boundary moves"
            body={`The weather is unchanged and the fault physics are not. PSI stays silent. Calibration breaks in ${boundary.eceDelay} samples, and the ticket says retrain.`}
            href="/observatory?scenario=boundary-break"
          />
          <Failure
            index="03"
            title="The letters are late"
            body={`The same break, with labels delayed ${late.labelDelay} samples. Detection arrives at ${late.eceDelay}. Nothing that needs a label can beat that wait.`}
            href="/observatory?scenario=late-letters"
          />
        </section>

        <section className="relative min-h-[70vh] overflow-hidden bg-night text-paper">
          <Image
            src="/images/fog-distributions.jpg"
            alt="Amber and teal smoke overlapping in darkness, like two distributions passing through each other"
            fill
            className="object-cover opacity-80"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-night via-night/70 to-transparent" />
          <div className="relative z-10 flex min-h-[70vh] max-w-xl flex-col justify-end px-5 py-16 md:px-12">
            <p className="kicker text-brass-bright">Two climates</p>
            <h2 className="display mt-4 text-4xl leading-[1.05] md:text-6xl">Only one of them is the model’s fault.</h2>
            <p className="mt-5 text-base leading-7 text-paper/80">
              A shifted input with a true boundary still deserves a technician. A stable input with a lying probability deserves a new fit.
            </p>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 md:px-8 lg:grid-cols-2">
          <div>
            <p className="kicker text-brass">The rule, written down first</p>
            <h2 className="display mt-3 text-4xl leading-tight md:text-5xl">Four moves, then a sentence.</h2>
            <ol className="mt-8 space-y-5">
              <Step n="01" title="Lock a reference" body="Train on the opening climate. Freeze the weights, the threshold, and the histograms." />
              <Step n="02" title="Read the sensors" body="Population stability on every feature, against that lock. Alarm at the textbook 0.25." />
              <Step n="03" title="Read the letters" body="Calibration error and a Page-Hinkley test, using only labels that have arrived." />
              <Step n="04" title="Name the action" body="Inspect, retrain, or hold. The observatory shows the sentence as a ticket." />
            </ol>
            <Link href="/protocol" className="mt-8 inline-block text-sm underline decoration-brass underline-offset-4">
              See the six-weather protocol
            </Link>
          </div>
          <figure className="relative">
            <div className="relative aspect-[4/3] overflow-hidden bg-ink">
              <Image
                src="/images/nacelle.jpg"
                alt="Close view of a wind turbine hub and blade roots in warm coastal fog"
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 40vw, 100vw"
              />
            </div>
            <figcaption className="mt-3 flex items-end justify-between gap-4">
              <p className="max-w-xs text-sm leading-6 text-ink-soft">
                Across seeds {sweep.seeds[0]}–{sweep.seeds.at(-1)}, the diagnosis matches the ground truth on {sweep.hits} of {sweep.trials} runs.
              </p>
              <Image
                src="/images/mark.jpg"
                alt="A brass signaling instrument on a small tripod"
                width={88}
                height={88}
                className="h-20 w-20 object-cover"
              />
            </figcaption>
          </figure>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Failure({ index, title, body, href }: { index: string; title: string; body: string; href: string }) {
  return (
    <Link href={href} className="group block border-t border-ink/15 pt-5">
      <p className="kicker text-brass">{index}</p>
      <h2 className="display mt-3 text-3xl group-hover:text-sea">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-ink-soft">{body}</p>
    </Link>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="grid grid-cols-[2.5rem_1fr] gap-3">
      <span className="font-mono text-xs text-brass">{n}</span>
      <span>
        <span className="block font-medium">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-ink-soft">{body}</span>
      </span>
    </li>
  );
}
