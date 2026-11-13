# دليل بناء تطبيق الكوفي (ويتر / كاشير / مالك)

> نظام طلبات لكوفي واحد: الويتر يسجّل الطلب من الموبايل أو الآيباد عند الطاولة، يصل فوراً لشاشة الكاشير، والمالك يدير كل شيء ويراقب التقارير.
>
> **التقنيات:** Next.js (latest) · Prisma · Supabase (Postgres + Auth + Realtime + Storage) · Tailwind CSS · shadcn/ui · Vercel
> **اللغة:** عربي فقط (RTL) باللهجة العراقية · **العملة:** دينار عراقي فقط · **النمط:** كوفي واحد، يحتاج إنترنت (بدون Offline)

---

## جدول المحتويات

1. [نظرة عامة ونطاق النسخة الأولى](#1-نظرة-عامة-ونطاق-النسخة-الأولى)
2. [القرارات المعتمدة](#2-القرارات-المعتمدة)
3. [الأدوار والصلاحيات](#3-الأدوار-والصلاحيات)
4. [المفاهيم الأساسية وقواعد العمل](#4-المفاهيم-الأساسية-وقواعد-العمل)
5. [المعمارية](#5-المعمارية)
6. [قاعدة البيانات (Prisma Schema)](#6-قاعدة-البيانات-prisma-schema)
7. [الأمان: المصادقة، RLS، التحقق](#7-الأمان-المصادقة-rls-التحقق)
8. [هيكل المشروع](#8-هيكل-المشروع)
9. [الشاشات والتدفقات](#9-الشاشات-والتدفقات)
10. [العمليات (Server Actions) بالتفصيل](#10-العمليات-server-actions-بالتفصيل)
11. [الوقت الحقيقي (Realtime) والتنبيهات](#11-الوقت-الحقيقي-realtime-والتنبيهات)
12. [الفاتورة والطباعة والمشاركة](#12-الفاتورة-والطباعة-والمشاركة)
13. [الشفت وإغلاق الصندوق](#13-الشفت-وإغلاق-الصندوق)
14. [التقارير](#14-التقارير)
15. [الواجهة: عربي RTL، اللهجة العراقية، PWA](#15-الواجهة-عربي-rtl-اللهجة-العراقية-pwa)
16. [الإعداد خطوة بخطوة](#16-الإعداد-خطوة-بخطوة)
17. [خطة التنفيذ بالمراحل (مع Prompts لـ Cursor)](#17-خطة-التنفيذ-بالمراحل-مع-prompts-لـ-cursor)
18. [الاختبار](#18-الاختبار)
19. [النشر والتشغيل](#19-النشر-والتشغيل)
20. [قرارات معلّقة (بانتظار العميل) والافتراض المؤقت](#20-قرارات-معلّقة-بانتظار-العميل-والافتراض-المؤقت)
21. [ما هو خارج النسخة الأولى](#21-ما-هو-خارج-النسخة-الأولى)
22. [ملحق: قواعد Cursor ونصوص الواجهة](#22-ملحق-قواعد-cursor-ونصوص-الواجهة)

---

## 1. نظرة عامة ونطاق النسخة الأولى

### 1.1 الفكرة
- **الويتر** يفتح التطبيق على موبايله/الآيباد، يختار الطاولة، يضيف الأصناف، يرسل الطلب.
- **الكاشير** يرى الطلب فوراً مع صوت تنبيه، يغيّر حالته (تحضير ← جاهز ← تم التقديم)، يدير الفاتورة، الخصم، الدفع.
- **المالك** يدير المنيو، الأسعار، الصور، الموظفين، الطاولات، ويرى التقارير وسجل العمليات.

### 1.2 داخل النسخة الأولى (MVP)
| المحور | المشمول |
|---|---|
| الدخول | اسم مستخدم + PIN للموظفين، بريد + كلمة مرور للمالك |
| المنيو | تصنيفات، أصناف، صور، سعر بالدينار، نفاد الصنف (يديره المالك) |
| الطاولات | إضافة/تعديل/تعطيل من المالك (لا عدد ثابت مبرمج) |
| الطلبات | إنشاء، إضافة أصناف، حذف/إلغاء حسب الصلاحية، ملاحظة لكل صنف، ترقيم يومي (#001) |
| الحالات | جديد ← قيد التحضير ← جاهز ← تم التقديم ← (الفاتورة) مدفوع |
| الفاتورة | تجمع كل طلبات الطاولة، خصم بسبب، دفع نقدي، إيصال قابل للطباعة ومشاركة نصية |
| الكاشير | إدارة الطلبات، إلغاء، خصم، شفت، إغلاق صندوق «أعمى» |
| المالك | لوحة معلومات، تقارير (مبيعات، لكل ويتر، أصناف، خصومات، إلغاءات، فروقات الصندوق)، سجل عمليات |
| التنبيهات | صوت عند الكاشير للطلب الجديد، إشعار مرئي للويتر عند «جاهز» |
| التطبيق | PWA قابل للتثبيت على الشاشة الرئيسية |

### 1.3 خارج النسخة الأولى (يُؤجَّل ويُصمَّم له مكان في قاعدة البيانات)
الطابعة الحرارية المباشرة، تقسيم الفاتورة (واجهة)، أحجام/إضافات المنيو، المخزون، Web Push، Offline، التوصيل، تعدد الفروع. التفاصيل في القسمين 20 و21.

---

## 2. القرارات المعتمدة

| # | القرار |
|---|---|
| 1 | ثلاثة أدوار فقط: **ويتر، كاشير، مالك**. الكاشير يقوم بدور «مدير الشفت» |
| 2 | الويتر يرى **كل** الطلبات (ليخدم أكثر من ويتر نفس الطاولة بلا مشاكل) |
| 3 | يُسمح بأكثر من طلب مفتوح على نفس الطاولة، و**الفاتورة تجمعها كلها** |
| 4 | الويتر: يضيف أصناف دائماً، يحذف صنفاً **فقط وهو «جديد»** وكان هو من أضافه، وغير ذلك يطلب من الكاشير |
| 5 | الكاشير: يلغي طلباً/صنفاً بعد الإرسال، يمنح خصماً (يظهر بوضوح للمالك)، يرى كل طلبات اليوم، **لا يرى التقارير** |
| 6 | الطلبات على الطاولات فقط. **لا يوجد سفري ولا توصيل** |
| 7 | الدفع **نقدي فقط** (لا دفع إلكتروني)، العملة **دينار عراقي فقط** (أعداد صحيحة بلا كسور) |
| 8 | المنيو والأسعار والصور والنفاد: **المالك فقط** |
| 9 | ترقيم الطلبات **تسلسلي يومي** (#001) ويبدأ من جديد كل يوم عمل |
| 10 | شفت + إغلاق صندوق + تقرير مبيعات لكل ويتر |
| 11 | إغلاق الصندوق **«أعمى»**: الكاشير يدخل المبلغ الفعلي، والفرق يراه المالك فقط |
| 12 | كل خصم يتطلب **سبباً** ويسجَّل باسم الكاشير ويظهر في تقرير خاص للمالك |
| 13 | لا حذف فعلي لأي بيانات مالية: «إلغاء» مع سبب + سجل عمليات (Audit Log) |
| 14 | الفاتورة قالب HTML قابل للطباعة (تُوصل الطابعة لاحقاً بلا تغيير في الهيكل) |
| 15 | كوفي واحد، إنترنت مستقر، بلا Offline |
| 16 | واجهة عربية RTL بلهجة عراقية |
| 17 | دخول سريع بـ PIN للموظفين |

---

## 3. الأدوار والصلاحيات

| الصلاحية | الويتر | الكاشير | المالك |
|---|:---:|:---:|:---:|
| رؤية كل الطلبات والطاولات | ✅ | ✅ | ✅ |
| إنشاء طلب لطاولة (Dine-in) | ✅ | ✅ | ✅ |
| إنشاء طلب على طاولة | ✅ | ✅ | ✅ |
| إضافة أصناف لطلب/طاولة | ✅ | ✅ | ✅ |
| حذف صنف | فقط ما أضافه وهو «جديد» | ✅ أي حالة (بسبب) | ✅ |
| إلغاء طلب كامل | ❌ (يرسل «طلب إلغاء») | ✅ (بسبب) | ✅ |
| تغيير حالة الطلب | ❌ | ✅ | ✅ |
| خصم على الفاتورة | ❌ | ✅ (بسبب) | ✅ |
| تسجيل الدفع وإصدار الفاتورة | ❌ | ✅ | ✅ |
| إلغاء فاتورة مدفوعة (Void) | ❌ | ❌ | ✅ |
| فتح/إغلاق الشفت | ❌ | ✅ | ✅ |
| رؤية الفرق في إغلاق الصندوق | ❌ | ❌ | ✅ |
| إدارة المنيو، الأسعار، الصور، النفاد | ❌ | ❌ | ✅ |
| إدارة الطاولات | ❌ | ❌ | ✅ |
| إدارة الموظفين (إنشاء، PIN، تعطيل) | ❌ | ❌ | ✅ |
| التقارير ولوحة المعلومات | ❌ | ❌ | ✅ |
| سجل العمليات (Audit Log) | ❌ | ❌ | ✅ |
| الإعدادات (اسم الكوفي، تذييل الفاتورة) | ❌ | ❌ | ✅ |

> **التنفيذ:** تُعرَّف الصلاحيات في ملف واحد `src/lib/auth/permissions.ts` كخريطة `Role → Permission[]` ودالة `can(role, permission)`. تُستخدم في الواجهة (لإخفاء الأزرار) وفي **كل** Server Action (للمنع الفعلي). الإخفاء في الواجهة للراحة فقط، الأمان في الخادم.

---

## 4. المفاهيم الأساسية وقواعد العمل

### 4.1 الكيانات
- **Table (طاولة):** مكان جلوس. يُنشئها المالك.
- **Bill (فاتورة):** وعاء مالي. للطاولة الواحدة **فاتورة مفتوحة واحدة فقط** في أي وقت. تجمع كل الطلبات. الخصم والدفع يقعان عليها.
- **Order (طلب):** دفعة واحدة يرسلها ويتر/كاشير، لها رقم يومي وحالة. تتبع فاتورة.
- **OrderItem (صنف في الطلب):** نسخة «لقطة» (Snapshot) من الاسم والسعر وقت الطلب، حتى لا يتغير التاريخ إذا غيّر المالك السعر لاحقاً.
- **Payment (دفعة):** مبلغ نقدي مرتبط بفاتورة وشفت. (جدول مستقل ليسمح لاحقاً بالتقسيم بدون تغيير الهيكل)
- **Shift (شفت):** فترة عمل للصندوق يفتحها الكاشير ويغلقها.

### 4.2 حالات الطلب
```
NEW (جديد) → PREPARING (قيد التحضير) → READY (جاهز) → SERVED (تم التقديم)
        └──────────────→ CANCELLED (ملغي) ←─────────────┘
```
- «مدفوع» **حالة الفاتورة** وليس الطلب: `Bill.status = PAID`.
- الكاشير/المالك يمكنهما **الرجوع خطوة** (مثلاً «جاهز» ← «قيد التحضير») عند الخطأ، ويُسجَّل في Audit Log.

### 4.3 حالات الفاتورة
`OPEN` (مفتوحة) ← `PAID` (مدفوعة) أو `VOID` (ملغاة، المالك فقط، بسبب).
بعد `PAID` تُقفل الفاتورة: لا إضافة أصناف ولا خصم. أي طلب جديد لنفس الطاولة يفتح **فاتورة جديدة**.

### 4.4 قاعدة «إضافة أصناف»
- إن كان الطلب **NEW**: تُضاف الأصناف إلى نفس الطلب.
- إن كان **PREPARING أو بعده**: تُنشأ **طلباً جديداً** تلقائياً على نفس الفاتورة (برقم يومي جديد ويظهر للكاشير بشارة «إضافة لطاولة X»).
- السبب: كي لا يتغير طلب بدأ تحضيره دون أن ينتبه أحد.
- من وجهة نظر الويتر: زر واحد «إضافة» على الطاولة، والنظام يقرر.

### 4.5 قاعدة الحذف والإلغاء
| من | ماذا | الشرط |
|---|---|---|
| ويتر | حذف صنف | أضافه هو + حالة الطلب NEW + الفاتورة OPEN |
| ويتر | «طلب إلغاء» | يضع علامة `cancelRequestedAt` وتظهر للكاشير بشارة حمراء |
| كاشير | حذف صنف / إلغاء طلب | الفاتورة OPEN + سبب إجباري |
| مالك | أي شيء | سبب إجباري. الفاتورة المدفوعة: Void |
- إن أُلغيت كل أصناف طلب يتحول الطلب تلقائياً إلى `CANCELLED`.
- **لا حذف فعلي أبداً**: `status = CANCELLED` + `cancelledById` + `cancelReason` + `cancelledAt`.

### 4.6 الأسعار والخصم والمجموع
- كل المبالغ **أعداد صحيحة بالدينار** (`Int`). لا Float أبداً.
- `subtotal` = مجموع (سعر × كمية) للأصناف `ACTIVE` فقط في كل طلبات الفاتورة غير الملغاة.
- الخصم على مستوى **الفاتورة**: إما مبلغ ثابت `AMOUNT` أو نسبة `PERCENT`. يُحسب `discountAmount` ويُخزَّن. يُقيَّد بحيث لا يتجاوز `subtotal`.
- `total = subtotal - discountAmount`.
- نسبة الخصم تُقرَّب لأقرب **250 ديناراً** (الإعداد `ROUNDING_STEP = 250`، قابل للتغيير). *(قرار مؤقت، انظر القسم 20)*
- تُعاد حسابات الفاتورة داخل **Transaction** عند أي تغيير. بعد الدفع تُجمَّد.

### 4.7 يوم العمل والترقيم
- يوم العمل يبدأ **05:00 صباحاً بتوقيت بغداد** (`BUSINESS_DAY_START_HOUR = 5`) لأن الكوفيهات تعمل بعد منتصف الليل وقد لا نريد تقسيم الليلة على يومين. *(قابل للتغيير، القسم 20)*
- الرقم اليومي `dailyNumber` يزداد ذرّياً لكل `businessDate`، ويُعرض `#001`.
- التوقيت: `Asia/Baghdad` (UTC+3 ثابت، بلا توقيت صيفي).

### 4.8 قاعدة الشفت
- لا يمكن إنشاء طلبات ولا دفعات **بدون شفت مفتوح**. الكاشير يفتحه بإدخال مبلغ بداية الصندوق.
- تظهر للويتر رسالة واضحة إن كانت مغلقة: «الشفت مغلق، كلّم الكاشير».
- شفت واحد مفتوح فقط في أي وقت (قيد في قاعدة البيانات).

---

## 5. المعمارية

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  موبايل ويتر │   │ جهاز الكاشير │   │ جهاز المالك  │
│   (PWA)      │   │   (PWA)      │   │   (متصفح)    │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │  HTTPS            │                  │
       ▼                   ▼                  ▼
┌────────────────────────────────────────────────────┐
│      Next.js على Vercel (App Router)               │
│  proxy (حماية المسارات) · Server Components        │
│  Server Actions (كل الكتابة + التحقق + الصلاحيات)  │
└──────────┬──────────────────────────┬──────────────┘
           │ Prisma (اتصال مباشر)     │ supabase-js (Auth/Storage)
           ▼                          ▼
┌────────────────────────────────────────────────────┐
│                    Supabase                        │
│  Postgres · Auth · Storage (صور المنيو) · Realtime │
└──────────────────────┬─────────────────────────────┘
                       │ Realtime (Postgres Changes + RLS)
                       ▼
            المتصفحات تستقبل «تغيّر شيء» فتعيد جلب البيانات
```

### 5.1 المبادئ
1. **كل الكتابة عبر Server Actions + Prisma فقط.** المتصفح لا يكتب مباشرة إلى قاعدة البيانات أبداً.
2. **Supabase Realtime للقراءة اللحظية فقط:** المتصفح يشترك في تغييرات جداول محددة، وعند وصول حدث يعيد جلب البيانات من الخادم (`router.refresh()` أو إعادة جلب). لا نثق بمحتوى الحدث لعرض بيانات حساسة.
3. **RLS مفعّل على كل الجداول** كطبقة أمان ثانية: يسمح بـ SELECT فقط للموظفين المصادَق عليهم، ولا يوجد أي سياسة INSERT/UPDATE/DELETE للمتصفح.
4. **مصدر الحقيقة للصلاحيات = جدول `profiles` في قاعدة البيانات** (الدور + `isActive`) ويُفحص في كل Server Action. الدور داخل JWT (`app_metadata`) يُستخدم فقط للتوجيه وسياسات RLS.
5. **Prisma يتصل بالمستخدم `postgres`** فيتجاوز RLS (متوقع ومقصود، لأن الخادم هو الحارس).

### 5.2 المكتبات

| الغرض | المكتبة |
|---|---|
| الإطار | `next` (latest), `react`, `typescript` |
| قاعدة البيانات | `prisma`, `@prisma/client` |
| Supabase | `@supabase/supabase-js`, `@supabase/ssr` |
| الواجهة | `tailwindcss`, `shadcn/ui` (+ Radix, `vaul` للـ Drawer, `sonner` للتنبيهات, `input-otp`) |
| النماذج والتحقق | `react-hook-form`, `zod`, `@hookform/resolvers` |
| الرسوم البيانية | `recharts` (عبر shadcn charts) |
| ضغط الصور | `browser-image-compression` |
| التواريخ | `date-fns`, `date-fns-tz` (أو `Intl` المدمج) |
| الاختبار | `vitest`, `@playwright/test` |
| الأيقونات | `lucide-react` |

> ملاحظة إصدارات: Next.js (من الإصدار 16) سمّى ملف `middleware.ts` إلى **`proxy.ts`**. وPrisma (من الإصدار 7) نقل إعداد الرابط إلى `prisma.config.ts` وغيّر المولّد إلى `prisma-client`. **اتبع دائماً التوثيق الرسمي للنسخة المثبتة عندك**؛ منطق المشروع وجدول البيانات أدناه لا يتأثر.

---

## 6. قاعدة البيانات (Prisma Schema)

> الأعمدة بصيغة camelCase (الافتراضي في Prisma) والجداول بأسماء snake_case عبر `@@map`. في SQL الخام تُكتب أسماء الأعمدة بين علامتي اقتباس: `"businessDate"`.

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js" // Prisma 7+: راجع التوثيق (prisma-client + output)
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // رابط الـ Pooler (للتطبيق)
  directUrl = env("DIRECT_URL")     // رابط مباشر (للـ migrations)
}

// ───────── Enums ─────────
enum Role          { OWNER CASHIER WAITER }
enum OrderType     { DINE_IN TAKEAWAY }
enum OrderStatus   { NEW PREPARING READY SERVED CANCELLED }
enum ItemStatus    { ACTIVE CANCELLED }
enum BillStatus    { OPEN PAID VOID }
enum DiscountType  { AMOUNT PERCENT }
enum PaymentMethod { CASH }

// ───────── المستخدمون ─────────
// id = نفس id مستخدم Supabase Auth (بدون FK عبر السكيمات)
model Profile {
  id        String   @id @db.Uuid
  username  String   @unique            // أحرف إنجليزية صغيرة، لا يتغير بعد الإنشاء
  fullName  String                      // الاسم الظاهر (عربي)
  role      Role
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  ordersCreated   Order[]     @relation("OrderCreatedBy")
  itemsAdded      OrderItem[] @relation("ItemAddedBy")
  shiftsOpened    Shift[]     @relation("ShiftOpenedBy")
  paymentsTaken   Payment[]
  auditLogs       AuditLog[]

  @@map("profiles")
}

// ───────── المنيو ─────────
model Category {
  id        String     @id @default(uuid()) @db.Uuid
  name      String
  sortOrder Int        @default(0)
  isActive  Boolean    @default(true)
  items     MenuItem[]
  @@map("categories")
}

model MenuItem {
  id          String   @id @default(uuid()) @db.Uuid
  categoryId  String   @db.Uuid
  category    Category @relation(fields: [categoryId], references: [id])
  name        String
  description String?
  price       Int                       // دينار عراقي
  imagePath   String?                   // مسار الملف داخل Supabase Storage
  isAvailable Boolean  @default(true)   // نفاد الصنف (false = خلصت)
  isActive    Boolean  @default(true)   // false = مخفي من المنيو (بدل الحذف)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  orderItems  OrderItem[]

  @@index([categoryId, sortOrder])
  @@map("menu_items")
}

// ───────── الطاولات ─────────
model CafeTable {
  id        String  @id @default(uuid()) @db.Uuid
  label     String  @unique             // "1" , "2" , "VIP" ...
  sortOrder Int     @default(0)
  isActive  Boolean @default(true)
  bills     Bill[]
  orders    Order[]
  @@map("tables")
}

// ───────── الشفت ─────────
model Shift {
  id           String    @id @default(uuid()) @db.Uuid
  openedById   String    @db.Uuid
  openedBy     Profile   @relation("ShiftOpenedBy", fields: [openedById], references: [id])
  openedAt     DateTime  @default(now())
  openingCash  Int                          // مبلغ بداية الصندوق
  closedAt     DateTime?
  closedById   String?   @db.Uuid
  countedCash  Int?                         // ما أدخله الكاشير عند الإغلاق
  expectedCash Int?                         // يحسبه النظام (للمالك فقط)
  difference   Int?                         // counted - expected (للمالك فقط)
  note         String?

  bills    Bill[]
  orders   Order[]
  payments Payment[]
  @@map("shifts")
}

// ───────── الفاتورة ─────────
model Bill {
  id             String        @id @default(uuid()) @db.Uuid
  type           OrderType
  tableId        String?       @db.Uuid
  table          CafeTable?    @relation(fields: [tableId], references: [id])
  status         BillStatus    @default(OPEN)
  businessDate   DateTime      @db.Date           // يوم العمل عند فتحها
  shiftId        String?       @db.Uuid
  shift          Shift?        @relation(fields: [shiftId], references: [id])

  subtotal       Int           @default(0)
  discountType   DiscountType?
  discountValue  Int           @default(0)        // المبلغ أو النسبة كما أُدخلت
  discountAmount Int           @default(0)        // المبلغ المحسوب فعلياً
  discountReason String?
  discountById   String?       @db.Uuid
  total          Int           @default(0)

  openedAt       DateTime      @default(now())
  paidAt         DateTime?
  paidById       String?       @db.Uuid
  voidedAt       DateTime?
  voidedById     String?       @db.Uuid
  voidReason     String?

  orders         Order[]
  payments       Payment[]

  @@index([status, tableId])
  @@index([businessDate, status])
  @@map("bills")
}

// ───────── الطلب ─────────
model Order {
  id            String      @id @default(uuid()) @db.Uuid
  businessDate  DateTime    @db.Date
  dailyNumber   Int                              // #001 يومياً
  billId        String      @db.Uuid
  bill          Bill        @relation(fields: [billId], references: [id])
  tableId       String?     @db.Uuid
  table         CafeTable?  @relation(fields: [tableId], references: [id])
  type          OrderType
  status        OrderStatus @default(NEW)
  note          String?
  isFollowUp    Boolean     @default(false)      // إضافة على طاولة فيها طلب سابق
  shiftId       String?     @db.Uuid
  shift         Shift?      @relation(fields: [shiftId], references: [id])

  createdById   String      @db.Uuid
  createdBy     Profile     @relation("OrderCreatedBy", fields: [createdById], references: [id])
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  preparingAt   DateTime?
  readyAt       DateTime?
  servedAt      DateTime?

  cancelRequestedAt   DateTime?
  cancelRequestedById String?   @db.Uuid
  cancelledAt         DateTime?
  cancelledById       String?   @db.Uuid
  cancelReason        String?

  items         OrderItem[]

  @@unique([businessDate, dailyNumber])
  @@index([status, createdAt])
  @@index([billId])
  @@map("orders")
}

model OrderItem {
  id             String     @id @default(uuid()) @db.Uuid
  orderId        String     @db.Uuid
  order          Order      @relation(fields: [orderId], references: [id], onDelete: Cascade)
  menuItemId     String     @db.Uuid
  menuItem       MenuItem   @relation(fields: [menuItemId], references: [id])
  nameSnapshot   String                         // اسم الصنف وقت الطلب
  priceSnapshot  Int                            // سعره وقت الطلب
  quantity       Int
  note           String?                        // "بدون سكر" ...
  status         ItemStatus @default(ACTIVE)
  addedById      String     @db.Uuid
  addedBy        Profile    @relation("ItemAddedBy", fields: [addedById], references: [id])
  createdAt      DateTime   @default(now())
  cancelledAt    DateTime?
  cancelledById  String?    @db.Uuid
  cancelReason   String?

  @@index([orderId])
  @@map("order_items")
}

// ───────── الدفع ─────────
model Payment {
  id             String        @id @default(uuid()) @db.Uuid
  billId         String        @db.Uuid
  bill           Bill          @relation(fields: [billId], references: [id])
  shiftId        String        @db.Uuid
  shift          Shift         @relation(fields: [shiftId], references: [id])
  method         PaymentMethod @default(CASH)
  amount         Int                              // المبلغ المحتسب للفاتورة
  receivedAmount Int?                             // ما استلمه الكاشير (للباقي)
  createdById    String        @db.Uuid
  createdBy      Profile       @relation(fields: [createdById], references: [id])
  createdAt      DateTime      @default(now())
  @@map("payments")
}

// ───────── مساعدة ─────────
model DailyCounter {
  businessDate DateTime @id @db.Date
  lastNumber   Int      @default(0)
  @@map("daily_counters")
}

model AuditLog {
  id         String   @id @default(uuid()) @db.Uuid
  actorId    String   @db.Uuid
  actor      Profile  @relation(fields: [actorId], references: [id])
  action     String                       // مثل ORDER_ITEM_CANCELLED
  entityType String                       // Order | OrderItem | Bill | Shift | MenuItem | Profile ...
  entityId   String
  reason     String?
  before     Json?
  after      Json?
  createdAt  DateTime @default(now())
  @@index([entityType, entityId])
  @@index([createdAt])
  @@map("audit_logs")
}

model LoginAttempt {
  id        String   @id @default(uuid()) @db.Uuid
  username  String
  ip        String?
  success   Boolean
  createdAt DateTime @default(now())
  @@index([username, createdAt])
  @@map("login_attempts")
}

// صف واحد فقط (id = 1)
model CafeSettings {
  id                   Int     @id @default(1)
  cafeName             String  @default("الكوفي")
  phone                String?
  address              String?
  receiptFooter        String? @default("شكراً لزيارتكم")
  businessDayStartHour Int     @default(5)
  @@map("cafe_settings")
}
```

### 6.1 قيود إضافية بـ SQL خام (تُضاف في migration يدوي)

Prisma لا يدعم الفهارس الجزئية، فتُنشأ بـ `prisma migrate dev --create-only` ثم تُعدَّل ملف الـ migration:

```sql
-- فاتورة مفتوحة واحدة فقط لكل طاولة
CREATE UNIQUE INDEX one_open_bill_per_table
  ON bills ("tableId") WHERE status = 'OPEN' AND "tableId" IS NOT NULL;

-- شفت واحد مفتوح فقط
CREATE UNIQUE INDEX one_open_shift
  ON shifts ((true)) WHERE "closedAt" IS NULL;

-- قيود منطقية
ALTER TABLE order_items ADD CONSTRAINT qty_positive CHECK (quantity > 0 AND quantity <= 99);
ALTER TABLE menu_items  ADD CONSTRAINT price_non_negative CHECK (price >= 0);
ALTER TABLE bills       ADD CONSTRAINT discount_valid CHECK ("discountAmount" >= 0 AND "discountAmount" <= subtotal);
```

### 6.2 توليد الرقم اليومي (ذرّي، بدون تكرار)

```ts
// src/lib/orders/daily-number.ts
import type { Prisma } from "@prisma/client";

export async function nextDailyNumber(tx: Prisma.TransactionClient, businessDate: string) {
  const rows = await tx.$queryRaw<{ lastNumber: number }[]>`
    INSERT INTO daily_counters ("businessDate", "lastNumber")
    VALUES (${businessDate}::date, 1)
    ON CONFLICT ("businessDate")
    DO UPDATE SET "lastNumber" = daily_counters."lastNumber" + 1
    RETURNING "lastNumber"`;
  return rows[0].lastNumber;
}
```

### 6.3 حساب يوم العمل

```ts
// src/lib/time.ts
export const TZ = "Asia/Baghdad";

/** يرجع 'YYYY-MM-DD' ليوم العمل (يبدأ عند startHour صباحاً بتوقيت بغداد) */
export function getBusinessDate(now = new Date(), startHour = 5): string {
  const shifted = new Date(now.getTime() - startHour * 3600_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(shifted);
}
```

### 6.4 حساب المجاميع (دالة نقية قابلة للاختبار)

```ts
// src/lib/billing/calc.ts
export const ROUNDING_STEP = 250;

export function calcDiscount(
  subtotal: number,
  type: "AMOUNT" | "PERCENT" | null,
  value: number
): number {
  if (!type || value <= 0) return 0;
  const raw = type === "PERCENT" ? (subtotal * Math.min(value, 100)) / 100 : value;
  const rounded = type === "PERCENT" ? Math.round(raw / ROUNDING_STEP) * ROUNDING_STEP : Math.round(raw);
  return Math.max(0, Math.min(rounded, subtotal));
}

export function calcTotals(items: { priceSnapshot: number; quantity: number }[],
  discountType: "AMOUNT" | "PERCENT" | null, discountValue: number) {
  const subtotal = items.reduce((s, i) => s + i.priceSnapshot * i.quantity, 0);
  const discountAmount = calcDiscount(subtotal, discountType, discountValue);
  return { subtotal, discountAmount, total: subtotal - discountAmount };
}
```

### 6.5 صور المنيو (Supabase Storage)
- Bucket اسمه `menu-images` (**Public read**). الرفع يتم **من الخادم فقط** (Service Role) عبر Server Action للمالك.
- ضغط الصورة في المتصفح قبل الرفع: أقصى عرض 800px، صيغة WebP، أقل من 200KB.
- يُخزَّن `imagePath` فقط، ويُبنى الرابط العام عند العرض.
- في `next.config.ts` تُضاف `images.remotePatterns` لنطاق Supabase، وتُستخدم `next/image`.

---

## 7. الأمان: المصادقة، RLS، التحقق

### 7.1 تسجيل دخول الموظفين بـ PIN (مع Supabase Auth الحقيقي)

المشكلة: Supabase Auth يعمل ببريد + كلمة مرور، والـ PIN قصير وضعيف كـ«كلمة مرور». الحل:

1. لكل موظف مستخدم في Supabase Auth ببريد داخلي: `{username}@staff.cafe.local`.
2. كلمة مرور Supabase **لا تُخزَّن كـ PIN**، بل تُشتق على الخادم:
   `password = HMAC_SHA256(PIN_PEPPER, "{username}:{pin}")` (hex، 64 حرفاً).
3. شاشة الدخول: حقل اسم المستخدم + حقل PIN (6 أرقام، `input-otp`). يُرسلان إلى Server Action.
4. الـ Server Action تشتق كلمة المرور وتستدعي `signInWithPassword` فيُنشأ جلسة حقيقية (JWT) تعمل مع RLS وRealtime.
5. المتصفح لا يعرف الـ pepper، ولا يرى الكلمة المشتقة.

```ts
// src/lib/auth/pin.ts  (خادم فقط)
import { createHmac } from "crypto";
export function derivePassword(username: string, pin: string) {
  return createHmac("sha256", process.env.PIN_PEPPER!).update(`${username}:${pin}`).digest("hex");
}
export const staffEmail = (username: string) => `${username}@staff.cafe.local`;
```

**الحماية من التخمين (Rate Limiting):**
- جدول `login_attempts`. قبل كل محاولة: إن وُجدت **5 محاولات فاشلة** لنفس `username` خلال آخر 10 دقائق → رفض مع رسالة «جرّب بعد شوية» (قفل 10 دقائق).
- تُسجَّل كل محاولة (نجاح/فشل + IP).
- بعد النجاح يُعاد احتساب العدّاد منطقياً (تُتجاهل المحاولات الفاشلة قبل آخر نجاح).
- الرسائل موحّدة: «اسم المستخدم أو الـ PIN غلط» (لا نكشف أيهما الخطأ).

**المالك:** بريد حقيقي + كلمة مرور قوية عبر تبويب «دخول المالك» (إنشاء الحساب يدوياً من لوحة Supabase، ثم إدخال `Profile` بدوره OWNER عبر سكربت الـ seed، وضبط `app_metadata.role = "OWNER"`).

**الجلسة:** تبقى مفتوحة إلى أن يضغط المستخدم «خروج» (الجلسة تتجدد تلقائياً بـ refresh token). التعطيل يمنع فوراً لأن كل Server Action تفحص `isActive`.

### 7.2 إنشاء وإدارة الموظفين (من لوحة المالك)

```ts
// Server Action: createStaff({ username, fullName, role, pin })
// 1) تحقق: المالك فقط، username ^[a-z0-9_]{3,20}$ فريد، PIN = 6 أرقام، role ∈ WAITER|CASHIER
// 2) admin = createClient(url, SERVICE_ROLE_KEY)
const { data, error } = await admin.auth.admin.createUser({
  email: staffEmail(username),
  password: derivePassword(username, pin),
  email_confirm: true,
  app_metadata: { role },
});
// 3) prisma.profile.create({ data: { id: data.user.id, username, fullName, role } })
// 4) AuditLog: STAFF_CREATED
```
- **تغيير PIN:** `admin.auth.admin.updateUserById(id, { password: derivePassword(username, newPin) })`.
- **تعطيل:** `profile.isActive = false` + `updateUserById(id, { ban_duration: "876000h" })`. **إعادة التفعيل:** `ban_duration: "none"`.
- **اسم المستخدم لا يتغير** بعد الإنشاء (لأنه جزء من اشتقاق كلمة المرور). لتغييره: عطّل الحساب وأنشئ جديداً.
- **تغيير الدور:** تحديث `profile.role` + `app_metadata.role`.
- لا يمكن للمالك تعطيل نفسه.

### 7.3 حماية المسارات (proxy)

```ts
// src/proxy.ts   (middleware.ts في Next ≤ 15)
// 1) تحديث جلسة Supabase (@supabase/ssr) وقراءة claims
// 2) بدون جلسة → /login
// 3) توجيه حسب الدور:
//    /waiter/*   → WAITER, OWNER
//    /cashier/*  → CASHIER, OWNER
//    /owner/*    → OWNER
//    الصفحة الرئيسية "/" → تحوّل لشاشة الدور
// 4) أي مسار غير مسموح → إعادة توجيه لشاشة دوره
```
الـ proxy **للراحة وتحسين التجربة**. الحماية الحقيقية داخل كل `layout.tsx` (فحص الدور من DB) وكل Server Action.

### 7.4 حارس الـ Server Actions (نمط موحّد)

```ts
// src/lib/auth/guard.ts
export async function requireUser(allowed: Role[]) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();   // تحقق فعلي من الخادم
  if (!user) throw new AppError("UNAUTHENTICATED", "سجّل دخول أول");
  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!profile?.isActive) throw new AppError("INACTIVE", "حسابك موقوف");
  if (!allowed.includes(profile.role)) throw new AppError("FORBIDDEN", "ما عندك صلاحية");
  return profile;
}
```
كل Action تبدأ بـ `const me = await requireUser([...])` ثم `zod.parse(input)`. الأخطاء تُرجَع كـ `{ ok: false, error: "رسالة عربية" }` بدل رمي استثناءات للواجهة.

### 7.5 سياسات RLS (SQL، تُنفَّذ في migration)

```sql
-- دالة مساعدة لقراءة الدور من JWT
CREATE OR REPLACE FUNCTION public.jwt_role() RETURNS text
LANGUAGE sql STABLE AS $$ SELECT auth.jwt() -> 'app_metadata' ->> 'role' $$;

-- تفعيل RLS على كل الجداول
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills          ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafe_settings  ENABLE ROW LEVEL SECURITY;

-- كل الموظفين يقرؤون: المنيو، الطاولات، الفواتير، الطلبات، أصناف الطلبات
CREATE POLICY staff_read ON categories  FOR SELECT TO authenticated USING (jwt_role() IN ('OWNER','CASHIER','WAITER'));
CREATE POLICY staff_read ON menu_items  FOR SELECT TO authenticated USING (jwt_role() IN ('OWNER','CASHIER','WAITER'));
CREATE POLICY staff_read ON tables      FOR SELECT TO authenticated USING (jwt_role() IN ('OWNER','CASHIER','WAITER'));
CREATE POLICY staff_read ON bills       FOR SELECT TO authenticated USING (jwt_role() IN ('OWNER','CASHIER','WAITER'));
CREATE POLICY staff_read ON orders      FOR SELECT TO authenticated USING (jwt_role() IN ('OWNER','CASHIER','WAITER'));
CREATE POLICY staff_read ON order_items FOR SELECT TO authenticated USING (jwt_role() IN ('OWNER','CASHIER','WAITER'));

-- المالك فقط: الدفعات، الشفتات، السجل، الإعدادات، الحسابات
CREATE POLICY owner_read ON payments       FOR SELECT TO authenticated USING (jwt_role() = 'OWNER');
CREATE POLICY owner_read ON shifts         FOR SELECT TO authenticated USING (jwt_role() = 'OWNER');
CREATE POLICY owner_read ON audit_logs     FOR SELECT TO authenticated USING (jwt_role() = 'OWNER');
CREATE POLICY owner_read ON profiles       FOR SELECT TO authenticated USING (jwt_role() = 'OWNER' OR id = auth.uid());
CREATE POLICY staff_read ON cafe_settings  FOR SELECT TO authenticated USING (jwt_role() IN ('OWNER','CASHIER','WAITER'));

-- لا سياسات INSERT/UPDATE/DELETE → المتصفح لا يكتب أبداً.
-- لا سياسة للدور anon → الزوار بدون تسجيل لا يرون شيئاً.

-- تفعيل Realtime للجداول المطلوبة
ALTER PUBLICATION supabase_realtime ADD TABLE orders, order_items, bills, menu_items;
```
> لا تعطِ الـ **Service Role Key** أبداً لأي كود يعمل في المتصفح. يُستخدم فقط في ملفات `server-only`.

### 7.6 التحقق من المدخلات (zod)
- كل Server Action لها schema بـ zod. حدود: الكمية 1–99، الملاحظة ≤ 140 حرفاً، السبب ≥ 3 أحرف و≤ 200، المبالغ أعداد صحيحة غير سالبة.
- **لا نثق بالأسعار من المتصفح**: المتصفح يرسل `menuItemId + quantity` فقط، والخادم يقرأ السعر من DB ويخزنه كـ Snapshot.
- رفض أصناف `isAvailable = false` أو `isActive = false` برسالة تسمّي الصنف.

### 7.7 متغيرات البيئة

```bash
# .env.local  (لا يُرفع إلى Git)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=        # أو Publishable key حسب لوحة Supabase
SUPABASE_SERVICE_ROLE_KEY=            # أو Secret key — خادم فقط
DATABASE_URL=                         # Pooler (Transaction mode) + ?pgbouncer=true
DIRECT_URL=                           # اتصال مباشر للـ migrations
PIN_PEPPER=                           # نص عشوائي طويل (32+ بايت). تغييره = كل الـ PINs تنكسر!
```
- `PIN_PEPPER` يُولَّد مرة واحدة ويُحفظ في مكان آمن (مدير كلمات مرور) **وليس فقط في Vercel**.

---

## 8. هيكل المشروع

```
coffee-app/
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/                  # فيها SQL الخاص بـ RLS والفهارس الجزئية
│  └─ seed.ts
├─ public/
│  ├─ icons/                       # أيقونات PWA (192, 512, maskable)
│  └─ sounds/new-order.mp3         # صوت تنبيه قصير
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx                # html lang="ar" dir="rtl" + الخط + Providers
│  │  ├─ manifest.ts               # PWA manifest
│  │  ├─ page.tsx                  # يوجّه حسب الدور
│  │  ├─ (auth)/login/page.tsx
│  │  ├─ (waiter)/waiter/
│  │  │  ├─ layout.tsx             # فحص الدور + شريط سفلي
│  │  │  ├─ page.tsx               # شبكة الطاولات
│  │  │  ├─ table/[id]/page.tsx    # تفاصيل الطاولة وطلباتها
│  │  │  ├─ new/page.tsx           # طلب جديد (?table=ID)
│  │  │  └─ orders/page.tsx        # كل الطلبات (فلترة)
│  │  ├─ (cashier)/cashier/
│  │  │  ├─ layout.tsx
│  │  │  ├─ page.tsx               # لوحة الطلبات الحية
│  │  │  ├─ bills/page.tsx         # الفواتير المفتوحة حسب الطاولة
│  │  │  ├─ bills/[id]/page.tsx    # فاتورة: خصم، دفع
│  │  │  ├─ bills/[id]/receipt/page.tsx   # قالب الطباعة
│  │  │  ├─ (لا صفحة سفري — أُلغيت)
│  │  │  ├─ history/page.tsx       # طلبات اليوم
│  │  │  └─ shift/page.tsx         # فتح/إغلاق الشفت
│  │  ├─ (owner)/owner/
│  │  │  ├─ layout.tsx             # Sidebar
│  │  │  ├─ page.tsx               # لوحة المعلومات
│  │  │  ├─ menu/…                 # تصنيفات + أصناف
│  │  │  ├─ tables/page.tsx
│  │  │  ├─ staff/page.tsx
│  │  │  ├─ reports/…              # sales, waiters, items, discounts, cancellations, shifts
│  │  │  ├─ audit/page.tsx
│  │  │  └─ settings/page.tsx
│  │  └─ api/                      # (اختياري) health check فقط
│  ├─ components/
│  │  ├─ ui/                       # shadcn
│  │  ├─ waiter/ cashier/ owner/ shared/
│  ├─ lib/
│  │  ├─ prisma.ts                 # singleton
│  │  ├─ supabase/{server,client,admin}.ts
│  │  ├─ auth/{guard,permissions,pin}.ts
│  │  ├─ billing/calc.ts
│  │  ├─ orders/{daily-number,transitions}.ts
│  │  ├─ time.ts  money.ts  errors.ts
│  │  └─ i18n/ar-iq.ts             # كل النصوص العربية
│  ├─ actions/                     # Server Actions مجمّعة حسب المجال
│  │  ├─ auth.ts orders.ts bills.ts shifts.ts menu.ts staff.ts tables.ts reports.ts settings.ts
│  ├─ hooks/
│  │  ├─ use-realtime-refresh.ts   use-sound.ts   use-wake-lock.ts
│  └─ proxy.ts
├─ tests/ (vitest + playwright)
├─ .cursor/rules/project.mdc       # قواعد المشروع لـ Cursor (القسم 22)
└─ next.config.ts
```

---

## 9. الشاشات والتدفقات

> **مبدأ عام:** موبايل أولاً. أزرار لا تقل عن 44×44px. نصوص ≥ 16px (لتجنب تكبير iOS التلقائي). ألوان الحالات ثابتة في كل الشاشات.

### 9.1 ألوان الحالات (ثابتة)
| الحالة | اللون | النص |
|---|---|---|
| NEW | أزرق | جديد |
| PREPARING | برتقالي | يتحضّر |
| READY | أخضر | جاهز |
| SERVED | رمادي | انقدّم |
| CANCELLED | أحمر | ملغي |
| فاتورة PAID | أخضر غامق | مدفوع |

### 9.2 شاشات الويتر

**أ) الدخول `/login`**
- حقل اسم المستخدم (يتذكر آخر اسم في `localStorage`)، حقل PIN (6 خانات، لوحة أرقام).
- رابط صغير «دخول المالك» يبدّل إلى بريد + كلمة مرور.

**ب) الطاولات `/waiter`** (الصفحة الرئيسية)
- شبكة بطاقات طاولات كبيرة. لون/شارة لكل طاولة:
  - فاضية (رمادي) · عليها طلبات (أزرق) · **فيها طلب جاهز** (أخضر نابض) · فيها طلب إلغاء معلّق (أحمر).
- نقرة على طاولة → إن كانت فاضية يفتح **طلب جديد** مباشرة (`/waiter/new?table=ID`)، وإن كانت مشغولة يفتح **تفاصيل الطاولة**.
- شريط سفلي: الطاولات · كل الطلبات · خروج.
- لافتة علوية «الشفت مغلق» إن لا توجد شفت.

**ج) طلب جديد `/waiter/new`**
- أعلى: رقم الطاولة (قابل للتغيير بنقرة).
- تبويبات التصنيفات أفقية (sticky). شبكة أصناف: صورة، اسم، سعر. الصنف **النافد** رمادي وعليه شارة «خلصت» وغير قابل للنقر.
- نقرة على صنف = +1 مباشرة (شارة عدد على البطاقة)، ونقرة على `−` لتقليل.
- شريط سفلي ثابت: «السلة (N) · المجموع» → يفتح **Drawer** من الأسفل فيه:
  - قائمة الأصناف مع `+/−` وحقل ملاحظة لكل صنف (اختصارات: «بدون سكر»، «سكر زيادة»، «سخن»، «بارد»).
  - ملاحظة عامة للطلب (اختيارية).
  - زر كبير **«ارسل الطلب»**.
- بعد الإرسال: رسالة نجاح + العودة لشاشة الطاولات (بلا شاشات وسيطة).
- **الهدف:** اختيار الطاولة (نقرة) ← أصناف ← إرسال (نقرة).

**د) تفاصيل الطاولة `/waiter/table/[id]`**
- لكل طلب على الطاولة: رقم (#012)، حالة، الأصناف، من أضافها، الوقت.
- أزرار: **«إضافة أصناف»** (يفتح شاشة الطلب بنفس الطاولة، والنظام يقرر: تعديل NEW أو طلب جديد)، **حذف صنف** (يظهر فقط لأصناف أضافها هذا الويتر في طلب NEW)، **«طلب إلغاء»** (ينتقل للكاشير).
- المجموع الحالي للفاتورة المفتوحة (للعلم فقط).

**هـ) كل الطلبات `/waiter/orders`**
- قائمة طلبات اليوم لكل الويترز، فلاتر: الكل / طلباتي / جاهز. شارة «طلباتي» على ما أنشأته.

**و) الإشعار:** عندما يصبح طلب أنشأه هذا الويتر `READY`: **Toast كبير** أعلى الشاشة + صوت قصير (بعد تفعيل الصوت) + شارة خضراء على الطاولة. يبقى حتى يلمسه.

### 9.3 شاشات الكاشير

**أ) لوحة الطلبات `/cashier`** (الأهم)
- أعمدة (Kanban) على الآيباد/الكمبيوتر، وتبويبات على الموبايل: **جديد · يتحضّر · جاهز · انقدّم (آخر ساعتين)**.
- بطاقة الطلب: `#012`، الطاولة، اسم الويتر، الوقت منذ الإرسال (يتحول للأحمر بعد 10 دقائق في «جديد»)، الأصناف مع الكميات والملاحظات بخط واضح، شارة «إضافة» للطلبات التابعة، شارة حمراء «طلب إلغاء».
- زر كبير واحد على البطاقة ينقل للخطوة التالية: **«ابدأ التحضير» ← «جاهز» ← «تم التقديم»**. قائمة `⋯` فيها: رجوع خطوة، حذف صنف (بسبب)، إلغاء الطلب (بسبب)، فتح الفاتورة.
- **صوت عند طلب جديد** + وميض للعمود. زر «🔔 فعّل الصوت» في الأعلى (مطلوب مرة بعد فتح الصفحة).
- Wake Lock: الشاشة لا تنطفئ.

**ب) الفواتير `/cashier/bills`**
- بطاقات الفواتير المفتوحة (طاولة): المجموع، عدد الطلبات، المدة.

**ج) تفاصيل الفاتورة `/cashier/bills/[id]`**
- كل طلبات الفاتورة وأصنافها، المجموع الفرعي.
- **خصم:** زر «خصم» ← Dialog: نوع (مبلغ/نسبة) + قيمة + **سبب إجباري** ← تأكيد. يظهر الخصم مع اسم الكاشير في الفاتورة.
- **دفع:** زر «تسديد» ← Dialog: المبلغ المستلم (لوحة أرقام + أزرار سريعة 5,000 / 10,000 / 25,000 / 50,000)، يظهر **الباقي** تلقائياً ← تأكيد. بعدها: «طباعة الإيصال» و«مشاركة».
- تنبيه إن كان هناك طلبات غير `SERVED`: «بعد في طلبات ما انقدمت — تكمل؟».

**د) السفري**
- أُلغي. لا يوجد إنشاء طلب بلا طاولة.

**هـ) طلبات اليوم `/cashier/history`** : كل الطلبات والفواتير لليوم الحالي (بحث برقم الطلب أو الطاولة).

**و) الشفت `/cashier/shift`** : انظر القسم 13.

### 9.4 شاشات المالك (واجهة Sidebar على الكمبيوتر، قائمة سفلية على الموبايل)

| الصفحة | المحتوى |
|---|---|
| لوحة المعلومات | مبيعات اليوم، عدد الفواتير، متوسط الفاتورة، الخصومات، الإلغاءات، فواتير مفتوحة الآن، حالة الشفت، أكثر 5 أصناف، مبيعات حسب الساعة |
| المنيو | تصنيفات (إضافة/تعديل/ترتيب بالسحب/إخفاء)، أصناف (اسم، وصف، سعر، صورة، تصنيف، نفاد، إخفاء) |
| الطاولات | إضافة/تعديل التسمية/ترتيب/تعطيل |
| الموظفون | قائمة، إضافة، تغيير PIN، تغيير الدور، تعطيل/تفعيل |
| التقارير | القسم 14 |
| السجل | Audit Log مع فلترة بالفاعل/النوع/التاريخ |
| الإعدادات | اسم الكوفي، الهاتف، العنوان، تذييل الإيصال، ساعة بداية يوم العمل |
| الكاشير | يستطيع المالك الدخول لشاشات الكاشير والويتر عند الحاجة |

---

## 10. العمليات (Server Actions) بالتفصيل

> **قاعدة عامة لكل Action:** `requireUser(roles)` ← `zod.parse` ← `prisma.$transaction` ← `AuditLog` (إن كانت حساسة) ← `revalidatePath/Tag` ← إرجاع `{ ok: true, data }` أو `{ ok: false, error }`.
> أي فحص حالة (status) يتم **داخل الـ Transaction** وبشرط في الـ `where` (مثل `updateMany({ where: { id, status: "NEW" } })` والتحقق من `count === 1`) لتجنّب تعارض شخصين في نفس اللحظة.

### 10.1 الطلبات (`actions/orders.ts`)

| Action | الأدوار | المنطق |
|---|---|---|
| `createOrder` | ويتر، كاشير، مالك | انظر 10.1.1 |
| `addItemsToOrder` | ويتر، كاشير، مالك | انظر 10.1.2 |
| `removeOrderItem` | ويتر (قيود)، كاشير، مالك | انظر 10.1.3 |
| `requestCancelOrder` | ويتر | يضع `cancelRequestedAt/ById` على الطلب (إن كان الطلب غير ملغي) |
| `cancelOrder` | كاشير، مالك | سبب إجباري. الفاتورة OPEN. يضع كل الأصناف CANCELLED والطلب CANCELLED. يعيد حساب الفاتورة. AuditLog |
| `advanceOrderStatus` | كاشير، مالك | `NEW→PREPARING→READY→SERVED` مع ختم الوقت (`preparingAt`…). `updateMany` بشرط الحالة الحالية |
| `revertOrderStatus` | كاشير، مالك | خطوة للخلف. AuditLog |
| `clearCancelRequest` | كاشير، مالك | يرفض طلب الإلغاء (يمسح العلامة) |

#### 10.1.1 `createOrder`
المدخلات: `{ type, tableId?, items: [{ menuItemId, quantity, note? }], note? }`

1. فحص: شفت مفتوح. الطلب دائماً `DINE_IN` ويتطلب `tableId` طاولة فعّالة.
2. جلب `MenuItem` للأصناف: يجب `isActive && isAvailable`، وإلا رفض باسم الصنف («القهوة التركية خلصت»).
3. داخل Transaction:
   - **DINE_IN:** ابحث عن فاتورة `OPEN` للطاولة. إن لم توجد أنشئها. (عند تعارض سباق: يرمي القيد الفريد `one_open_bill_per_table` فنعيد المحاولة مرة واحدة بقراءة الفاتورة الموجودة.)
   - (لا TAKEAWAY).
   - `businessDate = getBusinessDate(now, settings.businessDayStartHour)`.
   - `dailyNumber = nextDailyNumber(tx, businessDate)`.
   - `isFollowUp = true` إن كان للفاتورة طلبات سابقة.
   - أنشئ `Order` و`OrderItem[]` بلقطة الاسم والسعر و`addedById = me.id`.
   - أعد حساب مجاميع الفاتورة (`calcTotals`) واحفظها.
4. أرجع رقم الطلب. (Realtime يخبر الكاشير تلقائياً.)

#### 10.1.2 `addItemsToOrder`
المدخلات: `{ tableId | orderId, items[] }`
- الفاتورة يجب أن تكون `OPEN`.
- إن وُجد **طلب بحالة NEW** مستهدف: أضف الأصناف إليه (إن اختار المستخدم طلباً بعينه).
- غير ذلك (الحالة الافتراضية من زر «إضافة» على الطاولة): استدعِ منطق `createOrder` الذي يُنشئ طلباً تابعاً `isFollowUp`.
- أعد حساب الفاتورة.

#### 10.1.3 `removeOrderItem`
المدخلات: `{ orderItemId, reason? }`
- الفاتورة `OPEN` وإلا رفض.
- **ويتر:** `item.addedById === me.id` و`order.status === NEW` (يُفحص داخل Transaction بشرط)، والسبب تلقائي «حذف من الويتر قبل التحضير». غير ذلك رفض برسالة «اطلب من الكاشير».
- **كاشير/مالك:** السبب إجباري.
- `status = CANCELLED` + حقول الإلغاء. إن لم يبقَ صنف `ACTIVE` فالطلب يصبح `CANCELLED`.
- أعد حساب الفاتورة. AuditLog إن كان المنفّذ كاشير/مالك أو كان الطلب بعد NEW.

### 10.2 الفواتير (`actions/bills.ts`)

| Action | الأدوار | المنطق |
|---|---|---|
| `applyDiscount` | كاشير، مالك | الفاتورة OPEN. `type` + `value` + **reason ≥ 3 أحرف**. `discountAmount = calcDiscount(...)`. `discountById = me.id`. AuditLog (`BILL_DISCOUNT`) مع قبل/بعد |
| `removeDiscount` | كاشير، مالك | يصفّر الخصم. AuditLog |
| `payBill` | كاشير، مالك | انظر أدناه |
| `voidBill` | مالك | الفاتورة `PAID` أو `OPEN`. سبب إجباري. `status = VOID`. تُستثنى من التقارير ومن «المتوقع في الصندوق». AuditLog |

**`payBill`** — المدخلات: `{ billId, receivedAmount }`
1. شفت مفتوح. الفاتورة `OPEN` ولها `total > 0` (فاتورة كل أصنافها ملغاة تُغلق كـ VOID لا كدفع).
2. `receivedAmount >= total` وإلا رفض.
3. Transaction: أنشئ `Payment { amount: total, receivedAmount, shiftId }`، وحدّث الفاتورة `PAID` (`paidAt`, `paidById`, `shiftId`)، وتأكد بـ `updateMany where status OPEN` أن الدفع لم يحدث مسبقاً (منع الدفع المزدوج).
4. أرجع `change = receivedAmount - total`.
5. الفاتورة تُجمَّد: لا تعديل أصناف أو خصم.

### 10.3 الشفت (`actions/shifts.ts`) — انظر القسم 13.

### 10.4 المنيو (`actions/menu.ts`) — المالك فقط

| Action | ملاحظة |
|---|---|
| `createCategory / updateCategory / reorderCategories / toggleCategory` | الإخفاء بدل الحذف |
| `createMenuItem / updateMenuItem` | سعر ≥ 0. تغيير السعر لا يؤثر على الطلبات القديمة (Snapshot). AuditLog عند تغيير السعر |
| `setItemAvailability` | تبديل «خلصت/متوفر» |
| `toggleMenuItemActive` | إخفاء/إظهار |
| `uploadMenuImage` | يستقبل الملف المضغوط، يتحقق من النوع (webp/jpeg/png) والحجم (≤ 500KB)، يرفعه بـ Service Role إلى `menu-images/{uuid}.webp`، ويحفظ `imagePath` ويحذف الصورة القديمة |
| `reorderItems` | ترتيب العرض |

بعد أي تعديل: `revalidateTag("menu")`. قراءة المنيو للويتر/الكاشير تُجلب مع cache tag `menu`.

### 10.5 الطاولات والموظفون والإعدادات
- `createTable / updateTable / reorderTables / toggleTable` (المالك). لا يمكن تعطيل طاولة عليها فاتورة OPEN.
- `createStaff / resetPin / changeRole / setStaffActive` (المالك) — انظر 7.2.
- `updateSettings` (المالك): الاسم، الهاتف، العنوان، التذييل، ساعة بداية يوم العمل (0–12).

### 10.5b العروض الموقوتة (`actions/offers.ts`) — المالك فقط
انظر **القسم 22**. `createOffer` / `updateOffer` / `toggleOfferActive` — صلاحية `offers.manage`، مزامنة صنف المنيو، AuditLog، `updateTag("menu")`.

### 10.6 أحداث AuditLog (قائمة كاملة)
`ORDER_CANCELLED` · `ORDER_ITEM_CANCELLED` (غير ما حذفه الويتر في NEW) · `ORDER_STATUS_REVERTED` · `BILL_DISCOUNT` · `BILL_DISCOUNT_REMOVED` · `BILL_PAID` · `BILL_VOID` · `SHIFT_OPENED` · `SHIFT_CLOSED` · `MENU_PRICE_CHANGED` · `MENU_ITEM_AVAILABILITY` · `STAFF_CREATED` · `STAFF_PIN_RESET` · `STAFF_ROLE_CHANGED` · `STAFF_ACTIVE_CHANGED` · `SETTINGS_UPDATED` · `OFFER_CREATED` · `OFFER_UPDATED` · `OFFER_TOGGLED`.

---

## 11. الوقت الحقيقي (Realtime) والتنبيهات

### 11.1 الأسلوب: «حدث ← إعادة جلب»
```ts
// src/hooks/use-realtime-refresh.ts  (مكوّن عميل)
"use client";
export function useRealtimeRefresh(tables: string[], onChange: () => void) {
  // 1) supabase.channel("cafe-live")
  //      .on("postgres_changes", { event: "*", schema: "public", table }, onChange)
  //      لكل جدول في tables → .subscribe()
  // 2) عند إعادة الاتصال بعد انقطاع: استدعِ onChange() مرة (لتعويض ما فات)
  // 3) Fallback: setInterval(onChange, 15000) كشبكة أمان فقط
  // 4) تنظيف: supabase.removeChannel(channel) عند الإزالة
}
```
- `onChange` = `router.refresh()` (مع debounce 300ms لتجميع الأحداث المتتابعة).
- الجداول: `orders`, `order_items`, `bills` (للكاشير والويتر)، و`menu_items` (لتحديث «خلصت» في شاشة الطلب).

### 11.2 تنبيه الكاشير بطلب جديد
- حدث `INSERT` على `orders` ← تشغيل الصوت `new-order.mp3` + وميض العمود «جديد» + Toast.
- يُميَّز الحدث الجديد بمقارنة معرّفات الطلبات الظاهرة قبل/بعد إعادة الجلب (أو من `payload.new.id`).

### 11.3 تنبيه الويتر عند «جاهز»
- حدث `UPDATE` على `orders` حيث `status = READY` و`createdById === me.id` (يُفحص في العميل) ← Toast كبير + صوت + شارة على الطاولة.
- ما لم يُنشئه هذا الويتر، تظهر شارة «جاهز» على الطاولة بدون صوت.

### 11.4 قيود المتصفحات (مهم، لا مفاجآت)
| القيد | الحل |
|---|---|
| المتصفحات تمنع الصوت التلقائي قبل لمسة المستخدم | زر **«فعّل الصوت»** يظهر عند فتح الشاشة، ولمسة واحدة تكفي طوال الجلسة. يُحفظ تفضيله ويُعاد عرض الزر عند كل فتح جديد |
| التطبيق بالخلفية أو الشاشة مقفلة: الاتصال يتوقف خصوصاً على iPhone | **الإشعار يعمل فقط والتطبيق مفتوح في الأمام.** لذلك: Wake Lock لإبقاء الشاشة مضاءة في شاشة الكاشير، ويُنصح الويترز بإبقاء التطبيق مفتوحاً. عند العودة للأمام يُعاد الجلب تلقائياً (`visibilitychange`) |
| iOS لا يدعم اهتزاز المتصفح | الاعتماد على الصوت والإشعار المرئي |
| Web Push (إشعار والتطبيق مغلق) | خارج النسخة الأولى. يتطلب تثبيت PWA على iOS 16.4+ وإعدادات إضافية (القسم 21) |

### 11.5 Wake Lock
```ts
// src/hooks/use-wake-lock.ts
// navigator.wakeLock.request("screen") عند فتح شاشة الكاشير
// أعد الطلب عند visibilitychange → visible (لأنه يُفرَج تلقائياً عند الإخفاء)
// تجاهل الخطأ بصمت إن لم يكن مدعوماً
```

---

## 12. الفاتورة والطباعة والمشاركة

### 12.1 محتوى الإيصال
- اسم الكوفي، الهاتف، العنوان (من الإعدادات)
- رقم الفاتورة (مختصر `B-` + آخر 6 من المعرّف) · التاريخ والوقت (بغداد) · الطاولة · الكاشير
- قائمة الأصناف مجمّعة (الاسم × الكمية = السعر) من **كل طلبات الفاتورة** (الأصناف `ACTIVE` فقط)
- المجموع الفرعي · الخصم (إن وُجد) · **الإجمالي** · المستلم · الباقي
- تذييل الإيصال (من الإعدادات)

### 12.2 الطباعة (النسخة الأولى)
- صفحة `/cashier/bills/[id]/receipt` بتصميم عرض **80mm** (يُضبط بـ CSS `@page { size: 80mm auto; margin: 0 }` و`@media print`) وزر «طباعة» يستدعي `window.print()`.
- تعمل مع أي طابعة معرَّفة في نظام الجهاز (بما فيها الحرارية 80mm) عبر نافذة الطباعة. **لا حاجة لأي كود إضافي عند شراء الطابعة**، فقط تثبيت تعريفها على جهاز الكاشير وضبط المقاس وإلغاء الرؤوس والتذييلات في خيارات الطباعة.
- **الطباعة التلقائية بدون نافذة** (ESC/POS مباشرة) مؤجلة: تحتاج برنامج وسيط أو WebUSB. تُحسم عند معرفة الطابعة (القسم 20).

### 12.3 المشاركة
- زر «مشاركة» يستخدم `navigator.share({ text })` بنص مبسّط للفاتورة (الأصناف + الإجمالي) فيفتح واتساب وغيره. وإن لم يدعم المتصفح: «نسخ النص».
- إيصال PDF/صورة قابل للمشاركة: خارج النسخة الأولى.

### 12.4 تقسيم الفاتورة
- **غير مفعّل في الواجهة** حالياً (قرار: ربما يُلغى). جدول `Payment` يسمح بعدة دفعات للفاتورة الواحدة، فإضافة «تقسيم متساوٍ» أو «حسب الأصناف» لاحقاً **لا تتطلب تغيير قاعدة البيانات**.

---

## 13. الشفت وإغلاق الصندوق

### 13.1 فتح الشفت (كاشير/مالك)
- شاشة `/cashier/shift`: حقل «مبلغ بداية الصندوق» (قد يكون 0) ← «افتح الشفت».
- يُنشئ `Shift` (فريد: واحدة مفتوحة فقط). AuditLog.
- كل `Bill` و`Order` و`Payment` جديد يرتبط بالشفت المفتوح.

### 13.2 أثناء الشفت
- الكاشير يرى: وقت فتح الشفت، عدد الطلبات المفتوحة. **لا يرى مجموع المبيعات** (حسب القرار).

### 13.3 إغلاق الصندوق «الأعمى»
1. يمنع الإغلاق وجود **فواتير OPEN**: تظهر قائمتها ليُدفع أو يُلغى ما فيها (أو يُنقل المالك قرار تركها: مرحلة لاحقة).
2. الكاشير يُدخل **المبلغ الفعلي في الصندوق** `countedCash` (+ ملاحظة اختيارية).
3. الخادم يحسب:
   - `expectedCash = openingCash + Σ Payment.amount` لدفعات هذا الشفت (فواتير `PAID` فقط، تُستثنى `VOID`).
   - `difference = countedCash - expectedCash`.
4. تُحفظ القيم، وتُعرض للكاشير رسالة محايدة: «تم إغلاق الشفت» **بدون** المتوقع ولا الفرق.
5. المالك يرى في «تقرير الشفتات»: الفتح، الإغلاق، البداية، المتوقع، الفعلي، **الفرق** (أحمر إن نقص، أصفر إن زاد).
6. بعد الإغلاق لا يمكن إنشاء طلبات حتى تُفتح شفت جديد.

> **ملاحظة:** مصروفات الصندوق (سحب نقدي لشراء شيء) غير موجودة في النسخة الأولى، وأي سحب سيظهر كنقص. انظر القسم 20.

---

## 14. التقارير

> **للمالك فقط.** تعتمد فقط على الفواتير `PAID` (حسب `businessDate` لتاريخ الدفع) ما لم يُذكر خلاف ذلك. فلتر تاريخ: اليوم، أمس، آخر 7 أيام، هذا الشهر، مخصّص. كل المبالغ بالدينار مع فاصل آلاف.

| التقرير | الأعمدة / التعريف |
|---|---|
| **لوحة المعلومات** | مبيعات اليوم (Σ total للفواتير PAID)، عدد الفواتير، متوسط الفاتورة، إجمالي الخصومات، عدد/قيمة الإلغاءات، فواتير مفتوحة الآن، أكثر 5 أصناف مبيعاً، مبيعات بالساعة |
| **المبيعات اليومية** | لكل يوم: عدد الفواتير، المجموع الفرعي، الخصومات، **الصافي**. مخطط خطي |
| **مبيعات كل ويتر** | لكل موظف: عدد الأصناف، قيمة المبيعات = Σ(سعر×كمية) للأصناف `ACTIVE` التي **أضافها هو** (`addedById`) في فواتير `PAID`. أصناف الكاشير تُنسب للكاشير. *(الخصم على مستوى الفاتورة لا يُوزَّع ويظهر منفصلاً)* |
| **الأصناف** | لكل صنف: الكمية المباعة، الإيراد. فلتر بالتصنيف. الأكثر/الأقل مبيعاً |
| **الخصومات** | لكل خصم: الفاتورة، الطاولة، المبلغ، النوع/القيمة، **السبب**، الكاشير، الوقت. إجمالي حسب الكاشير |
| **الإلغاءات** | الطلبات/الأصناف الملغاة: ما، قيمته، من ألغى، السبب، الوقت، حالة الطلب وقت الإلغاء |
| **الشفتات** | القسم 13.3 |
| **الفواتير الملغاة (Void)** | الفاتورة، المبلغ، السبب، المالك |

- التنفيذ: استعلامات Prisma `groupBy` أو `$queryRaw` للتجميع بالساعة، داخل `actions/reports.ts` (المالك فقط). مع Indexes الموجودة تكفي لحجم كوفي واحد لسنوات.
- **تصدير CSV** (اختياري، المرحلة 7): زر يحوّل جدول التقرير الظاهر إلى ملف CSV بترميز UTF-8 مع BOM لتقرأه Excel بالعربي.

---

## 15. الواجهة: عربي RTL، اللهجة العراقية، PWA

### 15.1 RTL
```tsx
// src/app/layout.tsx
import { Tajawal } from "next/font/google";
const font = Tajawal({ subsets: ["arabic", "latin"], weight: ["400", "500", "700"], display: "swap" });

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={font.className}>{/* DirectionProvider dir="rtl" من Radix + Toaster */}{children}</body>
    </html>
  );
}
```
- استخدم **خصائص Tailwind المنطقية** دائماً: `ms-*` `me-*` `ps-*` `pe-*` `start-*` `end-*` `text-start` بدل `ml/mr/pl/pr/left/right`.
- لف التطبيق بـ `DirectionProvider` (من `@radix-ui/react-direction`) كي تعمل مكونات shadcn (Dialog, Select, Tabs, Dropdown…) بشكل صحيح بـ RTL.
- بعد إضافة أي مكوّن shadcn: **راجع الأسهم والأيقونات والـ slide animations** وقلبها يدوياً إن لزم (مثل Drawer/Sheet من اليمين).
- الأيقونات الاتجاهية (أسهم الرجوع) تُعكس.

### 15.2 الأرقام والمال
```ts
// src/lib/money.ts
export const formatIQD = (n: number) => `${n.toLocaleString("en-US")} د.ع`;
```
- الأرقام **غربية (0-9)** مع فاصل آلاف. أرقام الأعداد والمبالغ تُلفّ بـ `dir="ltr"` أو `<bdi>` لتجنب انعكاس ترتيبها داخل النص العربي.
- لا كسور في أي مكان.

### 15.3 التاريخ والوقت
- كل العرض بتوقيت `Asia/Baghdad`، بصيغة 12 ساعة عربية (ص/م) أو 24 (يُحسم مع العميل، الافتراضي 12).

### 15.4 اللهجة العراقية
- كل النصوص في ملف واحد `src/lib/i18n/ar-iq.ts` (مفاتيح → نص). لا نصوص صلبة داخل المكوّنات.
- قاعدة: **الوضوح أولاً**. لهجة خفيفة ومفهومة، بلا تعابير قد يختلف معناها. أمثلة في القسم 22.

### 15.5 PWA
```ts
// src/app/manifest.ts
import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "كوفي - الطلبات", short_name: "الطلبات",
    start_url: "/", display: "standalone", orientation: "any",
    lang: "ar", dir: "rtl", background_color: "#ffffff", theme_color: "#1f1a17",
    icons: [
      { src: "/icons/192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
```
- **التثبيت:** Android/Chrome: «تثبيت التطبيق». iPhone/iPad: Safari ← مشاركة ← «إضافة إلى الشاشة الرئيسية».
- **لا Service Worker للعمل دون إنترنت** في هذه النسخة (قرار: إنترنت مستقر).
- `viewport`: `width=device-width, initial-scale=1, viewport-fit=cover`. استخدم `env(safe-area-inset-*)` للأشرطة الثابتة. أضف `touch-action: manipulation` للأزرار لمنع تكبير النقر المزدوج.
- منع سحب التحديث العرضي (`overscroll-behavior: contain`) في شاشات الطلب.

### 15.6 حالات الواجهة الإلزامية
لكل صفحة: **تحميل** (Skeleton)، **فارغ** («ماكو طلبات هسّه»)، **خطأ** (رسالة عربية + «جرّب مرة ثانية»). كل زر إجراء: حالة `loading` وتعطيل أثناء التنفيذ لمنع النقر المزدوج، وكل إجراء حساس (إلغاء، خصم، دفع) يمر بنافذة **تأكيد** (AlertDialog).

---

## 16. الإعداد خطوة بخطوة

### 16.1 المتطلبات
Node.js LTS · pnpm (أو npm) · حساب Supabase · حساب Vercel · Git/GitHub · Cursor.

### 16.2 إنشاء المشروع
```bash
pnpm create next-app@latest coffee-app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd coffee-app
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button card dialog alert-dialog drawer sheet tabs badge input input-otp \
  select switch table sonner skeleton form dropdown-menu textarea label separator chart
pnpm add @supabase/supabase-js @supabase/ssr zod react-hook-form @hookform/resolvers \
  date-fns lucide-react browser-image-compression @radix-ui/react-direction server-only
pnpm add -D prisma vitest @playwright/test tsx
pnpm add @prisma/client
```

### 16.3 Supabase
1. أنشئ مشروعاً جديداً. **اختر أقرب منطقة** للعراق من حيث زمن الاستجابة (جرّب مثلاً Frankfurt أو Mumbai وقِس).
2. من **Project Settings ← API**: خذ `URL` و`anon/publishable key` و`service role/secret key`.
3. من **Project Settings ← Database**: خذ رابط الـ Pooler (Transaction) للـ `DATABASE_URL` والرابط المباشر للـ `DIRECT_URL`.
4. **Authentication ← Providers**: فعّل Email. **عطّل «Confirm email»** و**عطّل التسجيل الذاتي (Allow new users to sign up)** — المستخدمون يُنشَؤون من الخادم فقط.
5. **Storage**: أنشئ bucket `menu-images` عام (Public).
6. أنشئ حساب المالك يدوياً: **Authentication ← Users ← Add user** (بريدك الحقيقي + كلمة مرور قوية)، ثم سجّل `id` المستخدم واضبط `app_metadata` إلى `{ "role": "OWNER" }` (من SQL Editor: `update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"OWNER"}' where id = '...';`).

### 16.4 Prisma والـ migrations
```bash
pnpm prisma init                         # (إن لم يكن موجوداً) ثم الصق الـ schema من القسم 6
pnpm prisma migrate dev --name init --create-only
# عدّل ملف الـ migration: أضف SQL القسم 6.1 (فهارس جزئية وقيود) والقسم 7.5 (RLS + Realtime)
pnpm prisma migrate dev                  # تطبيق
pnpm prisma generate
```
- بعد كل تغيير في RLS/الفهارس: ضعه في migration جديد (لا تعدّل migration مطبّق).

### 16.5 الـ Seed (`prisma/seed.ts`)
ينشئ: `CafeSettings` (id=1)، `Profile` للمالك (بالـ id من الخطوة السابقة)، وفي بيئة التطوير فقط: كاشير وويترين تجريبيين (عبر Admin API)، 4 تصنيفات و15 صنفاً تجريبياً، و10 طاولات تجريبية. **لا يُشغَّل بيانات التجربة على قاعدة الإنتاج.**

### 16.6 ملفات Supabase
- `lib/supabase/server.ts`: عميل الخادم (cookies) لقراءة المستخدم.
- `lib/supabase/client.ts`: عميل المتصفح (للـ Realtime فقط).
- `lib/supabase/admin.ts`: Service Role، أول سطر فيه `import "server-only"`.

---

## 17. خطة التنفيذ بالمراحل (مع Prompts لـ Cursor)

> **طريقة العمل مع Cursor:** ابدأ بوضع ملف القواعد (القسم 22) في `.cursor/rules/project.mdc`، وضع هذا الدليل نفسه في المشروع (مثلاً `docs/GUIDE.md`) وأشِر إليه بـ `@docs/GUIDE.md` في كل Prompt. نفّذ **مرحلة واحدة في كل مرة**، اختبرها، ثم Commit.

### المرحلة 0: الأساس (يوم 1)
**الناتج:** مشروع يعمل، RTL، خط عربي، shadcn، Prisma متصل، هيكل المجلدات.
**قبول:** صفحة تبدأ بـ RTL، `prisma studio` يتصل بقاعدة Supabase.
> **Prompt:** «اقرأ @docs/GUIDE.md. نفّذ المرحلة 0: هيكل المجلدات من القسم 8، RTL والخط Tajawal من 15.1، Prisma singleton، عملاء Supabase الثلاثة، ملف `ar-iq.ts` فارغ المفاتيح، وملف `.env.example`. لا تضف ميزات غير مذكورة.»

### المرحلة 1: قاعدة البيانات والمصادقة (3–4 أيام)
**الناتج:** السكيما كاملة + RLS + الفهارس الجزئية، تسجيل دخول PIN للموظفين وبريد للمالك، الـ proxy، `requireUser`، `permissions.ts`، توجيه حسب الدور، الـ seed.
**قبول:** الويتر لا يدخل `/owner` (يُحوَّل). 5 محاولات PIN خاطئة تقفل 10 دقائق. موظف معطّل لا يدخل. المتصفح لا يستطيع `INSERT` بمفتاح anon (جرّبه يدوياً).
> **Prompt:** «نفّذ المرحلة 1 حسب الأقسام 6 و7 حرفياً: schema + migration يدوي فيه SQL القسم 6.1 و7.5، `derivePassword`، `loginWithPin` مع Rate Limit، `requireUser`، `proxy.ts`، layouts تفحص الدور، شاشة الدخول مع `input-otp`. اكتب اختبارات Vitest لـ `permissions` و`derivePassword`.»

### المرحلة 2: لوحة المالك — المنيو والطاولات والموظفون والإعدادات (4–5 أيام)
**الناتج:** CRUD للتصنيفات والأصناف والصور (ضغط + رفع)، نفاد الصنف، الطاولات، الموظفون (إنشاء/PIN/تعطيل/دور)، الإعدادات، AuditLog الأساسي.
**قبول:** المالك يرفع صورة ويظهر الصنف. إنشاء ويتر جديد ودخوله بالـ PIN. تغيير السعر لا يغيّر طلباً قديماً (سيُختبر لاحقاً).
> **Prompt:** «نفّذ المرحلة 2: صفحات `/owner/menu`, `/owner/tables`, `/owner/staff`, `/owner/settings` وActions من 10.4 و10.5 و7.2 و10.6. ضغط الصور في المتصفح (800px, webp). كل Action بـ zod و`requireUser([OWNER])`.»

### المرحلة 3: تسجيل الطلب للويتر (4–5 أيام)
**الناتج:** شاشة الطاولات، شاشة الطلب (تصنيفات، شبكة، سلة Drawer)، `createOrder`/`addItemsToOrder`/`removeOrderItem`/`requestCancelOrder`، تفاصيل الطاولة، كل الطلبات، الترقيم اليومي، دوال `calcTotals`.
**قبول:** 4 سيناريوهات اختبار: طلب على طاولة فاضية، طلب ثانٍ على نفس الطاولة، ويتران يطلبان على نفس الطاولة في نفس اللحظة (فاتورة واحدة)، صنف نافد يُرفض. الأرقام اليومية متسلسلة بلا تكرار. (الشفت: مؤقتاً يُنشأ `Shift` من الـ seed لحين المرحلة 6، أو نفّذ المرحلة 6 قبل هذه.)
> **Prompt:** «نفّذ المرحلة 3 حسب 9.2 و10.1 و6.2–6.4. اختبارات Vitest لـ `calcTotals`/`calcDiscount`/`getBusinessDate`. والتأكد من الذرّية بـ Transaction و`one_open_bill_per_table`.»

### المرحلة 4: لوحة الكاشير والوقت الحقيقي (4–5 أيام)
**الناتج:** لوحة الطلبات (أعمدة/تبويبات)، `advanceOrderStatus`/`revertOrderStatus`/`cancelOrder`، حذف أصناف بسبب، `useRealtimeRefresh`، صوت وتفعيله، Wake Lock، تنبيه الويتر عند «جاهز».
**قبول:** افتح جهازين: طلب الويتر يظهر عند الكاشير خلال ثانيتين مع صوت. «جاهز» يظهر عند الويتر الصحيح. فصل الإنترنت ثم رجوعه يعيد المزامنة.
> **Prompt:** «نفّذ المرحلة 4 حسب 9.3(أ) و10.1 و11. تأكد من فحص الحالة داخل Transaction بـ updateMany.»

### المرحلة 5: الفاتورة والدفع والإيصال (3–4 أيام)
**الناتج:** صفحات الفواتير، الخصم بسبب، الدفع والباقي، قفل الفاتورة، Void للمالك، قالب الإيصال 80mm، المشاركة النصية.
**قبول:** فاتورة طاولة بطلبين تُدفع دفعة واحدة. الخصم لا يتجاوز المجموع. دفعتان متزامنتان = واحدة تنجح فقط. الطباعة تُظهر إيصالاً سليماً بالعربي.
> **Prompt:** «نفّذ المرحلة 5 حسب 9.3(ج,د) و10.2 و12.»

### المرحلة 6: الشفتات (2–3 أيام)
**الناتج:** فتح/إغلاق الشفت الأعمى، منع الطلبات بدون شفت، تقرير الفرق للمالك.
**قبول:** الكاشير لا يرى المتوقع ولا الفرق. المالك يراهما. الإغلاق يمنعه وجود فواتير مفتوحة.
> **Prompt:** «نفّذ المرحلة 6 حسب 4.8 و13.»

### المرحلة 7: التقارير ولوحة المالك (4–5 أيام)
**الناتج:** لوحة المعلومات، التقارير الثمانية، Audit Log، (اختياري) تصدير CSV.
**قبول:** مطابقة أرقام التقارير يدوياً مع بيانات تجريبية معروفة (مبيعات، خصومات، لكل ويتر).
> **Prompt:** «نفّذ المرحلة 7 حسب 14. استعلامات التجميع في `actions/reports.ts`، مع اختبارات على بيانات seed معروفة النتائج.»

### المرحلة 8: التلميع والـ PWA واللهجة (3–4 أيام)
**الناتج:** manifest وأيقونات، كل النصوص بلهجة عراقية من `ar-iq.ts`، حالات التحميل/الفراغ/الخطأ، تأكيدات الإجراءات الحساسة، مراجعة RTL لكل المكونات، اختبار على iPad وموبايل حقيقيين.
**قبول:** قائمة 18.3.

### المرحلة 9: الإنتاج والتسليم (2–3 أيام)
**الناتج:** نشر Vercel + Supabase الإنتاجي، بيانات حقيقية (منيو، طاولات، موظفون)، تدريب العميل، تشغيل تجريبي ليوم كامل بجانب الدفتر/الطريقة القديمة، نسخة احتياطية.
**قبول:** قائمة 19.

> **المدة الإجمالية التقديرية:** 4–6 أسابيع عمل بدوام جزئي/وايب كودنج منتظم. الأرقام تقريبية، وتتأثر بمدى جاهزية المنيو والصور والقرارات المعلّقة.

---

## 18. الاختبار

### 18.1 اختبارات الوحدة (Vitest) — إلزامية
- `calcDiscount` / `calcTotals`: خصم مبلغ، نسبة، تقريب 250، لا يتجاوز المجموع، أصناف ملغاة تُستثنى.
- `getBusinessDate`: 04:59 و05:00 بتوقيت بغداد، رأس السنة، وقت UTC مقابل بغداد.
- `can(role, permission)`: كل خلية في جدول القسم 3.
- `derivePassword`: ثابتة لنفس المدخلات، مختلفة عند اختلاف أي مدخل.
- `transitions`: الانتقالات المسموحة والممنوعة للحالات.

### 18.2 سيناريوهات يدوية/Playwright (جهازان أو سياقان)
1. ويتر يرسل طلباً ← يظهر عند الكاشير مع صوت.
2. الكاشير ينقله «جاهز» ← تنبيه للويتر الذي أنشأه فقط.
3. ويتران، طاولة واحدة، طلبان متزامنان ← فاتورة واحدة، رقمان مختلفان.
4. ويتر يحذف صنفاً في طلب NEW ← ينجح. بعد `PREPARING` ← يُرفض.
5. إضافة صنف لطاولة طلبها `PREPARING` ← ينشأ طلب تابع بشارة «إضافة».
6. كاشير يخصم بدون سبب ← يُرفض. بسبب ← ينجح ويظهر عند المالك.
7. دفعان متزامنان لنفس الفاتورة ← واحد ينجح.
8. صنف نافد في شاشة الويتر مفتوحة ← يتحول «خلصت» خلال ثوانٍ، وإرسال طلب به يُرفض.
9. موظف يُعطَّل أثناء استخدامه ← أول إجراء بعدها يُرفض.
10. إغلاق شفت بفاتورة مفتوحة ← مرفوض. الكاشير لا يرى الفرق.
11. تغيير سعر صنف ← الفواتير القديمة بسعرها القديم.
12. بعد منتصف الليل وقبل 05:00 ← الرقم اليومي يستمر (#043 لا #001).
13. محاولة `INSERT` مباشرة من المتصفح بمفتاح anon ← مرفوضة.
14. 5 PIN خاطئة ← قفل 10 دقائق.

### 18.3 قائمة قبول المرحلة 8 (واجهة)
- [ ] كل الشاشات سليمة على موبايل 360px وآيباد وكمبيوتر.
- [ ] لا نص يتجاوز أو ينعكس بشكل خاطئ في RTL (الأرقام والأسعار).
- [ ] لا توجد نصوص إنجليزية ظاهرة للمستخدم.
- [ ] كل الأزرار ≥ 44px. لا تكبير تلقائي في iOS عند التركيز على الحقول.
- [ ] تثبيت PWA ناجح على Android وiPad.
- [ ] حالات التحميل والفراغ والخطأ موجودة في كل صفحة.
- [ ] تأكيد قبل الإلغاء/الخصم/الدفع/Void.

---

## 19. النشر والتشغيل

### 19.1 النشر
1. ادفع الكود إلى GitHub. اربطه بـ Vercel.
2. أضف كل متغيرات البيئة (القسم 7.7) في Vercel (Production + Preview).
3. **مشروع Supabase منفصل للإنتاج** عن التطوير. طبّق الـ migrations عليه: `prisma migrate deploy`.
4. أنشئ حساب المالك الإنتاجي (16.3-6) وشغّل seed **الإنتاج** فقط (الإعدادات والمالك، بدون بيانات تجريبية).
5. اربط نطاقاً (Domain) إن أمكن. (HTTPS إلزامي لـ PWA.)

### 19.2 الإنتاج الحقيقي على Supabase
- الخطة المجانية مناسبة للتطوير. **للتشغيل الفعلي في الكوفي يُنصح بخطة مدفوعة** لأن المجانية قد تُوقف المشروع عند قلة النشاط وتفتقر لنسخ احتياطية يومية مضمونة، وهذا غير مقبول لنظام يعتمد عليه الكوفي يومياً. تحقق من شروط الخطط الحالية قبل القرار.

### 19.3 قائمة ما قبل التسليم
- [ ] مفاتيح Service Role وPIN_PEPPER غير موجودة في الكود ولا في الـ Git.
- [ ] RLS مفعّل على كل الجداول (تحقق من لوحة Supabase: لا تحذير «RLS disabled»).
- [ ] التسجيل الذاتي في Supabase Auth معطّل.
- [ ] اختبار فشل: فصل الإنترنت عن جهاز الويتر ثم رجوعه.
- [ ] تشغيل تجريبي يوماً كاملاً مع الطريقة القديمة بالتوازي.
- [ ] نسخة احتياطية (Backups مفعلة أو تصدير يدوي أسبوعي) وتجربة استرجاع.
- [ ] كلمة مرور المالك وPIN_PEPPER محفوظان عند العميل وعندك بشكل آمن.
- [ ] تدريب: ورقة تعليمات من صفحة واحدة لكل دور.

### 19.4 المراقبة والصيانة
- Vercel Logs لأخطاء الخادم. (اختياري: Sentry.)
- مراجعة Audit Log أسبوعياً من المالك.
- التحديثات: تحديث الاعتماديات شهرياً على فرع تجريبي قبل الإنتاج.
- لا حذف بيانات. عند تضخم الجداول بعد سنوات يُرتَّب أرشيف (غير مطلوب الآن).

---

## 20. قرارات معلّقة (بانتظار العميل) والافتراض المؤقت

> كل بند هنا **له تصرف افتراضي واضح** كي لا يتوقف العمل. عند حسمه يُعدَّل فقط ما ذُكر.

| # | القرار المعلّق | الافتراض المؤقت في النسخة الأولى | ماذا يتغير عند الحسم |
|---|---|---|---|
| 1 | **عدد الطاولات وتسمياتها** | المالك يضيفها من لوحته (لا عدد مبرمج) | لا شيء برمجي. يُدخلها المالك |
| 2 | **أحجام المشروبات والإضافات** (صغير/وسط/كبير، سكر، شوت…) | غير موجودة. الملاحظة الحرة لكل صنف تغطي الاحتياج مؤقتاً | إضافة جداول `ItemVariant` (حجم + فرق سعر) و`ItemAddon` و`OrderItemOption`. لا تعديل على الجداول الحالية سوى إضافات |
| 3 | **تتبع المخزون** | غير موجود | جداول `Ingredient` و`Recipe` وحركات مخزون، وخصم تلقائي عند `SERVED` أو الدفع |
| 4 | **الطابعة** | طباعة من المتصفح بقالب 80mm (12.2) | إن أُريدت طباعة تلقائية: برنامج وسيط/WebUSB ESC/POS، يُحسم بعد معرفة الطراز والجهاز |
| 5 | **تقسيم الفاتورة** | غير مفعّل | واجهة تقسيم فوق جدول `Payment` الحالي |
| 6 | **من يضغط «تم التقديم»؟** | الكاشير فقط (حسب الجدول المعتمد) | **توصية:** السماح للويتر بالضغط على «تم التقديم» لطلباته الجاهزة، لأنه هو من يقدّمها فعلاً. تعديل صغير في `advanceOrderStatus` |
| 7 | **تغيير «نفاد الصنف» بيد الكاشير؟** | المالك فقط (حسب القرار) | **توصية:** السماح للكاشير بتبديل «خلصت/متوفر» فقط (دون الأسعار) لأن النفاد يحدث أثناء الدوام والمالك غائب غالباً |
| 8 | **بداية يوم العمل** | 05:00 صباحاً | قيمة في الإعدادات |
| 9 | **سقف خصم الكاشير** | بلا سقف، لكن السبب إجباري والمالك يراها | إضافة حقل `maxCashierDiscountPercent` في الإعدادات ورفض ما يتجاوزه |
| 10 | **أجور الخدمة/الضريبة** | غير مطبّقة | حقل نسبة في الإعدادات وتعديل `calcTotals` وقالب الإيصال |
| 11 | **مصروفات الصندوق** (سحب نقدي أثناء الشفت) | غير موجودة (أي سحب يظهر كنقص) | جدول `CashMovement` يدخل في معادلة `expectedCash` |
| 12 | **صيغة الأرقام والوقت** (0-9 أم ٠-٩، 12 أم 24 ساعة) | أرقام غربية 0-9، وقت 12 ساعة | قيمة تنسيق واحدة |
| 13 | **شعار الكوفي على الإيصال** | بدون شعار، الاسم فقط | رفع شعار في الإعدادات وعرضه في القالب |
| 14 | **ترتيب شبكة المنيو** | حسب `sortOrder` يدوي من المالك | لا شيء |

---

## 21. ما هو خارج النسخة الأولى

| الميزة | ملاحظة |
|---|---|
| Web Push (إشعار والتطبيق مغلق) | يتطلب Service Worker وVAPID. على iOS يعمل فقط للتطبيق المثبّت (iOS 16.4+) |
| Offline | قرار: لا حاجة (إنترنت مستقر) |
| الطباعة التلقائية للمطبخ | قرار لاحق مع الطابعة |
| إيصال PDF/صورة للمشاركة | يحتاج توليد على الخادم |
| حضور وانصراف الموظفين | غير مطلوب الآن |
| برنامج ولاء/زبائن | غير مطلوب |
| تعدد الفروع | قرار: كوفي واحد |
| الدفع الإلكتروني | قرار: لا يوجد |
| التوصيل | قرار: لا يوجد |

---

## 22. ملحق: قواعد Cursor ونصوص الواجهة

### 22.1 ملف قواعد المشروع `.cursor/rules/project.mdc`

```md
---
description: قواعد مشروع تطبيق الكوفي
alwaysApply: true
---
- المرجع الأساسي: docs/GUIDE.md. لا تضف ميزات خارجه. عند الشك اسأل.
- Next.js App Router + TypeScript صارم. Server Components افتراضياً، "use client" عند الحاجة فقط.
- كل كتابة للبيانات عبر Server Actions في src/actions فقط. ممنوع الكتابة من المتصفح إلى Supabase.
- كل Action: requireUser(roles) أولاً، ثم zod، ثم prisma.$transaction، ثم AuditLog للحساس، ثم revalidate.
- الأخطاء تُرجَع { ok:false, error:"رسالة عربية" } ولا تُرمى للواجهة.
- المبالغ Int بالدينار. ممنوع Float. لا تثق بسعر قادم من المتصفح.
- لا حذف فعلي للطلبات/الفواتير/الأصناف المالية: حالة CANCELLED/VOID + سبب + AuditLog.
- فحص الحالة داخل transaction بـ updateMany مع where على الحالة والتحقق من count.
- Service Role و PIN_PEPPER في ملفات "server-only" فقط.
- Tailwind بخصائص منطقية فقط (ms/me/ps/pe/start/end). لا ml/mr/pl/pr/left/right.
- كل نص ظاهر للمستخدم من src/lib/i18n/ar-iq.ts. لا نصوص صلبة.
- الأرقام والمبالغ داخل <bdi> أو dir="ltr". استخدم formatIQD.
- كل صفحة: حالة تحميل وفراغ وخطأ. كل إجراء حساس: AlertDialog تأكيد.
- التوقيت Asia/Baghdad. يوم العمل عبر getBusinessDate فقط.
- اكتب اختبار Vitest لأي دالة منطق مالي أو صلاحيات.
- لا تعدّل migration مطبّق. أي تغيير = migration جديد.
```

### 22.2 نصوص واجهة مقترحة (لهجة عراقية واضحة)

| المفتاح | النص |
|---|---|
| `auth.username` | اسم المستخدم |
| `auth.pin` | الرقم السري (PIN) |
| `auth.login` | دخول |
| `auth.error` | اسم المستخدم أو الرقم السري غلط |
| `auth.locked` | حاولت هواية، جرّب بعد شوية |
| `auth.ownerLogin` | دخول المالك |
| `tables.title` | الطاولات |
| `tables.free` | فاضية |
| `tables.busy` | مشغولة |
| `order.new` | طلب جديد |
| `order.send` | ارسل الطلب |
| `order.sent` | انرسل الطلب |
| `order.addItems` | إضافة أصناف |
| `order.note` | ملاحظة |
| `order.notePlaceholder` | مثلاً: بدون سكر |
| `order.empty` | السلة فاضية |
| `item.soldOut` | خلصت |
| `status.NEW` | جديد |
| `status.PREPARING` | يتحضّر |
| `status.READY` | جاهز |
| `status.SERVED` | انقدّم |
| `status.CANCELLED` | ملغي |
| `bill.paid` | مدفوع |
| `action.startPrep` | ابدأ التحضير |
| `action.markReady` | جاهز |
| `action.markServed` | تم التقديم |
| `action.cancelOrder` | إلغاء الطلب |
| `action.requestCancel` | طلب إلغاء |
| `action.removeItem` | حذف الصنف |
| `bill.discount` | خصم |
| `bill.discountReason` | سبب الخصم |
| `bill.pay` | تسديد |
| `bill.received` | المستلم |
| `bill.change` | الباقي |
| `bill.total` | المجموع |
| `bill.print` | طباعة الإيصال |
| `bill.share` | مشاركة |
| `shift.closed` | الشفت مغلق، كلّم الكاشير |
| `shift.open` | افتح الشفت |
| `shift.close` | أغلق الشفت |
| `shift.counted` | المبلغ الموجود بالصندوق |
| `empty.orders` | ماكو طلبات هسّه |
| `confirm.areYouSure` | متأكد؟ |
| `confirm.yes` | إي، أكمل |
| `confirm.no` | لا، ارجع |
| `error.generic` | صار خطأ، جرّب مرة ثانية |
| `error.noPermission` | ما عندك صلاحية |
| `sound.enable` | فعّل الصوت |
| `notify.orderReady` | طلبك جاهز — طاولة {table} |
| `notify.newOrder` | طلب جديد — {table} |
| `warn.unserved` | بعد في طلبات ما انقدمت — تكمل؟ |

> راجع النصوص مع العميل والموظفين فعلياً قبل التسليم؛ اللهجة تختلف بين محافظة وأخرى، وتُعدَّل من ملف واحد.

---

## 22. العروض الموقوتة (باقات بساعات)

باقة بسعر ثابت بنافذة ساعات يومية (`Asia/Baghdad`). تبقى ظاهرة للويتر دائماً وهي مفعّلة؛ خارج النافذة تُعرض مع وسم «غير متاح بعد الساعة…» ولا تُقبل في الطلب.

### النموذج
- `Offer`: اسم، سعر Int، `startMinute`/`endMinute` (0–1439)، `isActive`، و`menuItemId` فريد يربط بصنف منيو في تصنيف نظام **«العروض»**.
- `OfferComponent`: تسميات المحتويات للعرض فقط (`label` + `sortOrder`) — سطر الطلب يبقى **واحداً** (اسم العرض + سعر الباقة).
- لا عبور لمنتصف الليل في v1: يُشترط `startMinute < endMinute`.
- عند الإنشاء/التعديل: مزامنة `MenuItem.name/price/description`؛ عند الإيقاف: `MenuItem.isActive = false`.

### التشغيل
- المالك: `/owner/offers` + صلاحية `offers.manage` — Actions في `actions/offers.ts` مع AuditLog و`updateTag("menu")`.
- الويتر: قسم «العروض» أعلى المنيو (المفعّلة كلها). خارج الوقت: بطاقة ظاهرة وغير قابلة للطلب. السعر من الخادم عبر `addItemsToOrder` / `priceSnapshot`.
- إن انتهت النافذة والصنف ما زال في السلة: الخادم يرفض برسالة عربية.

---

**نهاية الدليل.** عند حسم أي بند من القسم 20، أخبرني لأحدّث الدليل (السكيما + الأقسام المتأثرة) قبل التنفيذ.
