import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db, majlisUsersTable, majlisMessagesTable, majlisInvitesTable, majlisChannelsTable, majlisChannelMembersTable, majlisSessionsTable, profilesTable, pollsTable, pollOptionsTable, predictionsTable } from "@workspace/db";
import { eq, desc, lt, sql, and, count, isNull, or, inArray } from "drizzle-orm";
import { cmsSessions } from "./cms";
import { encrypt, decrypt } from "../utils/encryption";

const router = Router();

interface MajlisRequest extends Request {
  majlisUserId?: number;
}

interface MajlisUserUpdate {
  isActive?: boolean;
  isBanned?: boolean;
  isMuted?: boolean;
}

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

async function createMajlisSession(userId: number): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.insert(majlisSessionsTable).values({ token, userId, expiresAt });
  return token;
}

async function invalidateMajlisUserSessions(userId: number): Promise<void> {
  await db.delete(majlisSessionsTable).where(eq(majlisSessionsTable.userId, userId));
}

function requireCmsAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers["x-cms-token"] as string;
  if (!token || !cmsSessions.has(token)) {
    return res.status(401).json({ error: "Unauthorized — CMS authentication required" });
  }
  const session = cmsSessions.get(token)!;
  if (Date.now() - session.createdAt > 24 * 60 * 60 * 1000) {
    cmsSessions.delete(token);
    return res.status(401).json({ error: "Session expired" });
  }
  return next();
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = crypto.randomBytes(12);
  for (let i = 0; i < 12; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

async function requireMajlisAuth(req: MajlisRequest, res: Response, next: NextFunction) {
  const token = req.headers["x-majlis-token"] as string;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const [session] = await db.select().from(majlisSessionsTable)
    .where(eq(majlisSessionsTable.token, token))
    .limit(1);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (new Date(session.expiresAt) < new Date()) {
    await db.delete(majlisSessionsTable).where(eq(majlisSessionsTable.token, token));
    return res.status(401).json({ error: "Session expired" });
  }

  const [dbUser] = await db.select().from(majlisUsersTable)
    .where(eq(majlisUsersTable.id, session.userId))
    .limit(1);

  if (!dbUser || !dbUser.isActive || dbUser.isBanned) {
    await db.delete(majlisSessionsTable).where(eq(majlisSessionsTable.token, token));
    return res.status(403).json({ error: dbUser?.isBanned ? "Your account has been suspended" : "Your account is no longer active" });
  }

  req.majlisUserId = session.userId;
  return next();
}

async function ensureGeneralChannel(): Promise<number> {
  const [existing] = await db.select().from(majlisChannelsTable)
    .where(and(eq(majlisChannelsTable.isDefault, true), eq(majlisChannelsTable.type, "group")))
    .limit(1);

  if (existing) return existing.id;

  const [channel] = await db.insert(majlisChannelsTable).values({
    name: "General",
    type: "group",
    isDefault: true,
  }).returning();

  const allUsers = await db.select({ id: majlisUsersTable.id }).from(majlisUsersTable)
    .where(and(eq(majlisUsersTable.isActive, true), eq(majlisUsersTable.isBanned, false)));

  if (allUsers.length > 0) {
    await db.insert(majlisChannelMembersTable).values(
      allUsers.map(u => ({ channelId: channel.id, userId: u.id }))
    );
  }

  await db.update(majlisMessagesTable)
    .set({ channelId: channel.id })
    .where(isNull(majlisMessagesTable.channelId));

  return channel.id;
}

async function ensureUserInGeneralChannel(userId: number) {
  const generalId = await ensureGeneralChannel();
  const [existing] = await db.select().from(majlisChannelMembersTable)
    .where(and(
      eq(majlisChannelMembersTable.channelId, generalId),
      eq(majlisChannelMembersTable.userId, userId)
    ))
    .limit(1);

  if (!existing) {
    await db.insert(majlisChannelMembersTable).values({ channelId: generalId, userId });
  }
}

router.post("/majlis/auth/register", async (req: Request, res: Response) => {
  try {
    const { email, password, inviteToken } = req.body;
    if (!email || !password || !inviteToken) {
      return res.status(400).json({ error: "Email, password, and invite code are required" });
    }

    const [invite] = await db.select().from(majlisInvitesTable)
      .where(eq(majlisInvitesTable.token, inviteToken))
      .limit(1);

    if (!invite) {
      return res.status(403).json({ error: "Invalid invite code" });
    }
    if (invite.isUsed) {
      return res.status(403).json({ error: "This invite has already been used" });
    }
    if (new Date(invite.expiresAt) < new Date()) {
      return res.status(403).json({ error: "This invite has expired" });
    }
    if (invite.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ error: "Email does not match the invite" });
    }

    const [profile] = await db.select().from(profilesTable)
      .where(eq(profilesTable.id, invite.profileId))
      .limit(1);
    if (!profile) {
      return res.status(403).json({ error: "Associated profile not found" });
    }
    if (!profile.isVerified) {
      return res.status(403).json({ error: "Only verified Voices can register for The Gallery" });
    }

    const existingByProfile = await db.select().from(majlisUsersTable)
      .where(eq(majlisUsersTable.profileId, invite.profileId))
      .limit(1);
    if (existingByProfile.length > 0) {
      return res.status(409).json({ error: "This Voice profile already has a Gallery account" });
    }

    const existingByEmail = await db.select().from(majlisUsersTable)
      .where(eq(majlisUsersTable.email, email))
      .limit(1);
    if (existingByEmail.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const [user] = await db.insert(majlisUsersTable).values({
      profileId: invite.profileId,
      email,
      passwordHash: await hashPassword(password),
      displayName: profile.name,
    }).returning();

    await db.update(majlisInvitesTable)
      .set({ isUsed: true })
      .where(eq(majlisInvitesTable.id, invite.id));

    await ensureUserInGeneralChannel(user.id);

    const token = await createMajlisSession(user.id);

    return res.json({ token, user: { id: user.id, displayName: user.displayName, email: user.email } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Registration failed";
    return res.status(500).json({ error: message });
  }
});

router.post("/majlis/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const [user] = await db.select().from(majlisUsersTable)
      .where(eq(majlisUsersTable.email, email))
      .limit(1);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    if (user.isBanned) {
      return res.status(403).json({ error: "Your account has been suspended" });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: "Your account is not active" });
    }

    await db.update(majlisUsersTable)
      .set({ lastSeenAt: new Date() })
      .where(eq(majlisUsersTable.id, user.id));

    await ensureUserInGeneralChannel(user.id);

    const token = await createMajlisSession(user.id);

    const [profile] = await db.select().from(profilesTable)
      .where(eq(profilesTable.id, user.profileId))
      .limit(1);

    return res.json({
      token,
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        profileId: user.profileId,
        profile: profile
          ? { name: profile.name, role: profile.role, company: profile.company, imageUrl: profile.imageUrl, isVerified: profile.isVerified }
          : null,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Login failed";
    return res.status(500).json({ error: message });
  }
});

