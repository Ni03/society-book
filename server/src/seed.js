const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('./models/Admin');

dotenv.config();

const WINGS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

const seedAdmins = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB for seeding');

        // Check if admins already exist
        const existingCount = await Admin.countDocuments();
        if (existingCount > 0) {
            console.log(`ℹ️  ${existingCount} admin(s) already exist. Skipping seed.`);
            console.log('   To re-seed, drop the admins collection first.');
            process.exit(0);
        }

        const admins = WINGS.map((wing) => ({
            username: `chairman${wing.toLowerCase()}`,
            password: `Chairman@${wing}123`,
            wing,
            role: 'chairman',
        }));

        admins.push({
            username: 'superadmin',
            password: 'SuperAdmin@123',
            wing: 'ALL',
            role: 'superadmin',
        });

        // Default security supervisor account
        admins.push({
            username: 'security',
            password: 'Security@123',
            wing: 'ALL',
            role: 'security',
        });

        for (const adminData of admins) {
            const admin = new Admin(adminData);
            await admin.save();
            console.log(
                `✅ Created: ${adminData.username} | Wing: ${adminData.wing} | Password: ${adminData.password}`
            );
        }

        console.log('\n🎉 All 11 chairman accounts created successfully!');
        console.log('\n📋 Login Credentials:');
        console.log('─'.repeat(50));
        admins.forEach((a) => {
            console.log(`  Wing ${a.wing}: username = ${a.username}, password = ${a.password}`);
        });
        console.log('─'.repeat(50));

        process.exit(0);
    } catch (error) {
        console.error('❌ Seed Error:', error);
        process.exit(1);
    }
};

seedAdmins();
