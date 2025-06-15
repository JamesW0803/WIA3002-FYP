export function getUserIdFromStorage() {
  // we wrote it under "userId"
  const raw = localStorage.getItem("userId");
  return raw || null;
}
