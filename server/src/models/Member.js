const mongoose = require('mongoose');

// ── Car entry sub-schema (cars have fastTag + parkingSlot) ────────────────────
const carEntrySchema = new mongoose.Schema(
    {
        regNo: {
            type: String,
            required: [true, 'Registration number is required'],
            trim: true,
        },
        fastTag: {
            type: Boolean,
            default: false,
        },
        // Parking slot number — empty string means not yet assigned
        parkingSlot: {
            type: String,
            default: '',
            trim: true,
        },
    },
    { _id: false }
);

// ── Main member schema ────────────────────────────────────────────────────────
const memberSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: [true, 'Full name is required'],
            minlength: [3, 'Full name must be at least 3 characters'],
            trim: true,
        },
        phoneNumber: {
            type: String,
            required: [true, 'Phone number is required'],
            validate: {
                validator: function (v) {
                    return /^\d{10}$/.test(v);
                },
                message: 'Phone number must be exactly 10 digits',
            },
        },
        flatNo: {
            type: String,
            required: [true, 'Flat number is required'],
            trim: true,
        },
        wing: {
            type: String,
            required: [true, 'Wing is required'],
            enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'],
            uppercase: true,
        },
        type: {
            type: String,
            required: [true, 'Type is required'],
            enum: ['owner', 'tenant'],
            lowercase: true,
        },
        vehicles: {
            // Bikes: simple array of registration number strings
            bikes: {
                count: {
                    type: Number,
                    required: true,
                    min: [0, 'Bike count cannot be negative'],
                    default: 0,
                },
                registrationNumbers: {
                    type: [String],
                    default: [],
                },
            },
            // Cars: structured list with fastTag and parkingSlot per vehicle
            cars: {
                count: {
                    type: Number,
                    required: true,
                    min: [0, 'Car count cannot be negative'],
                    default: 0,
                },
                list: {
                    type: [carEntrySchema],
                    default: [],
                },
            },
        },
        ownerDetails: {
            index2: {
                type: String,
                default: null,
            },
        },
        tenantDetails: {
            agreement: {
                type: String,
                default: null,
            },
            lastDayOfAgreement: {
                type: Date,
                default: null,
            },
        },
    },
    {
        timestamps: true,
    }
);

// ── Helper ────────────────────────────────────────────────────────────────────
const normalizeReg = (r) => (r || '').trim().toUpperCase().replace(/\s+/g, '');

// ── Pre-save: normalise all reg numbers ───────────────────────────────────────
memberSchema.pre('save', function () {
    // Bikes — plain strings
    if (this.vehicles?.bikes?.registrationNumbers) {
        this.vehicles.bikes.registrationNumbers =
            this.vehicles.bikes.registrationNumbers.map(normalizeReg);
        this.vehicles.bikes.count = this.vehicles.bikes.registrationNumbers.length;
    }
    // Cars — objects
    if (this.vehicles?.cars?.list) {
        this.vehicles.cars.list = this.vehicles.cars.list.map((v) => ({
            ...(v.toObject ? v.toObject() : v),
            regNo: normalizeReg(v.regNo),
        }));
        this.vehicles.cars.count = this.vehicles.cars.list.length;
    }
});

// ── Pre-findOneAndUpdate: normalise when vehicles are patched ──────────────────
memberSchema.pre('findOneAndUpdate', function () {
    const update = this.getUpdate();
    if (update?.vehicles?.bikes?.registrationNumbers) {
        update.vehicles.bikes.registrationNumbers =
            update.vehicles.bikes.registrationNumbers.map(normalizeReg);
        update.vehicles.bikes.count =
            update.vehicles.bikes.registrationNumbers.length;
    }
    if (update?.vehicles?.cars?.list) {
        update.vehicles.cars.list = update.vehicles.cars.list.map((v) => ({
            ...v,
            regNo: normalizeReg(v.regNo),
        }));
        update.vehicles.cars.count = update.vehicles.cars.list.length;
    }
});

// ── Indexes ───────────────────────────────────────────────────────────────────
memberSchema.index({ wing: 1, 'vehicles.bikes.registrationNumbers': 1 });
memberSchema.index({ wing: 1, 'vehicles.cars.list.regNo': 1 });
memberSchema.index({ wing: 1, type: 1 });

const Member = mongoose.model('Member', memberSchema);

module.exports = Member;
