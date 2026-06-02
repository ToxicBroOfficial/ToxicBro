# 🚀 Deployment Step-by-Step Guide (Bengali/English)

## প্রথম - GitHub Secrets Setup করুন

### Step 1: GitHub Repository-তে যান
```
1. ব্রাউজার খুলুন
2. এখানে যান: https://github.com/ISTIAKAHMEDBELAYET/ToxicBro
```

### Step 2: Settings Tab খুলুন
```
আপনার repo page-এ:
├─ উপরে দেখবেন এই tabs: Code | Issues | Pull requests | Discussions | Settings
└─ "Settings" tab-এ ক্লিক করুন
```

### Step 3: Secrets Menu খুলুন
```
Settings page-এ বাম পাশে (Left sidebar) এই মেনু দেখবেন:
├─ General
├─ Collaborators
├─ Branches
├─ Code and automation (এটা expand করুন)
│  └─ Secrets and variables
│     └─ "Actions" এ ক্লিক করুন ← এখানে যান!
└─ অন্যান্য options...
```

### Step 4: প্রথম Secret যোগ করুন (YOUTUBE_API_KEY)
```
"Secrets and variables > Actions" page-এ:

1. Green button দেখবেন: "New repository secret"
   └─ এটা ক্লিক করুন

2. আপনি এই form দেখবেন:
   
   Name:  [ YOUTUBE_API_KEY                ]
   Secret: [ আপনার API Key paste করুন    ]

3. কোথা থেকে API Key পাবেন?
   - Google Cloud Console থেকে (আগে তৈরি করেছেন)
   - API Key মনে থাকলে paste করুন
   - নাহলে Google Cloud তে তৈরি করুন

4. Secret paste করার পর:
   └─ Green button "Add secret" ক্লিক করুন
```

### Step 5: দ্বিতীয় Secret যোগ করুন (YOUTUBE_API_KEY_FALLBACK)
```
একই process repeat করুন:

1. আবার "New repository secret" ক্লিক করুন

2. এই তথ্য fill করুন:
   
   Name:  [ YOUTUBE_API_KEY_FALLBACK      ]
   Secret: [ আপনার Backup API Key paste  ]

3. আপনার কাছে যদি দুটো API Key থাকে তাহলে এখানে paste করুন
   না থাকলে একই Key paste করতে পারেন (কোনো সমস্যা নেই)

4. "Add secret" ক্লিক করুন

✅ এখন দুটো Secrets তৈরি হয়ে গেছে:
   ├─ YOUTUBE_API_KEY
   └─ YOUTUBE_API_KEY_FALLBACK
```

---

## দ্বিতীয় - GitHub Actions Workflow চালান (Run করুন)

### Step 6: Actions Tab খুলুন
```
আপনার repo main page-এ:

1. উপরের tabs-এ "Actions" খুঁজুন
   └─ "Code | Issues | Pull requests | Actions | Settings"

2. "Actions" tab ক্লিক করুন
```

### Step 7: Workflow বেছে নিন
```
Actions page খুলার পর:

1. বাম পাশে (Left side) দেখবেন workflows list:
   ├─ "Update YouTube Data" ← এটাই আমাদের workflow!
   └─ অন্যান্য workflows

2. "Update YouTube Data" ক্লিক করুন
```

### Step 8: Workflow Run করুন (প্রথমবার Manual Trigger)
```
"Update YouTube Data" workflow page-এ:

1. আপনি দেখবেন: "This workflow has a workflow_dispatch trigger"
   এবং একটি button যা বলে: "Run workflow" বা "Click here to run"

2. Green button "Run workflow" ক্লিক করুন
   (অথবা dropdown থাকলে সেখান থেকে select করুন)

3. একটি dialog আসবে:
   
   Branch: main (default থাকবে)
   
4. Green button "Run workflow" ক্লিক করুন (confirm করতে)

✅ Workflow শুরু হবে!
```

