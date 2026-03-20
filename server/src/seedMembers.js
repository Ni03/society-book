/**
 * seedMembers.js — Bulk upsert members from data.txt into MongoDB.
 *
 * Schema:
 *   bikes → registrationNumbers: [String]
 *   cars  → list: [{ regNo, fastTag, parkingSlot }]
 *
 * Usage:
 *   node src/seedMembers.js
 *   npm run seed:members
 *   DRY_RUN=true npm run seed:members
 */

'use strict';

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const Member = require('./models/Member');
const { getJsonData } = require('./parseData');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeReg = (r) => (r || '').trim().toUpperCase().replace(/\s+/g, '');
const validPhone = (ph) => ph && /^\d{10}$/.test(String(ph));

/** Merge two plain-string reg arrays (bikes) */
const mergeStrings = (a = [], b = []) =>
    [...new Set([...a, ...b].map(normalizeReg))];

/**
 * Merge two car-object arrays.
 * Existing entries keep their parkingSlot if already filled.
 * Incoming fastTag: true wins over false.
 */
const mergeCars = (existing = [], incoming = []) => {
    const map = new Map(existing.map(v => [normalizeReg(v.regNo), { ...v }]));
    for (const v of incoming) {
        const key = normalizeReg(v.regNo);
        if (map.has(key)) {
            const cur = map.get(key);
            // fastTag: true wins
            if (v.fastTag) cur.fastTag = true;
            // Keep non-empty parkingSlot; incoming '' never overwrites existing value
            if (!cur.parkingSlot && v.parkingSlot) cur.parkingSlot = v.parkingSlot;
        } else {
            map.set(key, { regNo: key, fastTag: v.fastTag, parkingSlot: v.parkingSlot });
        }
    }
    return [...map.values()];
};

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seedMembers() {
    const DRY_RUN = process.env.DRY_RUN === 'true';

    console.log('\n📂  Parsing data.txt …');
    let members;
    try {
        members = getJsonData();
    } catch (err) {
        console.error('❌  Failed to parse data.txt:', err.message);
        process.exit(1);
    }

    let totalBikes = 0, totalCars = 0, totalFastTag = 0;
    members.forEach(m => {
        totalBikes += m.vehicles.bikes.registrationNumbers.length;
        totalCars += m.vehicles.cars.list.length;
        totalFastTag += m.vehicles.cars.list.filter(v => v.fastTag).length;
    });

    console.log(`    ✅  ${members.length} records parsed`);
    console.log(`    🏍  Bikes : ${totalBikes}  |  🚗  Cars : ${totalCars}  |  📡 FASTag : ${totalFastTag}\n`);

    if (DRY_RUN) {
        console.log('🔍  DRY RUN – no DB writes.\n');
        console.log(JSON.stringify(members, null, 2));
        process.exit(0);
    }

    // Connect
    const uri = process.env.MONGODB_URI;
    if (!uri) { console.error('❌  MONGODB_URI not defined in .env'); process.exit(1); }
    await mongoose.connect(uri);
    console.log('✅  Connected to MongoDB\n' + '─'.repeat(65));

    let inserted = 0, updated = 0, skipped = 0;
    const errors = [];

    for (const data of members) {
        try {
            // Build lookup
            // A flat can have BOTH an owner and a tenant — match type too so they
            // are never confused with each other.
            const orClauses = [];
            if (data.flatNo && data.wing)
                orClauses.push({ flatNo: data.flatNo, wing: data.wing, type: data.type });
            if (validPhone(data.phoneNumber))
                orClauses.push({ phoneNumber: data.phoneNumber, type: data.type });

            const existing = orClauses.length
                ? await Member.findOne({ $or: orClauses })
                : null;

            // ── UPDATE ────────────────────────────────────────────────────────
            if (existing) {
                let changed = false;

                if (data.fullName && data.fullName.length > (existing.fullName || '').length) {
                    existing.fullName = data.fullName; changed = true;
                }
                if (validPhone(data.phoneNumber) && data.phoneNumber !== existing.phoneNumber) {
                    existing.phoneNumber = data.phoneNumber; changed = true;
                }
                if (!existing.flatNo && data.flatNo) {
                    existing.flatNo = data.flatNo; existing.wing = data.wing; changed = true;
                }

                // Sync member type (owner / tenant) from parsed data
                if (data.type && data.type !== existing.type) {
                    existing.type = data.type; changed = true;
                }

                // Bikes — merge plain strings
                const mergedBikes = mergeStrings(
                    existing.vehicles.bikes.registrationNumbers,
                    data.vehicles.bikes.registrationNumbers
                );
                if (mergedBikes.length !== existing.vehicles.bikes.registrationNumbers.length) {
                    existing.vehicles.bikes.registrationNumbers = mergedBikes;
                    existing.vehicles.bikes.count = mergedBikes.length;
                    changed = true;
                }

                // Cars — merge objects
                const mergedCars = mergeCars(
                    existing.vehicles.cars.list,
                    data.vehicles.cars.list
                );
                if (mergedCars.length !== existing.vehicles.cars.list.length ||
                    mergedCars.some((v, i) => v.fastTag !== (existing.vehicles.cars.list[i]?.fastTag))) {
                    existing.vehicles.cars.list = mergedCars;
                    existing.vehicles.cars.count = mergedCars.length;
                    changed = true;
                }

                if (changed) {
                    await existing.save();
                    const carSummary = existing.vehicles.cars.list
                        .map(v => `${v.regNo}${v.fastTag ? ' 📡' : ''}`)
                        .join(', ') || '—';
                    const typeTag = existing.type === 'tenant' ? ' 🏠 tenant' : '';
                    console.log(
                        `🔄  UPDATED  | ${existing.wing}-${String(existing.flatNo).padStart(4)} | ${existing.fullName}${typeTag}\n` +
                        `             🏍  [${mergedBikes.join(', ') || '—'}]\n` +
                        `             🚗  [${carSummary}]`
                    );
                    updated++;
                } else {
                    console.log(`⏭️   SKIPPED  | ${existing.wing}-${String(existing.flatNo).padStart(4)} | ${existing.fullName}  (no changes)`);
                    skipped++;
                }

                // ── INSERT ────────────────────────────────────────────────────────
            } else {
                if (!data.fullName || data.fullName.length < 2) {
                    console.warn(`⚠️   SKIP (no name) | flatNo: ${data.flatNo}`);
                    skipped++; continue;
                }
                if (!validPhone(data.phoneNumber)) data.phoneNumber = '0000000000';

                const member = new Member(data);
                await member.save();

                const carSummary = data.vehicles.cars.list
                    .map(v => `${v.regNo}${v.fastTag ? ' 📡' : ''}`)
                    .join(', ') || '—';
                const typeTag = data.type === 'tenant' ? ' 🏠 tenant' : '';
                console.log(
                    `✅  INSERTED | ${data.wing}-${String(data.flatNo).padStart(4)} | ${data.fullName}${typeTag}\n` +
                    `             🏍  [${data.vehicles.bikes.registrationNumbers.join(', ') || '—'}]\n` +
                    `             🚗  [${carSummary}]`
                );
                inserted++;
            }
        } catch (err) {
            console.error(`❌  ERROR | "${data.fullName}" (${data.wing}-${data.flatNo}):`, err.message);
            errors.push({ name: data.fullName, flat: `${data.wing}-${data.flatNo}`, error: err.message });
        }
    }

    // Summary
    console.log('\n' + '═'.repeat(65));
    console.log('📊  SEED SUMMARY');
    console.log('═'.repeat(65));
    console.log(`    ✅  Inserted : ${inserted}`);
    console.log(`    🔄  Updated  : ${updated}`);
    console.log(`    ⏭️   Skipped  : ${skipped}`);
    console.log(`    ❌  Errors   : ${errors.length}`);
    if (errors.length) {
        console.log('\n  Error details:');
        errors.forEach(e => console.log(`    • ${e.name} (${e.flat}): ${e.error}`));
    }
    console.log('═'.repeat(65));

    await mongoose.disconnect();
    console.log('\n👋  Disconnected from MongoDB');
    process.exit(errors.length ? 1 : 0);
}

seedMembers().catch(err => {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
});