router.post("/majlis/auth/verify", requireMajlisAuth, async (req: MajlisRequest, res: Response) => {
  try {
    const userId = req.majlisUserId!;
    const [user] = await db.select().from(majlisUsersTable)
      .where(eq(majlisUsersTable.id, userId))
      .limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.isBanned) {
      return res.status(403).json({ error: "Your account has been suspended" });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: "Your account is not active" });
    }

    const [profile] = await db.select().from(profilesTable)
      .where(eq(profilesTable.id, user.profileId))
      .limit(1);

    return res.json({
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        profileId: user.profileId,
        profile: profile
          ? { name: profile.name, role: profile.role, company: profile.company, imageUrl: profile.imageUrl, isVerified: profile.isVerified }
          : null,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Verification failed";
    return res.status(500).json({ error: message });
  }
});

router.post("/majlis/channels", requireMajlisAuth, async (req: MajlisRequest, res: Response) => {
  try {
    const userId = req.majlisUserId!;
    const { name, type, memberIds } = req.body;
    const channelType = type === "dm" ? "dm" : "group";

    if (channelType === "dm") {
      if (!memberIds || !Array.isArray(memberIds) || memberIds.length !== 1) {
        return res.status(400).json({ error: "DM requires exactly one other member" });
      }
      const otherId = memberIds[0] as number;
      if (otherId === userId) {
        return res.status(400).json({ error: "Cannot DM yourself" });
      }

      const existingDms = await db.select({ channelId: majlisChannelMembersTable.channelId })
        .from(majlisChannelMembersTable)
        .innerJoin(majlisChannelsTable, eq(majlisChannelMembersTable.channelId, majlisChannelsTable.id))
        .where(and(
          eq(majlisChannelMembersTable.userId, userId),
          eq(majlisChannelsTable.type, "dm")
        ));

      if (existingDms.length > 0) {
        const dmChannelIds = existingDms.map(d => d.channelId);
        const otherInDm = await db.select({ channelId: majlisChannelMembersTable.channelId })
          .from(majlisChannelMembersTable)
          .where(and(
            inArray(majlisChannelMembersTable.channelId, dmChannelIds),
            eq(majlisChannelMembersTable.userId, otherId)
          ));

        if (otherInDm.length > 0) {
          const existingChannelId = otherInDm[0].channelId;
          const [channel] = await db.select().from(majlisChannelsTable)
            .where(eq(majlisChannelsTable.id, existingChannelId)).limit(1);
          return res.json({ channel, created: false });
        }
      }

      const [otherUser] = await db.select().from(majlisUsersTable)
        .where(eq(majlisUsersTable.id, otherId)).limit(1);
      if (!otherUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const [currentUser] = await db.select().from(majlisUsersTable)
        .where(eq(majlisUsersTable.id, userId)).limit(1);

      const dmName = `${currentUser!.displayName},${otherUser.displayName}`;
      const [channel] = await db.insert(majlisChannelsTable).values({
        name: dmName,
        type: "dm",
        createdBy: userId,
      }).returning();

      await db.insert(majlisChannelMembersTable).values([
        { channelId: channel.id, userId },
        { channelId: channel.id, userId: otherId },
      ]);

      return res.json({ channel, created: true });
    }

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "Channel name is required" });
    }

    const [channel] = await db.insert(majlisChannelsTable).values({
      name: name.trim(),
      type: "group",
      createdBy: userId,
    }).returning();

    const membersToAdd = [userId];
    if (memberIds && Array.isArray(memberIds)) {
      for (const mid of memberIds) {
        if (typeof mid === "number" && mid !== userId) membersToAdd.push(mid);
      }
    }

    await db.insert(majlisChannelMembersTable).values(
      membersToAdd.map(uid => ({ channelId: channel.id, userId: uid }))
    );

    return res.json({ channel, created: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create channel";
    return res.status(500).json({ error: message });
  }
});

