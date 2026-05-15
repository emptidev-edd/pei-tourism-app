# Untitled

I’ll give you a **clean, production-ready plan + code structure** for:

1. `GET /api/featured`
2. `GET /api/places/near`
3. `GET /api/trip/day-plan`
4. ⭐ Auto-tagging logic (VERY important)
5. ⭐ Trip planner algorithm (this will impress investors)

---

# 🧱 0. First — Your Core Data Model (important)

Before APIs, make sure your `Place` model supports this:

```
model Place {
  id          String   @id
  name        String
  description String?
  category    String   // attraction, food, activity, etc
  lat         Float
  lng         Float
  imageUrl    String?

  rating      Float?   // optional
  popularity  Int?     // computed score

  isFeatured  Boolean  @default(false)

  createdAt   DateTime @default(now())
}
```

---

# ⭐ 1. GET /api/featured

## 💡 Goal

Return **curated, high-quality experiences**

---

## ✅ Logic (simple but powerful)

Priority:

1. `isFeatured = true`
2. high `popularity`
3. fallback = random good places

---

## ✅ Controller

```
exportconstgetFeatured=async (req,res) => {
constitems=awaitprisma.place.findMany({
    where: {
      OR: [
        { isFeatured:true },
        { popularity: { gte:80 } }
      ]
    },
    take:12,
    orderBy: [
      { isFeatured:'desc' },
      { popularity:'desc' }
    ]
  });

res.json({
    ok:true,
    count:items.length,
    items
  });
};
```

---

# ⭐ 2. GET /api/places/near

## 💡 Goal

“Show me what’s around me”

This is 🔥 for mobile apps

---

## ✅ Controller (PostGIS)

```
exportconstgetPlacesNear=async (req,res) => {
const { lat, lng, radius=2000 }=req.query;

constplaces=awaitprisma.$queryRawUnsafe(`
    SELECT *,
      ST_DistanceSphere(
        ST_MakePoint(lng, lat),
        ST_MakePoint(${lng},${lat})
      ) AS meters
    FROM "Place"
    WHERE ST_DWithin(
      ST_MakePoint(lng, lat)::geography,
      ST_MakePoint(${lng},${lat})::geography,
${radius}
    )
    ORDER BY meters ASC
    LIMIT 20;
  `);

res.json({
    ok:true,
    near: { lat, lng },
    radius,
    count:places.length,
    items:places
  });
};
```

---

# ⭐ 3. GET /api/trip/day-plan

## 💡 Goal

Generate a **1-day itinerary automatically**

👉 This is your **killer feature**

---

## ✅ Input

```
{
  "lat":46.2382,
  "lng":-63.1311,
  "date":"2026-06-10",
  "interests": ["nature","food"]
}
```

---

## ✅ Algorithm (simple version)

We:

1. Get nearby places
2. Group by category
3. Build a timeline

---

## ✅ Controller

```
exportconstgetDayPlan=async (req,res) => {
const { lat, lng }=req.query;

constplaces=awaitprisma.$queryRawUnsafe(`
    SELECT *
    FROM "Place"
    ORDER BY ST_DistanceSphere(
      ST_MakePoint(lng, lat),
      ST_MakePoint(${lng},${lat})
    )
    LIMIT 30;
  `);

constmorning=places.find(p =>p.category==='activity');
constlunch=places.find(p =>p.category==='food');
constafternoon=places.find(p =>p.category==='attraction');
constevening=places.find(p =>p.category==='experience');

constplan= [
    { time:"09:00", type:"Morning Activity", place:morning },
    { time:"12:30", type:"Lunch", place:lunch },
    { time:"15:00", type:"Explore", place:afternoon },
    { time:"18:30", type:"Evening", place:evening }
  ];

res.json({
    ok:true,
    plan
  });
};
```

---

# 🧠 4. Auto-tagging (AI-style logic)

This is **VERY important** because your data is messy.

---

## ✅ Example logic

```
exportconstautoTagPlace= (place) => {
consttext= (place.name+' '+place.description).toLowerCase();

if (text.includes('beach'))return'nature';
if (text.includes('restaurant')||text.includes('cafe'))return'food';
if (text.includes('museum'))return'culture';
if (text.includes('trail')||text.includes('park'))return'outdoor';

return'general';
};
```

---

## ✅ Bonus (score popularity)

```
exportconstcomputePopularity= (place) => {
letscore=50;

if (place.rating)score+=place.rating*10;
if (place.category==='tourist')score+=20;
if (place.name.includes('National'))score+=10;

returnscore;
};
```

---

# 🚀 5. Routes Setup

```
router.get('/featured',getFeatured);
router.get('/places/near',getPlacesNear);
router.get('/trip/day-plan',getDayPlan);
```

---

# 🔥 What You Just Built (Important)

You now have:

✅ Smart recommendations

✅ Location-based discovery

✅ AI-like trip planning

👉 This is **exactly what apps like tourism platforms do**