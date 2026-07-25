import { formatDisplayDate } from "@/lib/formatDate";
import { formatPrice } from "@/lib/currencies";
import type { Attraction } from "@/types/attraction";

export function residenceMeta(a: Attraction): string {
  const checkIn  = a.checkInDate  ? formatDisplayDate(a.checkInDate)  : "";
  const checkOut = a.checkOutDate ? formatDisplayDate(a.checkOutDate) : "";
  const dates    = checkIn && checkOut ? `${checkIn} → ${checkOut}` : checkIn || checkOut;
  const price    = a.price != null ? formatPrice(a.price, a.currency ?? "USD") : "";
  return [a.residenceType, dates, a.city, price].filter(Boolean).join(" · ");
}

export function flightMeta(a: Attraction): string {
  const route = [a.departureAirport, a.arrivalAirport].filter(Boolean).join(" → ");
  const depTime = a.departureTime ? a.departureTime.split("T")[1]?.slice(0, 5) : "";
  const arrTime = a.arrivalTime   ? a.arrivalTime.split("T")[1]?.slice(0, 5)   : "";
  const times   = depTime && arrTime ? `${depTime}–${arrTime}` : depTime || arrTime;
  const date    = a.plannedDate ? formatDisplayDate(a.plannedDate) : "";
  return [a.airline, a.flightNumber, route, times, date].filter(Boolean).join(" · ");
}
