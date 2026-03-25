const Member = require('../models/Member');
const Visitor = require('../models/Visitor');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');


// GET /api/admin/members - Get all members of chairman's wing
const getMembers = async (req, res) => {
    try {
        const { wing, role } = req.admin;
        const { type, search } = req.query;

        const isSuperAdmin = role === 'superadmin' || wing === 'ALL';

        const filter = {};
        if (!isSuperAdmin) filter.wing = wing;

        // Optional type filter
        if (type && ['owner', 'tenant'].includes(type.toLowerCase())) {
            filter.type = type.toLowerCase();
        }

        // Optional name search
        if (search) {
            filter.fullName = { $regex: search, $options: 'i' };
        }

        const members = await Member.find(filter).sort({ wing: 1, flatNo: 1 });

        // Compute stats
        const statsFilter = isSuperAdmin ? {} : { wing };
        const allMembers = await Member.find(statsFilter);
        const totalMembers = allMembers.length;
        const owners  = allMembers.filter((m) => m.type === 'owner');
        const tenants = allMembers.filter((m) => m.type === 'tenant');
        const ownerCount  = owners.length;
        const tenantCount = tenants.length;

        // Vehicle counts — total
        const twoWheelerCount  = allMembers.reduce((sum, m) => sum + (m.vehicles?.bikes?.count || 0), 0);
        const fourWheelerCount = allMembers.reduce((sum, m) => sum + (m.vehicles?.cars?.count  || 0), 0);

        // Vehicle counts — by member type
        const ownerTwoWheelers   = owners.reduce((sum, m)  => sum + (m.vehicles?.bikes?.count || 0), 0);
        const ownerFourWheelers  = owners.reduce((sum, m)  => sum + (m.vehicles?.cars?.count  || 0), 0);
        const tenantTwoWheelers  = tenants.reduce((sum, m) => sum + (m.vehicles?.bikes?.count || 0), 0);
        const tenantFourWheelers = tenants.reduce((sum, m) => sum + (m.vehicles?.cars?.count  || 0), 0);

        res.json({
            success: true,
            stats: {
                total: totalMembers,
                owners: ownerCount,
                tenants: tenantCount,
                twoWheelers: twoWheelerCount,
                fourWheelers: fourWheelerCount,
                ownerTwoWheelers,
                ownerFourWheelers,
                tenantTwoWheelers,
                tenantFourWheelers,
            },
            data: members,
        });
    } catch (error) {
        console.error('Get Members Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error.',
        });
    }
};

// GET /api/admin/members/:id - Get specific member
const getMemberById = async (req, res) => {
    try {
        const { wing, role } = req.admin;
        const { id } = req.params;
        const isSuperAdmin = role === 'superadmin' || wing === 'ALL';

        // Guard against non-ObjectId values (e.g. "export") reaching the DB
        if (!require('mongoose').isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: 'Invalid member ID.' });
        }

        const member = await Member.findById(id);

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Member not found.',
            });
        }

        // Wing match check — superadmin can view any wing
        if (!isSuperAdmin && member.wing !== wing) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only view members of your wing.',
            });
        }

        res.json({
            success: true,
            data: member,
        });
    } catch (error) {
        console.error('Get Member By Id Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error.',
        });
    }
};

// PUT /api/admin/members/:id - Update member
const updateMember = async (req, res) => {
    try {
        const { wing, role } = req.admin;
        const { id } = req.params;
        const isSuperAdmin = role === 'superadmin' || wing === 'ALL';

        const member = await Member.findById(id);

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Member not found.',
            });
        }

        // Wing match check — superadmin can update any wing
        if (!isSuperAdmin && member.wing !== wing) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only update members of your wing.',
            });
        }

        // Fields that can be updated
        const allowedUpdates = [
            'phoneNumber',
            'flatNo',
            'vehicles',
            'ownerDetails',
            'tenantDetails',
        ];

        const updateData = {};
        for (const key of allowedUpdates) {
            if (req.body[key] !== undefined) {
                updateData[key] = req.body[key];
            }
        }

        // Validate vehicle counts match entries
        if (updateData.vehicles) {
            if (updateData.vehicles.bikes) {
                const bikeCount = updateData.vehicles.bikes.count || 0;
                const bikeRegs = updateData.vehicles.bikes.registrationNumbers || [];
                if (bikeCount > 0 && bikeRegs.length !== bikeCount) {
                    return res.status(400).json({
                        success: false,
                        message: `Expected ${bikeCount} bike registration number(s), got ${bikeRegs.length}.`,
                    });
                }
            }
            if (updateData.vehicles.cars) {
                const carCount = updateData.vehicles.cars.count || 0;
                const carList = updateData.vehicles.cars.list || [];
                if (carCount > 0 && carList.length !== carCount) {
                    return res.status(400).json({
                        success: false,
                        message: `Expected ${carCount} car entry(ies), got ${carList.length}.`,
                    });
                }
            }
        }

        const updatedMember = await Member.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        });

        res.json({
            success: true,
            message: 'Member updated successfully.',
            data: updatedMember,
        });
    } catch (error) {
        console.error('Update Member Error:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', '),
            });
        }
        res.status(500).json({
            success: false,
            message: 'Internal server error.',
        });
    }
};

