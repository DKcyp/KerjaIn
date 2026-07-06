import CalendarPageClient from "./CalendarPageClient";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Kalender",
  description: "Halaman Kalender",
  // other metadata
};
export default function page() {
  return (
    <CalendarPageClient />
  );
}
