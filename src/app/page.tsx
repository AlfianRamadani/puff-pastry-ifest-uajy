import StudyPatternCard from "./components/dashboard/StudyPatternCard";
import MetricCards from "./components/dashboard/MetricCards";

export default function Home() {
  return (
    <section className="flex flex-col gap-5 md:gap-6 font-sans" aria-label="Dashboard">
      <StudyPatternCard />
      <MetricCards />
    </section>
  );
}
