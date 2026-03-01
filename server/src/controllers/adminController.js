const Member = require('../models/Member');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');


// GET /api/admin/members - Get all members of chairman's wing
const getMembers = async (req, res) => {
    try {
        const { wing } = req.admin;
        const { type, search } = req.query;

        const filter = { wing };

        // Optional type filter
        if (type && ['owner', 'tenant'].includes(type.toLowerCase())) {
            filter.type = type.toLowerCase();
        }

        // Optional name search
        if (search) {
            filter.fullName = { $regex: search, $options: 'i' };
        }

        const members = await Member.find(filter).sort({ createdAt: -1 });

        // Compute stats
        const allMembers = await Member.find({ wing });
        const totalMembers = allMembers.length;
        const ownerCount = allMembers.filter((m) => m.type === 'owner').length;
        const tenantCount = allMembers.filter((m) => m.type === 'tenant').length;

        res.json({
            success: true,
            stats: {
                total: totalMembers,
                owners: ownerCount,
                tenants: tenantCount,
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
        const { wing } = req.admin;
        const { id } = req.params;

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

        // Wing match check
        if (member.wing !== wing) {
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
        const { wing } = req.admin;
        const { id } = req.params;

        const member = await Member.findById(id);

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Member not found.',
            });
        }

        // Wing match check
        if (member.wing !== wing) {
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

        // Validate vehicle counts match registration numbers
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
                const carRegs = updateData.vehicles.cars.registrationNumbers || [];
                if (carCount > 0 && carRegs.length !== carCount) {
                    return res.status(400).json({
                        success: false,
                        message: `Expected ${carCount} car registration number(s), got ${carRegs.length}.`,
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
        const { wing } = req.admin;
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

        const members = await Member.find({
            wing,
            $or: [
                { 'vehicles.bikes.registrationNumbers': normalizedRegNo },
                { 'vehicles.cars.registrationNumbers': normalizedRegNo },
            ],
        });

        if (members.length === 0) {
            return res.json({
                success: false,
                message: 'No member found with this registration number in your wing.',
            });
        }

        res.json({
            success: true,
            data: members,
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
        const { wing } = req.admin;
        const { id } = req.params;

        if (!require('mongoose').isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: 'Invalid member ID.' });
        }

        const member = await Member.findById(id);

        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found.' });
        }

        // Wing ownership check
        if (member.wing !== wing) {
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
        const { wing } = req.admin;
        const { type, search } = req.query;

        const filter = { wing };
        if (type && ['owner', 'tenant'].includes(type.toLowerCase())) {
            filter.type = type.toLowerCase();
        }
        if (search) {
            filter.fullName = { $regex: search, $options: 'i' };
        }

        const members = await Member.find(filter).sort({ createdAt: -1 });

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Society Book';
        workbook.created = new Date();

        const sheet = workbook.addWorksheet(`Wing ${wing} Members`, {
            views: [{ state: 'frozen', ySplit: 1 }],
            pageSetup: { fitToPage: true, fitToWidth: 1 },
        });

        // Define columns
        sheet.columns = [
            { header: '#', key: 'no', width: 5 },
            { header: 'Full Name', key: 'fullName', width: 28 },
            { header: 'Phone Number', key: 'phoneNumber', width: 16 },
            { header: 'Flat No', key: 'flatNo', width: 10 },
            { header: 'Wing', key: 'wing', width: 7 },
            { header: 'Type', key: 'type', width: 10 },
            { header: 'Bikes', key: 'bikes', width: 8 },
            { header: 'Bike Reg. Numbers', key: 'bikeRegs', width: 30 },
            { header: 'Cars', key: 'cars', width: 8 },
            { header: 'Car Reg. Numbers', key: 'carRegs', width: 30 },
            { header: 'Attachment', key: 'attachment', width: 14 },
            { header: 'Agreement Expiry', key: 'expiry', width: 18 },
            { header: 'Registered On', key: 'createdAt', width: 18 },
        ];

        // Style header row
        const headerRow = sheet.getRow(1);
        headerRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF1E3A5F' },
            };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = {
                bottom: { style: 'thin', color: { argb: 'FF2563EB' } },
            };
        });
        headerRow.height = 28;

        // Add data rows
        members.forEach((m, idx) => {
            const bikeRegs = m.vehicles.bikes.registrationNumbers.join(', ') || '—';
            const carRegs = m.vehicles.cars.registrationNumbers.join(', ') || '—';
            const hasAttachment = m.type === 'owner'
                ? (m.ownerDetails?.index2 ? 'Index 2 ✓' : '—')
                : (m.tenantDetails?.agreement ? 'Agreement ✓' : '—');
            const expiry = m.type === 'tenant' && m.tenantDetails?.lastDayOfAgreement
                ? new Date(m.tenantDetails.lastDayOfAgreement)
                : null;

            const row = sheet.addRow({
                no: idx + 1,
                fullName: m.fullName,
                phoneNumber: m.phoneNumber,
                flatNo: m.flatNo,
                wing: m.wing,
                type: m.type.charAt(0).toUpperCase() + m.type.slice(1),
                bikes: m.vehicles.bikes.count,
                bikeRegs,
                cars: m.vehicles.cars.count,
                carRegs,
                attachment: hasAttachment,
                expiry: expiry,
                createdAt: new Date(m.createdAt),
            });

            // Format date cells
            row.getCell('expiry').numFmt = 'dd-mmm-yyyy';
            row.getCell('createdAt').numFmt = 'dd-mmm-yyyy';

            // Zebra striping
            const bgColor = idx % 2 === 0 ? 'FFFAFBFF' : 'FFF0F4FF';
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: bgColor },
                };
                cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
                cell.border = {
                    bottom: { style: 'hair', color: { argb: 'FFD1D5DB' } },
                };
            });

            // Highlight type cell
            const typeCell = row.getCell('type');
            typeCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: m.type === 'owner' ? 'FFD1FAE5' : 'FFDBEAFE' },
            };
            typeCell.font = {
                bold: true,
                color: { argb: m.type === 'owner' ? 'FF065F46' : 'FF1E3A8A' },
            };

            row.height = 20;
        });

        // Auto-filter on header row
        sheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: sheet.columns.length },
        };

        // Stream response
        const safeWing = wing.replace(/[^A-Za-z0-9]/g, '_');
        const filename = `Wing_${safeWing}_Members_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
