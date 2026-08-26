import { formatDisplayDate } from "./formatDate";
import type { Attraction } from "@/types/attraction";

export function flightMeta(a: Attraction): string {
  const route = [a.departureAirport, a.arrivalAirport].filter(Boolean).join(" → ");
  const depTime = a.departureTime ? a.departureTime.split("T")[1]?.slice(0, 5) : "";
  const arrTime = a.arrivalTime   ? a.arrivalTime.split("T")[1]?.slice(0, 5)   : "";
  const times   = depTime && arrTime ? `${depTime}–${arrTime}` : depTime || arrTime;
  const date    = a.plannedDate ? formatDisplayDate(a.plannedDate) : "";
  return [a.airline, a.flightNumber, route, times, date].filter(Boolean).join(" · ");
}