### Step 9: Logs দেখুন (কাজ হচ্ছে কিনা বুঝতে)
```
Workflow শুরু হলে:

1. একটি নতুন run দেখবেন yellow/blue state-এ:
   "Update YouTube Data #1  in progress"

2. এটার উপর ক্লিক করুন

3. একটি job page খুলবে:
   └─ "fetch-data" job দেখবেন

4. "fetch-data" ক্লিক করুন

5. Logs দেখতে পাবেন যেখানে লেখা থাকবে:

   ✅ Channel stats fetched: 1.23M subscribers
   ✅ RSS check successful - latest video ID: xyz789
   🎥 STEP 3: Fetching full video details (new video detected)...
   ✅ Saved: videos.json
   ✅ Saved: channel.json
   ✅ Saved: .github/scripts/state.json
   
   Files to commit: 3 file(s)
   Files to commit: videos.json, channel.json, .github/scripts/state.json
   
   ✅ Changes pushed successfully!

6. যখন সব সবুজ (✅) দেখবেন = সফল হয়েছে!
```

### Step 10: Git Commit হয়েছে কিনা Check করুন
```
Workflow complete হওয়ার পর:

1. আপনার repo-তে যান (GitHub.com/ISTIAKAHMEDBELAYET/ToxicBro)

2. Main page-এ কমিট history দেখুন

3. সবচেয়ে recent commit-এ দেখবেন:
   "🤖 Auto-update: New video + updated stats"

4. সেই commit-এ ক্লিক করুন

5. এই files modified দেখবেন:
   ├─ videos.json (50টা video)
   ├─ channel.json (subscriber count)
   └─ .github/scripts/state.json (state)

✅ সবকিছু ঠিকঠাক!
```

---

## তৃতীয় - Website-এ Check করুন

### Step 11: আপনার Website খুলুন
```
1. Browser খুলুন

2. আপনার website-এর main URL খুলুন:
   (যেখানে index.html deploy করা আছে)

3. Page hard refresh করুন:
   └─ Windows: Ctrl + Shift + R
   └─ Mac: Cmd + Shift + R
   (Normal refresh নয়, hard refresh করতে হবে!)
```

### Step 12: Data Verify করুন
```
Website refresh হওয়ার পর এই জিনিসগুলো check করুন:

✅ Subscriber Count (সাবস্ক্রাইবার সংখ্যা)
   └─ দেখা যাচ্ছে কিনা? (যেমন: 1.23M)

✅ Goal Progress Bar
   └─ Progress bar show হচ্ছে কিনা?
   └─ Percentage ঠিক আছে কিনা?

✅ Latest Videos Grid
   └─ 9টা video দেখা যাচ্ছে কিনা?
   └─ প্রতিটার title, views, date show হচ্ছে কিনা?

✅ Featured Video (যদি থাকে)
   └─ Latest video pinned আছে কিনা?

যদি সবকিছু show হয় = ✅ সফল!
যদি কিছু না দেখা যায় = Check করুন console error (F12 দিয়ে)
```

---

## চতুর্থ - Automatic Schedule এখন Active (প্রতি ঘণ্টায় চলবে)

### Step 13: সিস্টেম এখন Automatic চলছে
```
এখন আর কিছু করার নেই!

System এখন automatic ভাবে:

1. প্রতি ঘণ্টায় চলবে (00 মিনিটে)
   └─ যেমন: 12:00, 13:00, 14:00, 15:00, ইত্যাদি

2. প্রতিবার:
   └─ YouTube stats fetch করবে (সর্বদা)
   └─ নতুন video check করবে (RSS feed থেকে)
   └─ নতুন video পেলে API call করবে (১টা call সাশ্রয়)
   └─ JSON files update করবে
   └─ Git commit করবে (শুধু পরিবর্তন থাকলে)
   └─ Cloudflare auto-deploy করবে
   └─ Website update হবে

3. Monitoring:
   └─ GitHub Actions tab-এ নতুন runs দেখবেন
   └─ প্রতিটি run logs check করতে পারবেন
```

---

## পাঁচম - Manual Testing (Optional - শিখার জন্য)

