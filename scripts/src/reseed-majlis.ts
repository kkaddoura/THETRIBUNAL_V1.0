/**
 * Majlis full reset + reseed
 *
 * Run: DATABASE_URL=... MAJLIS_ENCRYPTION_KEY=... npx tsx scripts/src/reseed-majlis.ts
 *
 * Deletes ALL existing Majlis data (messages, members, channels, sessions, invites, users)
 * then creates fresh users, channels, and realistic conversations.
 */

import { db, profilesTable, majlisUsersTable, majlisInvitesTable, majlisChannelsTable, majlisChannelMembersTable, majlisMessagesTable, majlisSessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const TEST_PASSWORD_HASH = "$2b$10$9Eyw6/SRjGm7p45quUAtPOZa9jKSBqYA/fes.t/qBtZpDghcxNVyi"; // TestPass123!
const ENCRYPTION_KEY = process.env.MAJLIS_ENCRYPTION_KEY || "";

function encrypt(plaintext: string): string {
  if (!ENCRYPTION_KEY) return plaintext;
  const key = Buffer.from(ENCRYPTION_KEY, "hex");
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

const USERS = [
  { name: "Anis Harb", email: "qa-majlis@thetribunal.com", role: "Founder", company: "The Tribunal", country: "UAE", city: "Dubai" },
  { name: "Laith Zraikat", email: "laith@thetribunal.com", role: "CEO", company: "Zraikat Ventures", country: "Jordan", city: "Amman" },
  { name: "Nahla Atie", email: "nahla@thetribunal.com", role: "Managing Director", company: "Gulf Capital", country: "UAE", city: "Dubai" },
  { name: "Omar Hassan", email: "omar@thetribunal.com", role: "Partner", company: "STV", country: "Saudi Arabia", city: "Riyadh" },
  { name: "Sara Al-Khalil", email: "sara@thetribunal.com", role: "Co-Founder", company: "Maqsam", country: "Lebanon", city: "Beirut" },
  { name: "Youssef Tawfik", email: "youssef@thetribunal.com", role: "Head of AI", company: "Careem", country: "UAE", city: "Dubai" },
  { name: "Dina Ramadan", email: "dina@thetribunal.com", role: "Editor-in-Chief", company: "Wamda", country: "Egypt", city: "Cairo" },
  { name: "Khalid Al-Falih", email: "khalid@thetribunal.com", role: "VP Investments", company: "Mubadala", country: "UAE", city: "Abu Dhabi" },
];

async function main() {
  console.log("🗑️  Wiping all Majlis data...\n");

  // Delete in dependency order
  await db.delete(majlisMessagesTable);
  console.log("  ✓ Deleted all messages");
  await db.delete(majlisChannelMembersTable);
  console.log("  ✓ Deleted all channel members");
  await db.delete(majlisSessionsTable);
  console.log("  ✓ Deleted all sessions");
  await db.delete(majlisInvitesTable);
  console.log("  ✓ Deleted all invites");
  await db.delete(majlisChannelsTable);
  console.log("  ✓ Deleted all channels");
  await db.delete(majlisUsersTable);
  console.log("  ✓ Deleted all Majlis users");

  console.log("\n🌱 Creating fresh data...\n");

  // Create users
  const created: { id: number; profileId: number; name: string }[] = [];
  for (const u of USERS) {
    // Find or create profile
    let profileId: number;
    const [existingProfile] = await db.select({ id: profilesTable.id })
      .from(profilesTable)
      .where(eq(profilesTable.name, u.name))
      .limit(1);

    if (existingProfile) {
      profileId = existingProfile.id;
    } else {
      const [p] = await db.insert(profilesTable).values({
        name: u.name,
        headline: `${u.role} at ${u.company}`,
        role: u.role,
        company: u.company,
        sector: "Technology",
        country: u.country,
        city: u.city,
        summary: `${u.name} is a ${u.role} based in ${u.city}.`,
        story: `Building the future from ${u.country}.`,
        quote: "The MENA region is just getting started.",
        isVerified: true,
      }).returning();
      profileId = p.id;
    }

    const [majlisUser] = await db.insert(majlisUsersTable).values({
      profileId,
      email: u.email,
      passwordHash: TEST_PASSWORD_HASH,
      displayName: u.name,
    }).returning();

    created.push({ id: majlisUser.id, profileId, name: u.name });
    console.log(`  ✓ ${u.name} <${u.email}>`);
  }

  const [anis, laith, nahla, omar, sara, youssef, dina, khalid] = created;

  // Create channels
  const [general] = await db.insert(majlisChannelsTable).values({
    name: "General",
    type: "group",
    isDefault: true,
    createdBy: anis.id,
  }).returning();

  const [techChannel] = await db.insert(majlisChannelsTable).values({
    name: "Tech & AI",
    type: "group",
    createdBy: youssef.id,
  }).returning();

  const [dealFlow] = await db.insert(majlisChannelsTable).values({
    name: "Deal Flow",
    type: "group",
    createdBy: khalid.id,
  }).returning();

  const [mediaChannel] = await db.insert(majlisChannelsTable).values({
    name: "Media & Content",
    type: "group",
    createdBy: dina.id,
  }).returning();

  // Add members to channels
  for (const u of created) {
    await db.insert(majlisChannelMembersTable).values({ channelId: general.id, userId: u.id });
  }
  for (const u of [youssef, omar, laith, nahla, khalid]) {
    await db.insert(majlisChannelMembersTable).values({ channelId: techChannel.id, userId: u.id });
  }
  for (const u of [khalid, omar, nahla, laith, anis]) {
    await db.insert(majlisChannelMembersTable).values({ channelId: dealFlow.id, userId: u.id });
  }
  for (const u of [dina, sara, anis, nahla]) {
    await db.insert(majlisChannelMembersTable).values({ channelId: mediaChannel.id, userId: u.id });
  }

  console.log(`\n  ✓ Channels: General, Tech & AI, Deal Flow, Media & Content`);

  // Create DMs
  const [dm1] = await db.insert(majlisChannelsTable).values({
    name: `${anis.name},${laith.name}`,
    type: "dm",
    createdBy: anis.id,
  }).returning();
  await db.insert(majlisChannelMembersTable).values([
    { channelId: dm1.id, userId: anis.id },
    { channelId: dm1.id, userId: laith.id },
  ]);

  console.log(`  ✓ DM: Anis ↔ Laith`);

  // Seed messages
  async function msg(channelId: number, userId: number, content: string, delayMs = 0) {
    await db.insert(majlisMessagesTable).values({
      userId,
      channelId,
      content: encrypt(content),
      createdAt: new Date(Date.now() - delayMs),
    });
  }

  // ── General channel messages ──
  const h = 3600000; // 1 hour in ms
  await msg(general.id, anis.id, "السلام عليكم everyone — welcome to The Majlis. this is our private space for real talk", 48*h);
  await msg(general.id, laith.id, "glad this exists. twitter is noise, linkedin is performance. we need a place to be honest", 47*h);
  await msg(general.id, nahla.id, "100%. the conversations happening behind closed doors in MENA are way more interesting than what's public", 46*h);
  await msg(general.id, omar.id, "speaking of — anyone tracking what's happening with Saudi tech IPOs? the pipeline is insane rn", 45*h);
  await msg(general.id, khalid.id, "we're seeing 3-4 serious IPO candidates for Tadawul in the next 18 months. fintech and logistics leading", 44*h);
  await msg(general.id, sara.id, "lebanon's brain drain is accelerating though. every engineer i know has either left or is planning to", 43*h);
  await msg(general.id, youssef.id, "which is exactly why remote-first MENA companies have a massive advantage. you can hire lebanese talent from dubai", 42*h);
  await msg(general.id, dina.id, "the content creator economy in arabic is massively undervalued. we did a deep dive — the numbers are wild", 41*h);
  await msg(general.id, anis.id, `[share:debate:2|Should Gulf governments mandate AI literacy in school curricula by 2028?|67%|Technology]`, 40*h);
  await msg(general.id, omar.id, "voted yes. saudi already moving on this — new AI track in national curriculum launching Q3", 39*h);
  await msg(general.id, nahla.id, "UAE too. but mandating and actually executing are very different things in this region", 38*h);
  await msg(general.id, laith.id, "jordan just launched the national AI strategy. ambitious but the funding gap is real", 37*h);
  await msg(general.id, youssef.id, "the talent gap is bigger than the funding gap honestly. who's going to teach AI to teachers?", 36*h);
  await msg(general.id, dina.id, "this is why media matters. if we can make AI literacy content viral in arabic, that's the shortcut", 35*h);
  await msg(general.id, khalid.id, "agreed. the government approach is top-down. we need bottom-up content creators filling the gap", 34*h);
  await msg(general.id, sara.id, "maqsam is hiring AI engineers btw. if anyone knows good candidates, DM me", 33*h);
  await msg(general.id, anis.id, "the predictions market on the platform is getting interesting. crowd intelligence > individual punditry", 20*h);
  await msg(general.id, omar.id, `[share:prediction:1|Saudi Arabia's non-oil GDP will exceed 50% of total GDP by end of 2026|62% Yes|Economy]`, 19*h);
  await msg(general.id, khalid.id, "that prediction is aggressive but not impossible. the diversification numbers are real", 18*h);
  await msg(general.id, nahla.id, "entertainment sector alone is adding tens of billions. tourism too. it's not just oil anymore", 17*h);
  await msg(general.id, laith.id, "from amman, watching saudi transform is surreal. they're executing at a pace no one expected", 16*h);
  await msg(general.id, youssef.id, "speed of execution is MENA's superpower and biggest risk at the same time", 15*h);
  await msg(general.id, dina.id, "the stories coming out of neom alone... some incredible, some terrifying", 14*h);
  await msg(general.id, sara.id, "anyone else concerned about the sustainability of all this spending?", 13*h);
  await msg(general.id, khalid.id, "sovereign wealth is deep but not infinite. the bet is that these investments create self-sustaining ecosystems", 12*h);
  await msg(general.id, anis.id, "that's literally what The Tribunal is tracking. the pulse data on this is fascinating", 11*h);
  await msg(general.id, omar.id, "the pulse section is underrated. those trend cards are basically a real-time x-ray of the region", 10*h);
  await msg(general.id, nahla.id, "the press freedom stats are uncomfortable but necessary. 17 of 19 not free. we need to talk about it", 9*h);
  await msg(general.id, laith.id, "that's exactly what this space is for. honest conversations that can't happen on public platforms", 8*h);
  await msg(general.id, anis.id, "good discussion everyone. this is why we built The Majlis 🙏", 7*h);

  // ── Tech & AI channel ──
  await msg(techChannel.id, youssef.id, "alright tech crew — claude 4 just dropped. anyone tested it on arabic NLP tasks yet?", 30*h);
  await msg(techChannel.id, omar.id, "we ran benchmarks at STV portfolio companies. arabic comprehension is significantly better than GPT-4o", 29*h);
  await msg(techChannel.id, khalid.id, "mubadala AI lab is doing interesting work on arabic LLMs. not public yet but the results are promising", 28*h);
  await msg(techChannel.id, laith.id, "the real question is who builds the arabic foundation model. jais was first but the race is on", 27*h);
  await msg(techChannel.id, youssef.id, "careem is using AI for demand prediction now. reduced ETAs by 23% in riyadh. game changer", 26*h);
  await msg(techChannel.id, nahla.id, "our portfolio company just closed a $12M round for arabic voice AI. the enterprise demand is real", 25*h);
  await msg(techChannel.id, omar.id, "who's going to leap day? we're sponsoring the AI track", 24*h);
  await msg(techChannel.id, youssef.id, "wouldn't miss it. doing a talk on production ML in MENA — the infra challenges no one talks about", 23*h);
  await msg(techChannel.id, khalid.id, "the GPU shortage is hitting MENA harder than the west. cloud capacity in the region is still thin", 22*h);
  await msg(techChannel.id, laith.id, "aws just announced the jordan region though. that changes the game for us", 21*h);

  // ── Deal Flow channel ──
  await msg(dealFlow.id, khalid.id, "Q2 deal flow update: we saw 47 decks this month. fintech still #1, healthtech rising fast", 36*h);
  await msg(dealFlow.id, omar.id, "stv similar. also seeing a spike in climate tech from the region. saudi green initiative creating demand", 35*h);
  await msg(dealFlow.id, nahla.id, "valuations are finally correcting. 2021 multiples are dead. founders are accepting it", 34*h);
  await msg(dealFlow.id, laith.id, "the best founders in jordan are raising at 8-12x revenue now. much healthier", 33*h);
  await msg(dealFlow.id, anis.id, "any of you looking at creator economy startups? the arabic content space is about to explode", 32*h);
  await msg(dealFlow.id, khalid.id, "we passed on three. the monetization models aren't clear yet for arabic-first platforms", 31*h);
  await msg(dealFlow.id, omar.id, "disagree actually. the ad spend shifting to digital in saudi alone is $2B+ this year", 30*h);
  await msg(dealFlow.id, nahla.id, "the issue isn't ad spend, it's measurement. attribution in MENA digital is still messy", 29*h);
  await msg(dealFlow.id, laith.id, "agreed with nahla. the infra layer needs to be built first. that's where the real opportunity is", 28*h);

  // ── Media & Content channel ──
  await msg(mediaChannel.id, dina.id, "team — working on a piece about MENA's digital media revolution. need quotes from everyone", 20*h);
  await msg(mediaChannel.id, sara.id, "happy to contribute. the lebanese diaspora media angle is under-reported", 19*h);
  await msg(mediaChannel.id, nahla.id, "the shift from print to digital in GCC happened in 3 years. europe took 15", 18*h);
  await msg(mediaChannel.id, anis.id, "the tribunal is proof that independent digital media can work in MENA without state backing", 17*h);
  await msg(mediaChannel.id, dina.id, "exactly. and the appetite for honest data-driven content is huge. our engagement numbers prove it", 16*h);
  await msg(mediaChannel.id, sara.id, "the challenge is sustainability. most independent MENA media outlets rely on grants", 15*h);
  await msg(mediaChannel.id, nahla.id, "or they get acquired. which usually means editorial compromise", 14*h);
  await msg(mediaChannel.id, anis.id, "that's why we built the debate/prediction model. user engagement funds the platform, not sponsors", 13*h);

  // ── DM messages ──
  await msg(dm1.id, anis.id, "hey — the platform metrics this week are crazy. 40% increase in prediction votes", 10*h);
  await msg(dm1.id, laith.id, "saw that. the jordan traffic spike is interesting. something went viral?", 9*h);
  await msg(dm1.id, anis.id, "the water crisis prediction got shared on arabic twitter. 200k impressions in 24h", 8*h);
  await msg(dm1.id, laith.id, "that's the flywheel working. controversial predictions → shares → new users → more predictions", 7*h);
  await msg(dm1.id, anis.id, "exactly. we need to double down on the prediction categories that drive shares", 6*h);
  await msg(dm1.id, laith.id, "geopolitics and economy. those two categories get 3x the share rate of everything else", 5*h);

  // Create invite codes
  const invitees = [
    { name: "Test User Alpha", email: "alpha@thetribunal.com" },
    { name: "Test User Beta", email: "beta@thetribunal.com" },
  ];

  console.log("\n  📬 Invite codes:");
  for (const inv of invitees) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.randomBytes(12);
    let code = "";
    for (let i = 0; i < 12; i++) code += chars[bytes[i] % chars.length];

    let profileId: number;
    const [ep] = await db.select({ id: profilesTable.id })
      .from(profilesTable).where(eq(profilesTable.name, inv.name)).limit(1);
    if (ep) {
      profileId = ep.id;
    } else {
      const [p] = await db.insert(profilesTable).values({
        name: inv.name, headline: "Invited Member", role: "Member", company: "N/A",
        sector: "Technology", country: "UAE", city: "Dubai",
        summary: "Invited test member.", story: ".", quote: ".", isVerified: true,
      }).returning();
      profileId = p.id;
    }

    await db.insert(majlisInvitesTable).values({
      profileId,
      email: inv.email,
      token: code,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    console.log(`  ✓ ${inv.email} → CODE: ${code}`);
  }

  console.log("\n" + "─".repeat(60));
  console.log("✅ Majlis reseed complete!\n");
  console.log("LOGIN CREDENTIALS (all use password: TestPass123!):\n");
  for (const u of USERS) {
    console.log(`  ${u.name}: ${u.email}`);
  }
  console.log("\n─".repeat(60));

  process.exit(0);
}

main().catch(err => { console.error("Reseed failed:", err); process.exit(1); });