router.get("/majlis/channels", requireMajlisAuth, async (req: MajlisRequest, res: Response) => {
  try {
    const userId = req.majlisUserId!;

    await ensureUserInGeneralChannel(userId);

    const memberships = await db.select({ channelId: majlisChannelMembersTable.channelId, lastReadMessageId: majlisChannelMembersTable.lastReadMessageId })
      .from(majlisChannelMembersTable)
      .where(eq(majlisChannelMembersTable.userId, userId));

    if (memberships.length === 0) {
      return res.json({ channels: [] });
    }

    const channelIds = memberships.map(m => m.channelId);
    const channels = await db.select().from(majlisChannelsTable)
      .where(inArray(majlisChannelsTable.id, channelIds));

    const channelsWithMeta = await Promise.all(channels.map(async (ch) => {
      const membership = memberships.find(m => m.channelId === ch.id);
      const lastReadId = membership?.lastReadMessageId ?? 0;

      const [lastMsg] = await db.select({
        id: majlisMessagesTable.id,
        content: majlisMessagesTable.content,
        createdAt: majlisMessagesTable.createdAt,
        userName: majlisUsersTable.displayName,
      })
        .from(majlisMessagesTable)
        .innerJoin(majlisUsersTable, eq(majlisMessagesTable.userId, majlisUsersTable.id))
        .where(and(
          or(eq(majlisMessagesTable.channelId, ch.id), and(isNull(majlisMessagesTable.channelId), eq(majlisChannelsTable.isDefault, true) ? sql`true` : sql`false`)),
          eq(majlisMessagesTable.isDeleted, false)
        ))
        .orderBy(desc(majlisMessagesTable.id))
        .limit(1);

      const [{ unread }] = await db.select({ unread: count() })
        .from(majlisMessagesTable)
        .where(and(
          eq(majlisMessagesTable.channelId, ch.id),
          eq(majlisMessagesTable.isDeleted, false),
          sql`${majlisMessagesTable.id} > ${lastReadId}`
        ));

      let displayName = ch.name;
      if (ch.type === "dm") {
        const dmMembers = await db.select({ displayName: majlisUsersTable.displayName })
          .from(majlisChannelMembersTable)
          .innerJoin(majlisUsersTable, eq(majlisChannelMembersTable.userId, majlisUsersTable.id))
          .where(and(
            eq(majlisChannelMembersTable.channelId, ch.id),
            sql`${majlisChannelMembersTable.userId} != ${userId}`
          ));
        if (dmMembers.length > 0) {
          displayName = dmMembers[0].displayName;
        }
      }

      let lastMessagePreview = null;
      if (lastMsg) {
        let content = lastMsg.content;
        try { content = decrypt(content); } catch {}
        lastMessagePreview = {
          content: content.length > 50 ? content.slice(0, 50) + "..." : content,
          userName: lastMsg.userName,
          createdAt: lastMsg.createdAt,
        };
      }

      return {
        ...ch,
        displayName,
        lastMessage: lastMessagePreview,
        unreadCount: Number(unread),
      };
    }));

    channelsWithMeta.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime();
      return bTime - aTime;
    });

    return res.json({ channels: channelsWithMeta });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch channels";
    return res.status(500).json({ error: message });
  }
});

router.get("/majlis/channels/:id", requireMajlisAuth, async (req: MajlisRequest, res: Response) => {
  try {
    const channelId = parseInt(req.params.id as string);
    const [channel] = await db.select().from(majlisChannelsTable)
      .where(eq(majlisChannelsTable.id, channelId)).limit(1);
    if (!channel) return res.status(404).json({ error: "Channel not found" });

    const members = await db.select({
      id: majlisUsersTable.id,
      displayName: majlisUsersTable.displayName,
      profileId: majlisUsersTable.profileId,
      profileName: profilesTable.name,
      profileRole: profilesTable.role,
      profileImage: profilesTable.imageUrl,
      profileVerified: profilesTable.isVerified,
    })
      .from(majlisChannelMembersTable)
      .innerJoin(majlisUsersTable, eq(majlisChannelMembersTable.userId, majlisUsersTable.id))
      .innerJoin(profilesTable, eq(majlisUsersTable.profileId, profilesTable.id))
      .where(eq(majlisChannelMembersTable.channelId, channelId));

    return res.json({ channel, members });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch channel";
    return res.status(500).json({ error: message });
  }
});

