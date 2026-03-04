import PageTitle from "@/components/common/PageTitle";

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto space-y-4 text-center">
      <PageTitle title="404" subtitle="Page not found." />
      <div className="text-white/60">Check the URL or use navigation.</div>
    </div>
  );
}
