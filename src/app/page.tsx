import StudyPatternCard from "./components/dashboard/StudyPatternCard";
import MetricCards from "./components/dashboard/MetricCards";

export default function Home() {
  return (
    <div className="flex flex-col gap-5 md:gap-6 font-sans">
      <StudyPatternCard />
      <MetricCards />
    </div>
  );
}
