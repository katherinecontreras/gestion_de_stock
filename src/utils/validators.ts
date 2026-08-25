const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

export function isValidPassword(value: string) {
  return PASSWORD_RULE.test(value);
}

export function passwordsMatch(password: string, confirmation: string) {
  return password.length > 0 && password === confirmation;
}

export function isNonEmpty(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0);
}
