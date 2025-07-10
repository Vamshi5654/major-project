require("dotenv").config();
const mongoose = require("mongoose");
const Listing = require("./models/listing");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");

const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

// Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/wanderlust")
  .then(() => {
    console.log("✅ MongoDB connected");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });

async function updateOldListingsWithGeometry() {
  try {
    const listings = await Listing.find({ geometry: { $exists: false } });

    for (let listing of listings) {
      if (!listing.location) {
        console.log(`⚠️ Skipping ${listing.title} (no location set)`);
        continue;
      }

      const geoRes = await geocodingClient
        .forwardGeocode({
          query: listing.location,
          limit: 1,
        })
        .send();

      const geoData = geoRes.body.features[0]?.geometry;

      if (geoData) {
        listing.geometry = geoData;
        await listing.save();
        console.log(`✅ Updated: ${listing.title}`);
      } else {
        console.log(`❌ No coordinates found for: ${listing.location}`);
      }
    }

    console.log("🎉 Done updating listings!");
  } catch (e) {
    console.error("🔥 Error during update:", e);
  } finally {
    mongoose.connection.close();
  }
}

updateOldListingsWithGeometry();
