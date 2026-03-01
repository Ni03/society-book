const mongoose = require('mongoose');

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
            cars: {
                count: {
                    type: Number,
                    required: true,
                    min: [0, 'Car count cannot be negative'],
                    default: 0,
                },
                registrationNumbers: {
                    type: [String],
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

// Pre-save middleware to normalize registration numbers
memberSchema.pre('save', async function () {
    if (this.vehicles.bikes.registrationNumbers) {
        this.vehicles.bikes.registrationNumbers =
            this.vehicles.bikes.registrationNumbers.map((r) =>
                r.trim().toUpperCase().replace(/\s+/g, '')
            );
    }
    if (this.vehicles.cars.registrationNumbers) {
        this.vehicles.cars.registrationNumbers =
            this.vehicles.cars.registrationNumbers.map((r) =>
                r.trim().toUpperCase().replace(/\s+/g, '')
            );
    }
});

// Pre-findOneAndUpdate middleware to normalize registration numbers
memberSchema.pre('findOneAndUpdate', async function () {
    const update = this.getUpdate();
    if (update?.vehicles?.bikes?.registrationNumbers) {
        update.vehicles.bikes.registrationNumbers =
            update.vehicles.bikes.registrationNumbers.map((r) =>
                r.trim().toUpperCase().replace(/\s+/g, '')
            );
    }
    if (update?.vehicles?.cars?.registrationNumbers) {
        update.vehicles.cars.registrationNumbers =
            update.vehicles.cars.registrationNumbers.map((r) =>
                r.trim().toUpperCase().replace(/\s+/g, '')
            );
    }
});

// Indexes for vehicle search optimization
memberSchema.index({ wing: 1, 'vehicles.bikes.registrationNumbers': 1 });
memberSchema.index({ wing: 1, 'vehicles.cars.registrationNumbers': 1 });
memberSchema.index({ wing: 1, type: 1 });

const Member = mongoose.model('Member', memberSchema);

module.exports = Member;
