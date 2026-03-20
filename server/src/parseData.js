/**
 * parseData.js
 *
 * Reads data.txt and returns structured JSON array for MongoDB insertion.
 *
 * data.txt format per entry:
 *   N. Name - J-FlatNo - PhoneNumber
 *   2W - RegNo
 *   4W - RegNo - Fastag - Parking Slot
 *
 * bikes → registrationNumbers: [String]           (simple)
 * cars  → list: [{ regNo, fastTag, parkingSlot }] (structured)
 *
 * Only 4W entries carry fastTag / parkingSlot.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const clean       = (s) => s.replace(/\*/g, '').trim();
const normalizeReg = (r) =>
    r.trim().toUpperCase().replace(/\s+/g, '').replace(/[.,;:)(]+$/g, '');
const isReg       = (s) => {
    const t = s.trim().toUpperCase().replace(/\s+/g, '');
    return t.length >= 6 && /^[A-Z0-9]+$/.test(t);
};
const extractPhone = (s) => {
    const d = s.replace(/\D/g, '');
    return d.length === 10 ? d : null;
};
const parseFlatToken = (token) => {
    const t = token.trim().replace(/\*/g, '');
    const m = t.match(/^([A-Z])[- ]?(\d{2,4})$/i);
    return m ? { wing: m[1].toUpperCase(), flatNo: m[2] } : null;
};

// ─── Core parser ──────────────────────────────────────────────────────────────

function parseMembersData(rawText) {
    const lines = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const members = [];
    let cur = null;

    const commit = () => {
        if (!cur) return;
        cur.vehicles.bikes.count = cur.vehicles.bikes.registrationNumbers.length;
        cur.vehicles.cars.count  = cur.vehicles.cars.list.length;
        if (cur.fullName && cur.fullName.length >= 2) members.push(cur);
        cur = null;
    };

    const isTenant = (text) => /tenant/i.test(text);

    const freshMember = (fullName, phoneNumber, wing, flatNo, rawHeader) => ({
        fullName,
        phoneNumber: phoneNumber || '',
        wing:        wing        || 'J',
        flatNo:      flatNo      || '',
        type:        isTenant(rawHeader || fullName) ? 'tenant' : 'owner',
        vehicles: {
            bikes: { count: 0, registrationNumbers: [] },   // plain strings
            cars:  { count: 0, list: [] },                  // objects
        },
    });

    for (const rawLine of lines) {
        const line = clean(rawLine);
        if (!line) continue;

        // ── Numbered entry header ──────────────────────────────────────────────
        const headerMatch = line.match(/^(\d+)[.)]\s*(.+)/);
        if (headerMatch) {
            commit();
            const rest  = headerMatch[2];
            const parts = rest.split(/\s+-\s+/).map(s => s.trim());

            let fullName = clean(parts[0]), phoneNumber = '', wing = 'J', flatNo = '';

            for (let i = 1; i < parts.length; i++) {
                const p = parts[i].trim();

                const ph = extractPhone(p);
                if (ph && !phoneNumber) { phoneNumber = ph; continue; }

                const fp = parseFlatToken(p);
                if (fp && !flatNo) { wing = fp.wing; flatNo = fp.flatNo; continue; }

                // "J-1202- 8446206080" left as merged token after split
                const combined = p.match(/^([A-Z][- ]?\d{2,4})[- ]+(\d{10})$/i);
                if (combined) {
                    const fp2 = parseFlatToken(combined[1]);
                    if (fp2 && !flatNo) { wing = fp2.wing; flatNo = fp2.flatNo; }
                    if (!phoneNumber)    phoneNumber = combined[2];
                }
            }

            // Fallback flat scan on full `rest`
            if (!flatNo) {
                const m = rest.match(/\b([A-Z][- ]?\d{3,4})\b/i);
                if (m) {
                    const fp = parseFlatToken(m[1].replace(/\s/, ''));
                    if (fp) { wing = fp.wing; flatNo = fp.flatNo; }
                }
            }

            cur = freshMember(fullName, phoneNumber, wing, flatNo, rest);
            continue;
        }

        if (!cur) continue;

        // ── Vehicle lines ──────────────────────────────────────────────────────
        const vm = line.match(/^(2\s*W|4\s*W)\s*[-–]\s*(.+)/i);
        if (vm) {
            const vtype  = vm[1].replace(/\s/g, '').toUpperCase(); // "2W" | "4W"
            const vparts = vm[2].split(/\s*-\s*/).map(s => s.trim()).filter(Boolean);
            const regNo  = normalizeReg(vparts[0] || '');
            if (!isReg(regNo)) continue;

            if (vtype === '2W') {
                // ── Bikes: plain strings ──────────────────────────────────────
                if (!cur.vehicles.bikes.registrationNumbers.includes(regNo)) {
                    cur.vehicles.bikes.registrationNumbers.push(regNo);
                }
            } else {
                // ── Cars: objects with fastTag + parkingSlot ──────────────────
                const fastTag    = vparts.some(p => /fastag/i.test(p));
                const hasParking = vparts.some(p => /parking\s*slot/i.test(p));

                if (!cur.vehicles.cars.list.some(v => v.regNo === regNo)) {
                    cur.vehicles.cars.list.push({
                        regNo,
                        fastTag,
                        parkingSlot: hasParking ? '' : '',  // '' = to be filled manually
                    });
                }
            }
            continue;
        }

        // ── Continuation: pick up missing phone / flat ─────────────────────────
        const ph = extractPhone(line);
        if (ph && !cur.phoneNumber) { cur.phoneNumber = ph; continue; }
        const fp = parseFlatToken(line);
        if (fp && !cur.flatNo) { cur.wing = fp.wing; cur.flatNo = fp.flatNo; }
    }

    commit();
    return members;
}

// ─── Public API ───────────────────────────────────────────────────────────────

function getJsonData() {
    const rawText = fs.readFileSync(path.join(__dirname, 'data.txt'), 'utf-8');
    return parseMembersData(rawText);
}

module.exports = { parseMembersData, getJsonData };

// ─── Standalone ───────────────────────────────────────────────────────────────
if (require.main === module) {
    const data = getJsonData();
    console.log(JSON.stringify(data, null, 2));

    let bikes = 0, cars = 0, fastTagCars = 0;
    data.forEach(m => {
        bikes       += m.vehicles.bikes.registrationNumbers.length;
        cars        += m.vehicles.cars.list.length;
        fastTagCars += m.vehicles.cars.list.filter(v => v.fastTag).length;
    });
    console.log(`\n✅  Members  : ${data.length}`);
    console.log(`   🏍  Bikes   : ${bikes}`);
    console.log(`   🚗  Cars    : ${cars}  (📡 FASTag: ${fastTagCars})`);
}