### Step 14: দ্বিতীয়বার Manual Run করুন (পরীক্ষা)
```
যদি সিস্টেম ঠিক মতো কাজ করছে কিনা বুঝতে চান:

1. আবার GitHub Actions-এ যান

2. "Update YouTube Data" workflow-এ যান

3. "Run workflow" ক্লিক করুন

4. এবার logs-এ এক্সপেক্ট করবেন:

   ✅ Channel stats fetched
   ❌ New video detected: NO (কারণ নতুন video হয়নি)
   
   Files to commit: 0 file(s)
   
   ✅ No changes detected - skipping commit & deploy

এটা ঠিক! কারণ কোনো নতুন video নেই, তাই deploy হয়নি।
```

---

## সমস্যা সমাধান (Troubleshooting)

### সমস্যা 1: "Workflow failed - API key not found"
```
সমাধান:
1. GitHub Settings > Secrets > Actions যান
2. YOUTUBE_API_KEY এবং YOUTUBE_API_KEY_FALLBACK আছে কিনা check করুন
3. দুটোই থাকা দরকার
4. যদি না থাকে, Step 4-5 follow করে again যোগ করুন
```

### সমস্যা 2: "Website দেখা যাচ্ছে না / খালি আছে"
```
সমাধান:
1. Hard refresh করুন (Ctrl+Shift+R)
2. Browser console খুলুন (F12)
3. Errors দেখুন console-এ
4. যদি "videos.json not found" বলে:
   └─ Workflow কাজ করেনি
   └─ Logs check করুন
5. যদি "CORS error" বলে:
   └─ Cloudflare settings check করুন
```

### সমস্যা 3: "Workflow runs but nothing commits"
```
সমাধান:
1. Logs-এ দেখুন কী ম্যাসেজ আছে
2. যদি "No changes detected" বলে = এটা ঠিক!
   └─ নতুন video নেই তাই commit হয়নি
3. যদি API error থাকে:
   └─ API key ঠিক আছে কিনা check করুন
   └─ YouTube API quota ভাঙা হয়নি কিনা check করুন
```

### সমস্যা 4: "state.json or videos.json not updating"
```
সমাধান:
1. RSS feed কাজ করছে কিনা check করুন:
   └─ https://www.youtube.com/feeds/videos.xml?channel_id=UCXG8sste5hX3P26gWayrlkg
   └─ ব্রাউজারে খুলুন, নতুন video আছে কিনা দেখুন
2. যদি RSS কাজ করছে:
   └─ Workflow logs check করুন "RSS check successful" লাইন-এ
3. যদি RSS নেই:
   └─ GitHub repository যান
   └─ Commits tab-এ দেখুন state.json কখন last update হয়েছে
```

---

## ✅ Complete Checklist

আপনি সফল হয়েছেন যখন এই সবকিছু complete হবে:

- [ ] ✅ GitHub Secrets যোগ করেছেন (YOUTUBE_API_KEY)
- [ ] ✅ GitHub Secrets যোগ করেছেন (YOUTUBE_API_KEY_FALLBACK)
- [ ] ✅ First workflow manually run করেছেন
- [ ] ✅ Workflow logs-এ ✅ দেখেছেন
- [ ] ✅ GitHub repo-তে commit দেখেছেন
- [ ] ✅ Website refresh করেছেন
- [ ] ✅ Website-এ subscriber count দেখেছেন
- [ ] ✅ Website-এ videos দেখেছেন
- [ ] ✅ পরের ঘণ্টায় automatic run হয়েছে
- [ ] ✅ Logs-এ "No changes detected" দেখেছেন (নরমাল - নতুন video নেই)

---

## 🎉 এখন আপনি Done!

সিস্টেম এখন:
- ✅ প্রতি ঘণ্টায় automatic চলবে
- ✅ YouTube data fetch করবে
- ✅ নতুন video detect করবে (বিনামূল্যে RSS দিয়ে)
- ✅ শুধুমাত্র প্রয়োজনে API call করবে (45% quota সাশ্রয়)
- ✅ শুধুমাত্র পরিবর্তন থাকলে commit করবে (70% কম commits)
- ✅ Website auto-update হবে

**কোনো আর manual কাজ নেই!** 🚀

---

## 📞 যদি সমস্যা হয়

যেকোনো সমস্যায়:

1. GitHub Actions logs check করুন সবার আগে
2. Error message পড়ুন ভালোভাবে
3. Console error check করুন (F12)
4. এই guide-এ troubleshooting section দেখুন

Happy deploying! 🎊

