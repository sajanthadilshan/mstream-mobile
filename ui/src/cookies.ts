const COOKIE_NAME = "notifications";

// Check if a number exists in the cookie
export function hasNumber(number: number): boolean {
  const cookie = document.cookie
    .split("; ")
    .find(row => row.startsWith(`${COOKIE_NAME}=`));

  if (!cookie) return false;

  const numbers: number[] = JSON.parse(
    decodeURIComponent(cookie.substring(COOKIE_NAME.length + 1))
  );

  return numbers.includes(number);
}

// Add a number to the cookie
export function addNumber(number: number): void {
  const cookie = document.cookie
    .split("; ")
    .find(row => row.startsWith(`${COOKIE_NAME}=`));

  const numbers: number[] = cookie
    ? JSON.parse(decodeURIComponent(cookie.substring(COOKIE_NAME.length + 1)))
    : [];

  if (!numbers.includes(number)) {
    numbers.push(number);
  }

  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(
    JSON.stringify(numbers)
  )}; max-age=86400; path=/`;
}