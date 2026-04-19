/**
 * Validación simple de email. Se separa del módulo mail.ts porque
 * ese importa nodemailer (server-only), y los componentes cliente
 * necesitan validar emails sin tirar del bundle de nodemailer.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
