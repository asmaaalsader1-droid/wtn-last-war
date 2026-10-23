const MESSAGE_MAP: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /invalid login credentials/i, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' },
  { pattern: /email not confirmed/i, message: 'لم يتم تأكيد البريد الإلكتروني بعد. تحقق من بريدك أو عطّل تأكيد البريد من إعدادات Supabase.' },
  { pattern: /user already registered/i, message: 'هذا البريد مسجّل مسبقاً. سجّل الدخول بدلاً من إنشاء حساب جديد.' },
  { pattern: /password should be at least/i, message: 'كلمة المرور قصيرة جداً. استخدم ستة أحرف على الأقل.' },
  { pattern: /unable to validate email address/i, message: 'صيغة البريد الإلكتروني غير صحيحة.' },
  { pattern: /email rate limit exceeded|over_email_send_rate_limit/i, message: 'محاولات كثيرة. انتظر قليلاً ثم حاول مرة أخرى.' },
  { pattern: /for security purposes, you can only request this after/i, message: 'لأسباب أمنية، انتظر قليلاً قبل إعادة المحاولة.' },
  { pattern: /new password should be different/i, message: 'كلمة المرور الجديدة يجب أن تختلف عن السابقة.' },
  { pattern: /auth session missing|not authenticated|jwt expired/i, message: 'انتهت جلسة الدخول. سجّل الدخول مرة أخرى.' },
  { pattern: /failed to fetch|networkerror|load failed/i, message: 'تعذر الاتصال بالخدمة. تحقق من اتصال الإنترنت وحاول مرة أخرى.' },
  { pattern: /duplicate key value violates unique constraint/i, message: 'هذا العنصر موجود مسبقاً.' },
  { pattern: /row-level security|permission denied/i, message: 'لا تملك صلاحية تنفيذ هذا الإجراء على هذا العنصر.' },
];

/**
 * Supabase returns English messages. Users see a matching Arabic sentence when
 * one is known; otherwise the original message is kept so nothing is hidden.
 */
export function translateAuthError(error: unknown): string {
  if (!error) return '';
  const raw = typeof error === 'string' ? error : error instanceof Error ? error.message : String((error as { message?: string })?.message ?? error);
  const match = MESSAGE_MAP.find((entry) => entry.pattern.test(raw));
  return match ? match.message : raw;
}
