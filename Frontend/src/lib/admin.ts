export const ADMIN_PHONES = ['9014011885', '7416995503'];
export const ADMIN_EMAILS = ['ashokreddy@inventorheads.com'];

export const isAdminPhone = (phone: string | null) =>
  Boolean(phone && ADMIN_PHONES.includes(phone));

export const isAdminEmail = (email: string | null) =>
  Boolean(email && ADMIN_EMAILS.includes(email.toLowerCase()));

// Recognizes admins by phone allowlist (phone OTP accounts), email allowlist
// (email-registered accounts), or by accountType (promoted to admin in the DB).
export const isAdminUser = (phone: string | null, accountType?: string | null, email?: string | null) =>
  isAdminPhone(phone) || isAdminEmail(email ?? null) || accountType === 'admin';
