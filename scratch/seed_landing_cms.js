const mongoose = require('mongoose');
const CmsPage = require('./server/src/models/CmsPage');
const config = require('./server/src/config');

const seedCms = async () => {
  try {
    await mongoose.connect(config.database.uri || 'mongodb://localhost:27017/lostlink');
    console.log('Connected to DB');

    const landingData = {
      title: "Main Landing Page",
      slug: "landing-page",
      type: "page",
      status: "published",
      metadata: {
        hero: {
          title: "Found Something?",
          subtitle: "We'll Find the Owner.",
          description: "The university's most advanced lost and found network. AI matching, secure chat, and professional recovery tracking."
        },
        steps: [
          { icon: "FiCamera", title: "Snap & Report", desc: "Upload photos of the item you found or lost." },
          { icon: "FiSearch", title: "AI Scan", desc: "Our neural networks compare items in milliseconds." },
          { icon: "FiMessageCircle", title: "Secure Chat", desc: "Connect with verified students and staff." },
          { icon: "FiShield", title: "Handover", desc: "Meet at a secure location and confirm recovery." }
        ],
        about: {
          title: "Powered by Innovation",
          content: "Built specifically for DBU, LostLink combines artificial intelligence with a student-first approach to ensure that nothing stays lost for long.",
          stats: [
            { label: "Resolved Cases", value: "2.5K" },
            { label: "Avg. Return Time", value: "48h" },
            { label: "Satisfied Users", value: "10K" }
          ]
        },
        contact: {
          email: "admin@lostlink.dbu.edu",
          phone: "+251 11 987 6543",
          location: "Debre Berhan University, Main Campus"
        }
      }
    };

    await CmsPage.findOneAndUpdate(
      { slug: 'landing-page' },
      landingData,
      { upsert: true, new: true }
    );

    console.log('Landing page CMS data seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
};

seedCms();