// GET /api/admin/search?registrationNo=MH12AB1234
const searchByRegistration = async (req, res) => {
    try {
        const { registrationNo } = req.query;

        if (!registrationNo) {
            return res.status(400).json({
                success: false,
                message: 'Registration number is required.',
            });
        }

        const normalizedRegNo = registrationNo.trim().toUpperCase().replace(/\s+/g, '');

        // Validate registration number format
        if (normalizedRegNo.length < 6 || normalizedRegNo.length > 15) {
            return res.status(400).json({
                success: false,
                message: 'Registration number must be between 6 and 15 characters.',
            });
        }

        if (!/^[A-Z0-9]+$/.test(normalizedRegNo)) {
            return res.status(400).json({
                success: false,
                message: 'Registration number must be alphanumeric only.',
            });
        }

        // ── Search members (all wings) ────────────────────────────────────────
        const memberQuery = {
            $or: [
                { 'vehicles.bikes.registrationNumbers': normalizedRegNo },
                { 'vehicles.cars.list.regNo': normalizedRegNo },
            ],
        };
        const members = await Member.find(memberQuery);

        // ── Search approved, non-expired visitors ─────────────────────────────
        const visitors = await Visitor.find({
            'vehicle.regNo': normalizedRegNo,
            status: 'approved',
            expiresAt: { $gt: new Date() },
        }).select('-photo');   // don't return heavy base64

        if (members.length === 0 && visitors.length === 0) {
            return res.json({
                success: false,
                message: 'No member or visitor found with this registration number.',
            });
        }

        res.json({
            success: true,
            allWings: true,
            data: members.map(m => ({ ...m.toObject(), _resultType: 'member' })),
            visitors: visitors.map(v => ({ ...v.toObject(), _resultType: 'visitor' })),
        });
    } catch (error) {
        console.error('Search Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error.',
        });
    }
};

