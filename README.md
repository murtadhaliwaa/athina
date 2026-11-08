# Athena Café — نظام الطلبات

نظام نقاط بيع للكوفي (ويتر / كاشير / مالك) — عربي عراقي RTL، مبالغ بالدينار كأعداد صحيحة.

المرجع الكامل: [`docs/GUIDE.md`](docs/GUIDE.md).

## التشغيل المحلي

1. انسخ `.env.example` إلى `.env.local` واملأ المفاتيح.
2. `npm install`
3. `npx prisma migrate deploy`
4. `npm run db:seed` (للتطوير فقط)
5. `npm run dev`

## النشر على Vercel (خطوة بخطوة)

1. ادفع المستودع إلى GitHub/GitLab ثم Import في [Vercel](https://vercel.com).
2. Framework: **Next.js** — أمر البناء `npm run build` (يشغّل `prisma generate` تلقائياً).
3. أضف متغيرات البيئة (Production) من `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (أو publishable)
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL` (pooler `:6543` + `?pgbouncer=true&connection_limit=5`)
   - `DIRECT_URL` (جلسة مباشرة للـ migrations)
   - `PIN_PEPPER` (عشوائي قوي 32+ حرف)
   - `SEED_DEMO=0`
4. بعد أول نشر ناجح، من جهازك مع نفس `DATABASE_URL`/`DIRECT_URL` للإنتاج:
   `npm run db:migrate:deploy`
5. أنشئ مستخدم المالك في Supabase Auth ثم اربط الملف عبر أدوات المالك/الـ seed الآمن — **لا** تشغّل `db:seed:demo` على الإنتاج.

## الإنتاج (قبل تسليم العميل)

- مشروع **Supabase منفصل** عن التطوير.
- `SEED_DEMO=0` ولا تشغّل سكربتات `db:seed:demo` على الإنتاج.
- عيّن `PIN_PEPPER` قوياً واحفظه بأمان — تغييره يكسر كل الـ PIN.
- عطّل التسجيل الذاتي في Supabase Auth.
- تحقق أن RLS مفعّل على كل الجداول.
- `NEXT_PUBLIC_SUPABASE_URL` يجب أن يطابق مشروع الصور (يُقرأ تلقائياً في `next.config`).
- خطة Supabase مدفوعة موصى بها للتشغيل اليومي (نسخ احتياطي واستقرار).
- القائمة الكاملة: [`docs/PRE-DELIVERY.md`](docs/PRE-DELIVERY.md).

## الأوامر

| أمر | الغرض |
|-----|--------|
| `npm run dev` | تطوير |
| `npm run build` | بناء إنتاج |
| `npm test` | اختبارات الوحدة (مال / صلاحيات / وقت) |
| `npm run test:e2e` | دخان Playwright |
| `npm run db:migrate` | migrations (تطوير) |

## الأدوار

- **ويتر:** طاولات وطلبات
- **كاشير:** حالات الطلب، فواتير، شفت
- **مالك:** منيو، موظفون، تقارير، سجل تدقيق

## التسليم للعميل

- قائمة كاملة: [`docs/PRE-DELIVERY.md`](docs/PRE-DELIVERY.md)
- تدريب: [`docs/TRAINING-WAITER.md`](docs/TRAINING-WAITER.md) · [`docs/TRAINING-CASHIER.md`](docs/TRAINING-CASHIER.md) · [`docs/TRAINING-OWNER.md`](docs/TRAINING-OWNER.md)
- المواصفات: [`docs/GUIDE.md`](docs/GUIDE.md)
