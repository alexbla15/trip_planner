// Returns the raw Response (not parse/throw) because its only caller runs this
// alongside a second, independent request via Promise.all and checks `.ok` on
// each response separately — see ExpensesPanel's handleSave.
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
