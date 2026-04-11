const path = require('path');
const Member = require('../models/Member');
const { uploadFileToGoogleDrive } = require('../config/googleDrive');

const VALID_WINGS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

// POST /api/public/member - Create a new member
const createMember = async (req, res) => {
    try {
        const {
            fullName,
            phoneNumber,
            flatNo,
            wing,
            type,
            email,
            caste,
        } = req.body;

        // Parse JSON strings from FormData if they are strings
        let vehicles = req.body.vehicles;
        if (typeof vehicles === 'string') {
            try { vehicles = JSON.parse(vehicles); } catch (e) { }
        }
        let ownerDetails = req.body.ownerDetails;
        if (typeof ownerDetails === 'string') {
            try { ownerDetails = JSON.parse(ownerDetails); } catch (e) { }
        }
        let tenantDetails = req.body.tenantDetails;
        if (typeof tenantDetails === 'string') {
            try { tenantDetails = JSON.parse(tenantDetails); } catch (e) { }
        }

        const index2File = req.files && req.files['index2'] ? req.files['index2'][0] : null;
        const agreementFile = req.files && req.files['agreement'] ? req.files['agreement'][0] : null;

        // Validate wing
        if (!wing || !VALID_WINGS.includes(wing.toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid wing. Must be A–K.',
            });
        }

        // Validate type
        if (!type || !['owner', 'tenant'].includes(type.toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid type. Must be owner or tenant.',
            });
        }

        // Validate full name
        if (!fullName || fullName.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Full name is required and must be at least 3 characters.',
            });
        }

        // Validate phone
        if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) {
            return res.status(400).json({
                success: false,
                message: 'Phone number must be exactly 10 digits.',
            });
        }

        // Validate flat no
        if (!flatNo || flatNo.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Flat number is required.',
            });
        }

        // Validate vehicles
        if (vehicles) {
            if (vehicles.bikes) {
                const bikeCount = vehicles.bikes.count || 0;
                const bikeRegs  = vehicles.bikes.registrationNumbers || [];
                if (bikeCount > 0 && bikeRegs.length !== bikeCount) {
                    return res.status(400).json({
                        success: false,
                        message: `Expected ${bikeCount} bike registration number(s), got ${bikeRegs.length}.`,
                    });
                }
            }
            if (vehicles.cars) {
                const carCount = vehicles.cars.count || 0;
                const carList  = vehicles.cars.list  || [];
                if (carCount > 0 && carList.length !== carCount) {
                    return res.status(400).json({
                        success: false,
                        message: `Expected ${carCount} car entry(ies), got ${carList.length}.`,
                    });
                }
            }
        }

        // Validate owner-specific fields
        if (type.toLowerCase() === 'owner') {
            if (!index2File) {
                return res.status(400).json({
                    success: false,
                    message: 'Index 2 document is required for owners.',
                });
            }
        }

        // Validate tenant-specific fields
        if (type.toLowerCase() === 'tenant') {
            if (!agreementFile) {
                return res.status(400).json({
                    success: false,
                    message: 'Agreement file is required for tenants.',
                });
            }
            if (!tenantDetails || !tenantDetails.lastDayOfAgreement) {
                return res.status(400).json({
                    success: false,
                    message: 'Last day of agreement is required for tenants.',
                });
            }
        }

        // Build member object
        const memberData = {
            fullName: fullName.trim(),
            phoneNumber,
            flatNo: flatNo.trim(),
            wing: wing.toUpperCase(),
            type: type.toLowerCase(),
            email: email ? email.trim() : null,
            caste: caste ? caste.trim() : null,
            vehicles: {
                bikes: {
                    count: vehicles?.bikes?.count || 0,
                    registrationNumbers: vehicles?.bikes?.registrationNumbers || [],
                },
                cars: {
                    count: vehicles?.cars?.count || 0,
                    // Each car entry: { regNo, fastTag, parkingSlot }
                    list: (vehicles?.cars?.list || []).map(v => ({
                        regNo:       v.regNo       || '',
                        fastTag:     v.fastTag      ?? false,
                        parkingSlot: v.parkingSlot  || '',
                    })),
                },
            },
        };

        // Upload files to Google Drive
        let index2Link = null;
        let agreementLink = null;

        if (type.toLowerCase() === 'owner' && index2File) {
            const fileName = `${wing.toUpperCase()}-${flatNo.trim()}-${fullName.trim()}-index2${path.extname(index2File.originalname)}`;
            index2Link = await uploadFileToGoogleDrive(index2File, fileName);
        } else if (type.toLowerCase() === 'tenant' && agreementFile) {
            const fileName = `${wing.toUpperCase()}-${flatNo.trim()}-${fullName.trim()}-agreement${path.extname(agreementFile.originalname)}`;
            agreementLink = await uploadFileToGoogleDrive(agreementFile, fileName);
        }

        // Add type-specific details
        if (type.toLowerCase() === 'owner') {
            memberData.ownerDetails = { index2: index2Link };
            memberData.tenantDetails = { agreement: null, lastDayOfAgreement: null };
        } else {
            memberData.tenantDetails = {
                agreement: agreementLink,
                lastDayOfAgreement: new Date(tenantDetails.lastDayOfAgreement),
            };
            memberData.ownerDetails = { index2: null };
        }

        const member = new Member(memberData);
        await member.save();

        res.status(201).json({
            success: true,
            message: 'Member registered successfully!',
            data: member,
        });
    } catch (error) {
        console.error('Create Member Error:', error);
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

module.exports = { createMember };
