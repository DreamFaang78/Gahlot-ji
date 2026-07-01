import { createFileRoute } from "@tanstack/react-router";
import ControllerShowcase from "../components/ControllerShowcase";

export const Route = createFileRoute("/controllers")({
  component: ControllersPage,
  head: () => ({
    meta: [
      { title: "Controllers | TIMKOLAS" },
      {
        name: "description",
        content: "Explore our range of precision gaming controllers.",
      },
    ],
  }),
});

function ControllersPage() {
  return (
    <main className="w-full">
      <ControllerShowcase />
    </main>
  );
}