// DELETE /api/admin/members/:id - Delete member
const deleteMember = async (req, res) => {
    try {
        const { wing, role } = req.admin;
        const { id } = req.params;
        const isSuperAdmin = role === 'superadmin' || wing === 'ALL';

        if (!require('mongoose').isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: 'Invalid member ID.' });
        }

        const member = await Member.findById(id);

        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found.' });
        }

        // Wing ownership check — superadmin can delete any wing
        if (!isSuperAdmin && member.wing !== wing) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only delete members of your wing.',
            });
        }

        // Clean up uploaded attachment file from disk
        const attachmentPath =
            member.type === 'owner'
                ? member.ownerDetails?.index2
                : member.tenantDetails?.agreement;

        if (attachmentPath) {
            const fullPath = path.join(__dirname, '../../uploads', path.basename(attachmentPath));
            fs.unlink(fullPath, (err) => {
                if (err && err.code !== 'ENOENT') {
                    console.warn('Could not delete attachment file:', err.message);
                }
            });
        }

        await Member.findByIdAndDelete(id);

        res.json({ success: true, message: 'Member deleted successfully.' });
    } catch (error) {
        console.error('Delete Member Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// GET /api/admin/members/export - Export all wing members as .xlsx
const exportMembersExcel = async (req, res) => {
    try {
        const { wing, role } = req.admin;
        const { type, search } = req.query;

        const isSuperAdmin = role === 'superadmin' || wing === 'ALL';

        const filter = {};
        if (!isSuperAdmin) filter.wing = wing;
        if (type && ['owner', 'tenant'].includes(type.toLowerCase())) {
            filter.type = type.toLowerCase();
        }
        if (search) {
            filter.fullName = { $regex: search, $options: 'i' };
        }

        // Fetch all members – we will sort in JS for floor grouping
        const rawMembers = await Member.find(filter);

        // ── Helpers ──────────────────────────────────────────────────
        // Extract the leading numeric part of a flat number (e.g. "101A" → 101)
        const parseFlat = (f) => parseInt((f || '').replace(/\D+/, '')) || 0;
        // Floor = first digit(s) when flat numbers follow "floor×100 + unit" pattern
        // e.g. 101–199 → floor 1, 201–299 → floor 2, 1001–1099 → floor 10
        const getFloor = (f) => {
            const n = parseFlat(f);
            if (n <= 0) return 0;
            // Works for both 3-digit (101 → 1) and 4-digit (1001 → 10) schemes
            if (n >= 1000) return Math.floor(n / 100);
            return Math.floor(n / 100);
        };

        // Sort: floor ascending, then flat number ascending (sequential within floor)
        rawMembers.sort((a, b) => {
            const fa = parseFlat(a.flatNo), fb = parseFlat(b.flatNo);
            const floorA = getFloor(a.flatNo), floorB = getFloor(b.flatNo);
            if (floorA !== floorB) return floorA - floorB;
            return fa - fb;
        });

        // ── Workbook / Sheet setup ────────────────────────────────────
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Society Book';
        workbook.created = new Date();

        const sheet = workbook.addWorksheet(
            isSuperAdmin ? 'All Wings Members' : `Wing ${wing} Members`,
            {
                views: [{ state: 'frozen', ySplit: 1 }],
                pageSetup: { fitToPage: true, fitToWidth: 1 },
            }
        );

        const COL_COUNT = 14;

        sheet.columns = [
            { header: '#', key: 'no', width: 6 },
            { header: 'Floor Sr.', key: 'floorSeq', width: 8 },
            { header: 'Full Name', key: 'fullName', width: 28 },
            { header: 'Phone Number', key: 'phoneNumber', width: 16 },
            { header: 'Flat No', key: 'flatNo', width: 10 },
            { header: 'Wing', key: 'wing', width: 7 },
            { header: 'Type', key: 'type', width: 10 },
            { header: 'Bikes', key: 'bikes', width: 8 },
            { header: 'Bike Reg.', key: 'bikeRegs', width: 28 },
            { header: 'Cars', key: 'cars', width: 8 },
            { header: 'Car Reg. (📡=FASTag)', key: 'carRegs', width: 35 },
            { header: 'Parking Slot', key: 'parkingSlots', width: 18 },
            { header: 'Attachment', key: 'attachment', width: 14 },
            { header: 'Agreement Expiry', key: 'expiry', width: 18 },
        ];

        // ── Style the main header row ─────────────────────────────────
        const headerRow = sheet.getRow(1);
        headerRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = { bottom: { style: 'thin', color: { argb: 'FF2563EB' } } };
        });
        headerRow.height = 28;

        // ── Helper: style a floor-banner row ─────────────────────────
        const styleFloorBanner = (row, floorNo) => {
            // Merge all columns to make a wide banner
            sheet.mergeCells(row.number, 1, row.number, COL_COUNT);
            const cell = row.getCell(1);
            cell.value = `  🏢  Floor ${floorNo}`;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, italic: false };
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
            cell.border = {
                top: { style: 'medium', color: { argb: 'FF3B82F6' } },
                bottom: { style: 'medium', color: { argb: 'FF3B82F6' } },
            };
            row.height = 22;
        };

        // ── Helper: style a data row ──────────────────────────────────
        const styleDataRow = (row, member, globalIdx) => {
            const bgColor = globalIdx % 2 === 0 ? 'FFFAFBFF' : 'FFF0F4FF';
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
                cell.border = { bottom: { style: 'hair', color: { argb: 'FFD1D5DB' } } };
            });

            // Highlight Type cell
            const typeCell = row.getCell('type');
            typeCell.fill = {
                type: 'pattern', pattern: 'solid',
                fgColor: { argb: member.type === 'owner' ? 'FFD1FAE5' : 'FFDBEAFE' },
            };
            typeCell.font = {
                bold: true,
                color: { argb: member.type === 'owner' ? 'FF065F46' : 'FF1E3A8A' },
            };

            row.height = 20;
        };

        // ── Write rows with floor grouping ───────────────────────────
        let currentFloor = null;
        let globalIdx = 0;   // 0-based, for zebra striping
        let floorSeq = 0;   // counter that resets each floor

        rawMembers.forEach((m) => {
            const memberFloor = getFloor(m.flatNo);

            // Insert floor banner when the floor changes
            if (memberFloor !== currentFloor) {
                currentFloor = memberFloor;
                floorSeq = 0;

                const bannerRow = sheet.addRow({});
                styleFloorBanner(bannerRow, memberFloor === 0 ? 'Ground' : memberFloor);
            }

            floorSeq++;
            globalIdx++;

            const bikeRegs = m.vehicles.bikes.registrationNumbers.join(', ') || '—';
            // Cars: show regNo with 📡 icon when fastTag is true
            const carRegs = m.vehicles.cars.list
                .map(v => v.fastTag ? v.regNo : v.regNo)
                .join(', ') || '—';
            const hasAttachment = m.type === 'owner'
                ? (m.ownerDetails?.index2 ? 'Index 2 ✓' : '—')
                : (m.tenantDetails?.agreement ? 'Agreement ✓' : '—');
            const expiry = m.type === 'tenant' && m.tenantDetails?.lastDayOfAgreement
                ? new Date(m.tenantDetails.lastDayOfAgreement)
                : null;

            const row = sheet.addRow({
                no: globalIdx,
                floorSeq: floorSeq,
                fullName: m.fullName,
                phoneNumber: m.phoneNumber,
                flatNo: m.flatNo,
                wing: m.wing,
                type: m.type.charAt(0).toUpperCase() + m.type.slice(1),
                bikes: m.vehicles.bikes.count,
                bikeRegs,
                cars: m.vehicles.cars.count,
                carRegs,
                // Parking slots for cars that have one assigned
                parkingSlots: m.vehicles.cars.list
                    .filter(v => v.parkingSlot)
                    .map(v => `${v.regNo}: ${v.parkingSlot}`)
                    .join(', ') || '—',
                attachment: hasAttachment,
                expiry,
            });

            row.getCell('expiry').numFmt = 'dd-mmm-yyyy';

            styleDataRow(row, m, globalIdx);
        });

        // ── Auto-filter on header ─────────────────────────────────────
        sheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: COL_COUNT },
        };

        // ── Totals row at bottom of Members sheet ─────────────────────
        const totalBikes = rawMembers.reduce((s, m) => s + (m.vehicles?.bikes?.count || 0), 0);
        const totalCars  = rawMembers.reduce((s, m) => s + (m.vehicles?.cars?.count  || 0), 0);
        const totalOwners  = rawMembers.filter(m => m.type === 'owner').length;
        const totalTenants = rawMembers.filter(m => m.type === 'tenant').length;

        const totalsRow = sheet.addRow({});
        sheet.mergeCells(totalsRow.number, 1, totalsRow.number, 7);
        totalsRow.getCell(1).value = `📊  TOTALS — Members: ${rawMembers.length}  |  Owners: ${totalOwners}  |  Tenants: ${totalTenants}`;
        totalsRow.getCell(8).value  = totalBikes;   // Bikes column
        totalsRow.getCell(10).value = totalCars;    // Cars column
        totalsRow.eachCell({ includeEmpty: true }, (cell) => {
            cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
            cell.font   = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
            cell.border = { top: { style: 'medium', color: { argb: 'FF3B82F6' } } };
        });
        totalsRow.height = 24;

        // ── Summary sheet ─────────────────────────────────────────────
        const summarySheet = workbook.addWorksheet('Summary');
        const summaryData = [
            ['Metric', 'Count'],
            ['Total Members', rawMembers.length],
            ['Owners', totalOwners],
            ['Tenants', totalTenants],
            ['Two Wheelers (Bikes)', totalBikes],
            ['Four Wheelers (Cars)', totalCars],
            ['Total Vehicles', totalBikes + totalCars],
        ];
        summaryData.forEach((rowData, idx) => {
            const sRow = summarySheet.addRow(rowData);
            if (idx === 0) {
                sRow.eachCell(cell => {
                    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
                    cell.font   = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                });
                sRow.height = 26;
            } else {
                const bgColor = idx % 2 === 0 ? 'FFFAFBFF' : 'FFF0F4FF';
                sRow.eachCell(cell => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                    cell.font = { size: 11 };
                    cell.alignment = { vertical: 'middle', horizontal: idx === 0 ? 'center' : 'left' };
                    cell.border = { bottom: { style: 'hair', color: { argb: 'FFD1D5DB' } } };
                });
                sRow.height = 20;
            }
        });
        summarySheet.columns = [
            { key: 'metric', width: 28 },
            { key: 'count',  width: 14 },
        ];

        // ── Stream response ───────────────────────────────────────────
        const exportLabel = isSuperAdmin ? 'AllWings' : `Wing_${wing.replace(/[^A-Za-z0-9]/g, '_')}`;
        const filename = `${exportLabel}_Members_FloorWise_${new Date().toISOString().slice(0, 10)}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Export Excel Error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate Excel export.' });
    }
};

module.exports = {
    getMembers,
    getMemberById,
    updateMember,
    deleteMember,
    searchByRegistration,
    exportMembersExcel,
};

