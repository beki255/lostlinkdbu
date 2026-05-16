const mongoose = require('mongoose');
const CmsPage = require('./src/models/CmsPage');
const config = require('./src/config');

const seedCms = async () => {
  try {
    // Attempt to use the URI from config, or fallback
    const dbUri = config.mongodb.uri || 'mongodb://localhost:27017/lostlink';
    await mongoose.connect(dbUri);
    console.log('Connected to DB:', dbUri);

    const landingData = {
      title: "Main Landing Page",
      slug: "landing-page",
      type: "page",
      status: "published",
      metadata: {
        hero: {
          title: "Lost Something?",
          subtitle: "We Help You Find It.",
          description: "LostLink DBU is your intelligent campus companion — report, search, and reclaim lost items with AI-powered matching and secure verification."
        },
        steps: [
          { icon: "FiCamera", title: "Snap & Report", desc: "Snap a photo and describe the item you lost or found." },
          { icon: "FiSearch", title: "AI Matching", desc: "Our smart algorithms scan for potential matches instantly." },
          { icon: "FiMessageCircle", title: "Connect", desc: "Chat securely with the other party to arrange a return." },
          { icon: "FiShield", title: "Recover", desc: "Safe handover with secure verification protocols." }
        ],
        about: {
          title: "Reuniting Communities",
          content: "We believe in the power of community and technology. LostLink was built to streamline the recovery process at Debre Berhan University, reducing stress and increasing recovery rates through intelligent automation.",
          stats: [
            { label: "Items Recovered", value: "1,200+" },
            { label: "Success Rate", value: "94%" },
            { label: "Campus Users", value: "5,000+" }
          ]
        },
        contact: {
          email: "support@dbu.edu.et",
          phone: "+251 11 123 4567",
          location: "Main Campus, Admin Building, Room 204"
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
