# EQA Tactical

منصة تخطيط توزيع اللاعبين على خريطة الحرب. الواجهة ثابتة وقابلة للنشر على أي استضافة ملفات ثابتة، والبيانات الدائمة والمصادقة عبر Supabase فقط.

## التشغيل

```bash
cp .env.example .env.local
# ضع NEXT_PUBLIC_SUPABASE_URL وNEXT_PUBLIC_SUPABASE_ANON_KEY
pnpm install
pnpm dev
```

## إعداد Supabase

1. أنشئ مشروع Supabase جديداً.
2. من SQL Editor شغّل `supabase/schema.sql`.
3. من Authentication > Providers > Email عطّل Confirm email إذا أردت تسجيل الدخول مباشرة بعد التسجيل، لأن المنتج لا يشترط تأكيد البريد في الإصدار الأول.
4. انسخ Project URL وPublishable/Anon key إلى `.env.local` أو متغيرات البيئة في منصة النشر.
5. لا تضع Service Role key في الواجهة أو مستودع Git.

Supabase Auth يضمن أن البريد لا ينشئ حساباً ثانياً. RLS في المخطط يمنع حساباً من قراءة أو تعديل خطط حساب آخر.

تحتوي الخطة على اسم التحالف، ويحتوي الملف الشخصي على اسم صاحب الحساب. إذا كانت قاعدة Supabase الحالية أُنشئت من نسخة أقدم، شغّل ملف `supabase/schema.sql` مرة أخرى لتطبيق `alter table ... add column if not exists` والسياسات الجديدة.

## البناء والنشر

```bash
pnpm typecheck
pnpm test
pnpm build
```

المجلد الناتج هو `out/`. على Netlify استخدم `netlify.toml`. على Render اختر Static Site، والأمر `pnpm install --frozen-lockfile && pnpm build` ومجلد النشر `out`. على Railway يمكن استخدام خدمة Static/خادم ملفات يستضيف `out` أو تشغيل البناء في بيئة Node؛ لا يعتمد الكود على API خاص بأي مزود.

يجب ضبط متغيري Supabase العامين في كل منصة. قيمة anon/public آمنة للمتصفح عند تفعيل RLS؛ لا تُستخدم كلمات مرور أو مفاتيح خاصة في البناء.
