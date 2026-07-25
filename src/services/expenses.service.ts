export function saveExpenses(
  tripId: string,
  token: string,
  expenses: unknown,
): Promise<Response> {
  return fetch(`/api/trips/${tripId}/expenses`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ expenses }),
  });
}
