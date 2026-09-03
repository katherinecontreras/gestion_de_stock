const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidPassword(value) {
    return PASSWORD_RULE.test(value);
}
export function passwordsMatch(password, confirmation) {
    return password.length > 0 && password === confirmation;
}
export function isNonEmpty(value) {
    return Boolean(value && value.trim().length > 0);
}
export function isValidEmail(value) {
    return EMAIL_RULE.test(String(value ?? "").trim());
}
export function digitsOnly(value) {
    return String(value ?? "").replace(/\D/g, "");
}
