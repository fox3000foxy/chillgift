import * as fs from 'node:fs';
import * as path from 'node:path';

const dbPath = path.join(process.cwd(), 'databases', 'database.json');

export const DEFAULT_CONFIG = {
    logChannelId: process.env.LOG_CHANNEL_ID || '',
    adventChannelId: process.env.ADVENT_CHANNEL_ID || '',
    superAdminRoles: [],
    dailyReward: 50,
    inviteReward: 70,
    costTrap: 50,
    costDonjon: 10,
    costShield: 150,
    costAmulet: 300,
    costDagger: 200,
    maritimeCosts: { calm: 20, storm: 50, abyss: 100 },
    maritimeTimes: { calm: 30 * 60 * 1000, storm: 120 * 60 * 1000, abyss: 240 * 60 * 1000 },
    limitTraps: 3,
    limitDonjon: 10,
    limitWork: 5,
    probs: { star: 15, phoenix: 15, tree: 40, snowball: 10, quiz: 20 },
    adventProbs: { prize: 3, mute: 40, xp: 30, nothing: 10, curse: 17 },
    prizesStock: { netflix: 1, canal: 2, deco: 1 }
};

export let db: any = {};

function ensureDir() {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function saveDatabase() {
    try { ensureDir(); fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8'); }
    catch (e) { console.error('Failed to save DB', e); }
}

export function loadDatabase() {
    try {
        if (fs.existsSync(dbPath)) {
            db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
            db.config = { ...DEFAULT_CONFIG, ...db.config };
        } else throw new Error('No DB');
    } catch (e) {
        db = {
            users: {},
            advent: { history: {}, stockUsed: { netflix: 0, canal: 0, deco: 0 } },
            factions: { bleu: { value: 10, shares: 100 }, rouge: { value: 10, shares: 100 }, vert: { value: 10, shares: 100 }, jaune: { value: 10, shares: 100 }, violet: { value: 10, shares: 100 } },
            config: DEFAULT_CONFIG
        };
        saveDatabase();
    }
    if (!db.factions) db.factions = { bleu: { value: 10 }, rouge: { value: 10 }, vert: { value: 10 }, jaune: { value: 10 }, violet: { value: 10 } };
}

loadDatabase();

export function getParisDate() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function getUser(id: string) {
    if (!db.users[id]) db.users[id] = { points: 0, inventory: {}, daily: {}, faction: { name: null, shares: {} }, maritime: { active: false } };
    if (!db.users[id].inventory) db.users[id].inventory = { shield: 0, amulet: 0, dagger: 0 };
    if (!db.users[id].faction) db.users[id].faction = { name: null, shares: {} };
    if (!db.users[id].maritime) db.users[id].maritime = { active: false, endTime: 0, type: null };
    if (!db.users[id].daily) db.users[id].daily = { date: null, donjon: 0, traps: 0, works: 0, claimed: false };

    const today = getParisDate();
    if (db.users[id].daily.date !== today) {
        db.users[id].daily = { date: today, donjon: 0, traps: 0, works: 0, claimed: false };
    }
    return db.users[id];
}

export function updatePoints(userId: string, amount: number) {
    const user = getUser(userId);
    const old = user.points;
    user.points += amount;
    if (user.points < 0) user.points = 0;
    saveDatabase();
    return { new: user.points, diff: user.points - old };
}


export function getClaimedMessages(): string[] {
    if (!db.events) db.events = {};
    if (!db.events.snowball) db.events.snowball = { claimedMessages: [] };
    return db.events.snowball.claimedMessages;
}
export function addClaimedMessage(messageId: string) {
    const claimedMessages = getClaimedMessages();
    claimedMessages.push(messageId);
    db.events.snowball.claimedMessages = claimedMessages;
    saveDatabase();
}

export default {
    db, loadDatabase, saveDatabase, getParisDate, getUser, updatePoints, getClaimedMessages, addClaimedMessage
};