router.post("/majlis/channels/:id/members", requireMajlisAuth, async (req: MajlisRequest, res: Response) => {
  try {
    const channelId = parseInt(req.params.id as string);
    const userId = req.majlisUserId!;
    const { memberIds } = req.body;

    const [channel] = await db.select().from(majlisChannelsTable)
      .where(eq(majlisChannelsTable.id, channelId)).limit(1);
    if (!channel) return res.status(404).json({ error: "Channel not found" });

    if (channel.type === "dm") {
      return res.status(400).json({ error: "Cannot add members to a DM" });
    }

    if (channel.createdBy !== userId && !channel.isDefault) {
      return res.status(403).json({ error: "Only the channel creator can add members" });
    }

    if (!memberIds || !Array.isArray(memberIds)) {
      return res.status(400).json({ error: "memberIds array is required" });
    }

    const existingMembers = await db.select({ userId: majlisChannelMembersTable.userId })
      .from(majlisChannelMembersTable)
      .where(eq(majlisChannelMembersTable.channelId, channelId));
    const existingSet = new Set(existingMembers.map(m => m.userId));

    const newMembers = (memberIds as number[]).filter(id => !existingSet.has(id));
    if (newMembers.length > 0) {
      await db.insert(majlisChannelMembersTable).values(
        newMembers.map(uid => ({ channelId, userId: uid }))
      );
    }

    return res.json({ added: newMembers.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to add members";
    return res.status(500).json({ error: message });
  }
});

router.delete("/majlis/channels/:id/members/:userId", requireMajlisAuth, async (req: MajlisRequest, res: Response) => {
  try {
    const channelId = parseInt(req.params.id as string);
    const targetUserId = parseInt(req.params.userId as string);
    const currentUserId = req.majlisUserId!;

    if (targetUserId !== currentUserId) {
      return res.status(403).json({ error: "You can only remove yourself from a channel" });
    }

    const [channel] = await db.select().from(majlisChannelsTable)
      .where(eq(majlisChannelsTable.id, channelId)).limit(1);
    if (!channel) return res.status(404).json({ error: "Channel not found" });
    if (channel.isDefault) {
      return res.status(400).json({ error: "Cannot leave the default channel" });
    }

    await db.delete(majlisChannelMembersTable)
      .where(and(
        eq(majlisChannelMembersTable.channelId, channelId),
        eq(majlisChannelMembersTable.userId, targetUserId)
      ));

    return res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to leave channel";
    return res.status(500).json({ error: message });
  }
});

router.get("/majlis/channels/:channelId/messages", requireMajlisAuth, async (req: MajlisRequest, res: Response) => {
  try {
    const channelId = parseInt(req.params.channelId as string);
    const userId = req.majlisUserId!;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const before = req.query.before ? parseInt(req.query.before as string) : null;

    const [membership] = await db.select().from(majlisChannelMembersTable)
      .where(and(
        eq(majlisChannelMembersTable.channelId, channelId),
        eq(majlisChannelMembersTable.userId, userId)
      )).limit(1);
    if (!membership) {
      return res.status(403).json({ error: "You are not a member of this channel" });
    }

    const [channel] = await db.select().from(majlisChannelsTable)
      .where(eq(majlisChannelsTable.id, channelId)).limit(1);

    const conditions = [eq(majlisMessagesTable.isDeleted, false)];
    if (channel?.isDefault) {
      conditions.push(or(eq(majlisMessagesTable.channelId, channelId), isNull(majlisMessagesTable.channelId))!);
    } else {
      conditions.push(eq(majlisMessagesTable.channelId, channelId));
    }
    if (before) {
      conditions.push(lt(majlisMessagesTable.id, before));
    }

    const messages = await db
      .select({
        id: majlisMessagesTable.id,
        content: majlisMessagesTable.content,
        replyToId: majlisMessagesTable.replyToId,
        isEdited: majlisMessagesTable.isEdited,
        createdAt: majlisMessagesTable.createdAt,
        userId: majlisMessagesTable.userId,
        userName: majlisUsersTable.displayName,
        profileId: majlisUsersTable.profileId,
        profileName: profilesTable.name,
        profileRole: profilesTable.role,
        profileCompany: profilesTable.company,
        profileImage: profilesTable.imageUrl,
        profileVerified: profilesTable.isVerified,
      })
      .from(majlisMessagesTable)
      .innerJoin(majlisUsersTable, eq(majlisMessagesTable.userId, majlisUsersTable.id))
      .innerJoin(profilesTable, eq(majlisUsersTable.profileId, profilesTable.id))
      .where(and(...conditions))
      .orderBy(desc(majlisMessagesTable.id))
      .limit(limit);

    const decryptedMessages = messages.map(m => ({
      ...m,
      content: decrypt(m.content),
    }));

    await db.update(majlisUsersTable)
      .set({ lastSeenAt: new Date() })
      .where(eq(majlisUsersTable.id, userId));

    return res.json({ messages: decryptedMessages.reverse() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch messages";
    return res.status(500).json({ error: message });
  }
});

router.post("/majlis/channels/:channelId/messages", requireMajlisAuth, async (req: MajlisRequest, res: Response) => {
  try {
    const channelId = parseInt(req.params.channelId as string);
    const userId = req.majlisUserId!;
    const { content, replyToId } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: "Message content is required" });
    }
    if (content.length > 2000) {
      return res.status(400).json({ error: "Message too long (max 2000 characters)" });
    }

    const [user] = await db.select().from(majlisUsersTable)
      .where(eq(majlisUsersTable.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.isBanned) return res.status(403).json({ error: "Your account has been suspended" });
    if (user.isMuted) return res.status(403).json({ error: "You are currently muted" });

    const [membership] = await db.select().from(majlisChannelMembersTable)
      .where(and(
        eq(majlisChannelMembersTable.channelId, channelId),
        eq(majlisChannelMembersTable.userId, userId)
      )).limit(1);
    if (!membership) {
      return res.status(403).json({ error: "You are not a member of this channel" });
    }

    const encrypted = encrypt(content.trim());

    const [newMessage] = await db.insert(majlisMessagesTable).values({
      userId,
      channelId,
      content: encrypted,
      replyToId: replyToId || null,
    }).returning();

    await db.update(majlisChannelMembersTable)
      .set({ lastReadMessageId: newMessage.id })
      .where(and(
        eq(majlisChannelMembersTable.channelId, channelId),
        eq(majlisChannelMembersTable.userId, userId)
      ));

    await db.update(majlisUsersTable)
      .set({ lastSeenAt: new Date() })
      .where(eq(majlisUsersTable.id, userId));

    const [profile] = await db.select().from(profilesTable)
      .where(eq(profilesTable.id, user.profileId)).limit(1);

    return res.json({
      message: {
        ...newMessage,
        content: content.trim(),
        userName: user.displayName,
        profileId: user.profileId,
        profileName: profile?.name,
        profileRole: profile?.role,
        profileCompany: profile?.company,
        profileImage: profile?.imageUrl,
        profileVerified: profile?.isVerified,
      },
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Failed to send message";
    return res.status(500).json({ error: errMsg });
  }
});

router.get("/majlis/channels/:channelId/messages/poll", requireMajlisAuth, async (req: MajlisRequest, res: Response) => {
  try {
    const channelId = parseInt(req.params.channelId as string);
    const userId = req.majlisUserId!;
    const after = parseInt(req.query.after as string) || 0;

    const [membership] = await db.select().from(majlisChannelMembersTable)
      .where(and(
        eq(majlisChannelMembersTable.channelId, channelId),
        eq(majlisChannelMembersTable.userId, userId)
      )).limit(1);
    if (!membership) {
      return res.status(403).json({ error: "You are not a member of this channel" });
    }

    const [channel] = await db.select().from(majlisChannelsTable)
      .where(eq(majlisChannelsTable.id, channelId)).limit(1);

    const conditions = [
      eq(majlisMessagesTable.isDeleted, false),
      sql`${majlisMessagesTable.id} > ${after}`,
    ];
    if (channel?.isDefault) {
      conditions.push(or(eq(majlisMessagesTable.channelId, channelId), isNull(majlisMessagesTable.channelId))!);
    } else {
      conditions.push(eq(majlisMessagesTable.channelId, channelId));
    }

    const messages = await db
      .select({
        id: majlisMessagesTable.id,
        content: majlisMessagesTable.content,
        replyToId: majlisMessagesTable.replyToId,
        isEdited: majlisMessagesTable.isEdited,
        createdAt: majlisMessagesTable.createdAt,
        userId: majlisMessagesTable.userId,
        userName: majlisUsersTable.displayName,
        profileId: majlisUsersTable.profileId,
        profileName: profilesTable.name,
        profileRole: profilesTable.role,
        profileCompany: profilesTable.company,
        profileImage: profilesTable.imageUrl,
        profileVerified: profilesTable.isVerified,
      })
      .from(majlisMessagesTable)
      .innerJoin(majlisUsersTable, eq(majlisMessagesTable.userId, majlisUsersTable.id))
      .innerJoin(profilesTable, eq(majlisUsersTable.profileId, profilesTable.id))
      .where(and(...conditions))
      .orderBy(majlisMessagesTable.id)
      .limit(50);

    const decryptedMessages = messages.map(m => ({
      ...m,
      content: decrypt(m.content),
    }));

    if (decryptedMessages.length > 0) {
      const maxId = Math.max(...decryptedMessages.map(m => m.id));
      await db.update(majlisChannelMembersTable)
        .set({ lastReadMessageId: maxId })
        .where(and(
          eq(majlisChannelMembersTable.channelId, channelId),
          eq(majlisChannelMembersTable.userId, userId)
        ));
    }

    await db.update(majlisUsersTable)
      .set({ lastSeenAt: new Date() })
      .where(eq(majlisUsersTable.id, userId));

    return res.json({ messages: decryptedMessages });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to poll messages";
    return res.status(500).json({ error: message });
  }
});

router.get("/majlis/messages", requireMajlisAuth, async (req: MajlisRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const before = req.query.before ? parseInt(req.query.before as string) : null;

    const generalId = await ensureGeneralChannel();

    const conditions = [
      eq(majlisMessagesTable.isDeleted, false),
      or(eq(majlisMessagesTable.channelId, generalId), isNull(majlisMessagesTable.channelId))!,
    ];
    if (before) {
      conditions.push(lt(majlisMessagesTable.id, before));
    }

    const messages = await db
      .select({
        id: majlisMessagesTable.id,
        content: majlisMessagesTable.content,
        replyToId: majlisMessagesTable.replyToId,
        isEdited: majlisMessagesTable.isEdited,
        createdAt: majlisMessagesTable.createdAt,
        userId: majlisMessagesTable.userId,
        userName: majlisUsersTable.displayName,
        profileId: majlisUsersTable.profileId,
        profileName: profilesTable.name,
        profileRole: profilesTable.role,
        profileCompany: profilesTable.company,
        profileImage: profilesTable.imageUrl,
        profileVerified: profilesTable.isVerified,
      })
      .from(majlisMessagesTable)
      .innerJoin(majlisUsersTable, eq(majlisMessagesTable.userId, majlisUsersTable.id))
      .innerJoin(profilesTable, eq(majlisUsersTable.profileId, profilesTable.id))
      .where(and(...conditions))
      .orderBy(desc(majlisMessagesTable.id))
      .limit(limit);

    const decryptedMessages = messages.map(m => ({
      ...m,
      content: decrypt(m.content),
    }));

    const userId = req.majlisUserId!;
    await db.update(majlisUsersTable)
      .set({ lastSeenAt: new Date() })
      .where(eq(majlisUsersTable.id, userId));

    return res.json({ messages: decryptedMessages.reverse() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch messages";
    return res.status(500).json({ error: message });
  }
});

router.post("/majlis/messages", requireMajlisAuth, async (req: MajlisRequest, res: Response) => {
  try {
    const userId = req.majlisUserId!;
    const { content, replyToId } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: "Message content is required" });
    }
    if (content.length > 2000) {
      return res.status(400).json({ error: "Message too long (max 2000 characters)" });
    }

    const [user] = await db.select().from(majlisUsersTable)
      .where(eq(majlisUsersTable.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.isBanned) return res.status(403).json({ error: "Your account has been suspended" });
    if (user.isMuted) return res.status(403).json({ error: "You are currently muted" });

    const generalId = await ensureGeneralChannel();
    const encrypted = encrypt(content.trim());

    const [newMessage] = await db.insert(majlisMessagesTable).values({
      userId,
      channelId: generalId,
      content: encrypted,
      replyToId: replyToId || null,
    }).returning();

    await db.update(majlisUsersTable)
      .set({ lastSeenAt: new Date() })
      .where(eq(majlisUsersTable.id, userId));

    const [profile] = await db.select().from(profilesTable)
      .where(eq(profilesTable.id, user.profileId)).limit(1);

    return res.json({
      message: {
        ...newMessage,
        content: content.trim(),
        userName: user.displayName,
        profileId: user.profileId,
        profileName: profile?.name,
        profileRole: profile?.role,
        profileCompany: profile?.company,
        profileImage: profile?.imageUrl,
        profileVerified: profile?.isVerified,
      },
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Failed to send message";
    return res.status(500).json({ error: errMsg });
  }
});

router.get("/majlis/members", requireMajlisAuth, async (_req: MajlisRequest, res: Response) => {
  try {
    const members = await db
      .select({
        id: majlisUsersTable.id,
        displayName: majlisUsersTable.displayName,
        profileId: majlisUsersTable.profileId,
        lastSeenAt: majlisUsersTable.lastSeenAt,
        isActive: majlisUsersTable.isActive,
        profileName: profilesTable.name,
        profileRole: profilesTable.role,
        profileCompany: profilesTable.company,
        profileImage: profilesTable.imageUrl,
        profileVerified: profilesTable.isVerified,
        profileCountry: profilesTable.country,
      })
      .from(majlisUsersTable)
      .innerJoin(profilesTable, eq(majlisUsersTable.profileId, profilesTable.id))
      .where(and(eq(majlisUsersTable.isActive, true), eq(majlisUsersTable.isBanned, false)));

    const now = Date.now();
    const membersWithStatus = members.map(m => ({
      ...m,
      isOnline: m.lastSeenAt ? (now - new Date(m.lastSeenAt).getTime()) < 5 * 60 * 1000 : false,
    }));

    return res.json({ members: membersWithStatus });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch members";
    return res.status(500).json({ error: message });
  }
});

router.get("/majlis/messages/poll", requireMajlisAuth, async (req: MajlisRequest, res: Response) => {
  try {
    const after = parseInt(req.query.after as string) || 0;
    const generalId = await ensureGeneralChannel();

    const messages = await db
      .select({
        id: majlisMessagesTable.id,
        content: majlisMessagesTable.content,
        replyToId: majlisMessagesTable.replyToId,
        isEdited: majlisMessagesTable.isEdited,
        createdAt: majlisMessagesTable.createdAt,
        userId: majlisMessagesTable.userId,
        userName: majlisUsersTable.displayName,
        profileId: majlisUsersTable.profileId,
        profileName: profilesTable.name,
        profileRole: profilesTable.role,
        profileCompany: profilesTable.company,
        profileImage: profilesTable.imageUrl,
        profileVerified: profilesTable.isVerified,
      })
      .from(majlisMessagesTable)
      .innerJoin(majlisUsersTable, eq(majlisMessagesTable.userId, majlisUsersTable.id))
      .innerJoin(profilesTable, eq(majlisUsersTable.profileId, profilesTable.id))
      .where(and(
        eq(majlisMessagesTable.isDeleted, false),
        or(eq(majlisMessagesTable.channelId, generalId), isNull(majlisMessagesTable.channelId))!,
        sql`${majlisMessagesTable.id} > ${after}`
      ))
      .orderBy(majlisMessagesTable.id)
      .limit(50);

    const decryptedMessages = messages.map(m => ({
      ...m,
      content: decrypt(m.content),
    }));

    const userId = req.majlisUserId!;
    await db.update(majlisUsersTable)
      .set({ lastSeenAt: new Date() })
      .where(eq(majlisUsersTable.id, userId));

    return res.json({ messages: decryptedMessages });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to poll messages";
    return res.status(500).json({ error: message });
  }
});

router.post("/cms/majlis/invites", requireCmsAuth, async (req: Request, res: Response) => {
  try {
    const { profileId, email } = req.body;
    if (!profileId || !email) {
      return res.status(400).json({ error: "profileId and email are required" });
    }

    const [profile] = await db.select().from(profilesTable)
      .where(eq(profilesTable.id, profileId))
      .limit(1);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }
    if (!profile.isVerified) {
      return res.status(400).json({ error: "Only verified Voices can be invited" });
    }

    const existingUser = await db.select().from(majlisUsersTable)
      .where(eq(majlisUsersTable.profileId, profileId))
      .limit(1);
    if (existingUser.length > 0) {
      return res.status(409).json({ error: "This Voice already has a Gallery account" });
    }

    const code = generateInviteCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [invite] = await db.insert(majlisInvitesTable).values({
      profileId,
      email,
      token: code,
      expiresAt,
    }).returning();

    return res.json({ invite: { ...invite, profileName: profile.name } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create invite";
    return res.status(500).json({ error: message });
  }
});

router.get("/cms/majlis/invites", requireCmsAuth, async (_req: Request, res: Response) => {
  try {
    const invites = await db
      .select({
        id: majlisInvitesTable.id,
        profileId: majlisInvitesTable.profileId,
        token: majlisInvitesTable.token,
        email: majlisInvitesTable.email,
        isUsed: majlisInvitesTable.isUsed,
        expiresAt: majlisInvitesTable.expiresAt,
        createdAt: majlisInvitesTable.createdAt,
        profileName: profilesTable.name,
      })
      .from(majlisInvitesTable)
      .innerJoin(profilesTable, eq(majlisInvitesTable.profileId, profilesTable.id))
      .orderBy(desc(majlisInvitesTable.createdAt));

    return res.json({ invites });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch invites";
    return res.status(500).json({ error: message });
  }
});

router.get("/cms/majlis/users", requireCmsAuth, async (_req: Request, res: Response) => {
  try {
    const users = await db
      .select({
        id: majlisUsersTable.id,
        email: majlisUsersTable.email,
        displayName: majlisUsersTable.displayName,
        profileId: majlisUsersTable.profileId,
        isActive: majlisUsersTable.isActive,
        isBanned: majlisUsersTable.isBanned,
        isMuted: majlisUsersTable.isMuted,
        lastSeenAt: majlisUsersTable.lastSeenAt,
        createdAt: majlisUsersTable.createdAt,
        profileName: profilesTable.name,
        profileRole: profilesTable.role,
        profileCompany: profilesTable.company,
        profileImage: profilesTable.imageUrl,
      })
      .from(majlisUsersTable)
      .innerJoin(profilesTable, eq(majlisUsersTable.profileId, profilesTable.id))
      .orderBy(desc(majlisUsersTable.createdAt));

    return res.json({ users });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch users";
    return res.status(500).json({ error: message });
  }
});

router.patch("/cms/majlis/users/:id", requireCmsAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { isActive, isBanned, isMuted } = req.body;

    const updates: MajlisUserUpdate = {};
    if (typeof isActive === "boolean") updates.isActive = isActive;
    if (typeof isBanned === "boolean") updates.isBanned = isBanned;
    if (typeof isMuted === "boolean") updates.isMuted = isMuted;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const [updated] = await db.update(majlisUsersTable)
      .set(updates)
      .where(eq(majlisUsersTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "User not found" });

    if (isBanned || isActive === false) {
      await invalidateMajlisUserSessions(id);
    }

    return res.json({ user: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update user";
    return res.status(500).json({ error: message });
  }
});

router.get("/cms/majlis/messages", requireCmsAuth, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const page = parseInt(req.query.page as string) || 1;
    const offset = (page - 1) * limit;

    const messages = await db
      .select({
        id: majlisMessagesTable.id,
        content: majlisMessagesTable.content,
        isEdited: majlisMessagesTable.isEdited,
        isDeleted: majlisMessagesTable.isDeleted,
        createdAt: majlisMessagesTable.createdAt,
        userId: majlisMessagesTable.userId,
        userName: majlisUsersTable.displayName,
        profileName: profilesTable.name,
      })
      .from(majlisMessagesTable)
      .innerJoin(majlisUsersTable, eq(majlisMessagesTable.userId, majlisUsersTable.id))
      .innerJoin(profilesTable, eq(majlisUsersTable.profileId, profilesTable.id))
      .orderBy(desc(majlisMessagesTable.createdAt))
      .limit(limit)
      .offset(offset);

    const decryptedMessages = messages.map(m => ({
      ...m,
      content: decrypt(m.content),
    }));

    const [{ total }] = await db.select({ total: count() }).from(majlisMessagesTable);

    return res.json({ messages: decryptedMessages, total, page, limit });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch messages";
    return res.status(500).json({ error: message });
  }
});

router.delete("/cms/majlis/messages/:id", requireCmsAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const [updated] = await db
      .update(majlisMessagesTable)
      .set({ isDeleted: true })
      .where(eq(majlisMessagesTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Message not found" });
    return res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete message";
    return res.status(500).json({ error: message });
  }
});

router.get("/cms/majlis/stats", requireCmsAuth, async (_req: Request, res: Response) => {
  try {
    const [{ userCount }] = await db.select({ userCount: count() }).from(majlisUsersTable);
    const [{ messageCount }] = await db.select({ messageCount: count() }).from(majlisMessagesTable).where(eq(majlisMessagesTable.isDeleted, false));
    const [{ activeCount }] = await db.select({ activeCount: count() }).from(majlisUsersTable).where(eq(majlisUsersTable.isActive, true));
    const [{ bannedCount }] = await db.select({ bannedCount: count() }).from(majlisUsersTable).where(eq(majlisUsersTable.isBanned, true));

    return res.json({ userCount, messageCount, activeCount, bannedCount });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch stats";
    return res.status(500).json({ error: message });
  }
});

// ── Share preview endpoint ──────────────────────────────────────────────────
router.get("/majlis/share-preview", requireMajlisAuth, async (req: MajlisRequest, res: Response) => {
  try {
    const { type, id } = req.query;
    if (!type || !id) {
      return res.status(400).json({ error: "type and id are required" });
    }

    const numId = parseInt(id as string);
    if (isNaN(numId)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    if (type === "debate") {
      const [poll] = await db.select().from(pollsTable)
        .where(eq(pollsTable.id, numId)).limit(1);
      if (!poll) return res.status(404).json({ error: "Poll not found" });

      const options = await db.select().from(pollOptionsTable)
        .where(eq(pollOptionsTable.pollId, numId));
      const totalVotes = options.reduce((sum, o) => sum + o.voteCount, 0);
      const topOption = options.reduce((a, b) => a.voteCount > b.voteCount ? a : b, options[0]);
      const topPct = totalVotes > 0 ? Math.round((topOption.voteCount / totalVotes) * 100) : 0;

      return res.json({
        type: "debate",
        id: poll.id,
        title: poll.question,
        stat: `${topPct}%`,
        category: poll.category,
        shareString: `[share:debate:${poll.id}|${poll.question}|${topPct}%|${poll.category}]`,
      });
    }

    if (type === "prediction") {
      const [pred] = await db.select().from(predictionsTable)
        .where(eq(predictionsTable.id, numId)).limit(1);
      if (!pred) return res.status(404).json({ error: "Prediction not found" });

      const sentiment = pred.yesPercentage >= 50 ? `${pred.yesPercentage}% Yes` : `${pred.noPercentage}% No`;
      return res.json({
        type: "prediction",
        id: pred.id,
        title: pred.question,
        stat: sentiment,
        category: pred.category,
        shareString: `[share:prediction:${pred.id}|${pred.question}|${sentiment}|${pred.category}]`,
      });
    }

    return res.status(400).json({ error: "Invalid type. Use 'debate' or 'prediction'" });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Failed to get share preview";
    return res.status(500).json({ error: errMsg });
  }
});

export default router;
