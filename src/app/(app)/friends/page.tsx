import StartStudySession from "@/app/components/friends/StartStudySession";
import FriendsList from "@/app/components/friends/FriendsList";

export default function FriendsPage() {
  return (
    <section
      className="flex flex-col gap-5 md:gap-6 font-sans"
      aria-label="Friends"
    >
      <StartStudySession />
      <FriendsList />
    </section>
  );
}
