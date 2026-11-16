import { redirect } from "next/navigation";

// Trip types are listed on the main settings screen.
export default function TripTypesIndex() {
  redirect("/settings");
}
