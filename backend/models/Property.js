const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  projectName: {
    type: String,
    default: ''  // Made optional
  },
  companyName: {
    type: String,
    default: ''
  },
  companyLogoUrl: {  // Square company/builder logo shown beside this property wherever it's listed
    type: String,
    default: ''
  },
  propertyShareOption: {  // Who is listing this property: the builder, or the owner/landlord
    type: String,
    enum: ['', 'builder', 'owner'],
    default: ''
  },
  listingIntent: {
    type: String,
    enum: ['development', 'buy', 'sell'],
    default: 'development',
    index: true
  },
  developmentType: { 
    type: String, 
    required: true 
  },
  totalArea: { 
    type: String, 
    required: true 
  },
  areaUnit: {
    type: String,
    default: 'Sq Yards'
  },
  flatSize: {
    type: String,
    default: ''
  },
  flatSizeMin: {
    type: String,
    default: ''
  },
  flatSizeMax: {
    type: String,
    default: ''
  },
  flatFacing: {
    type: String,
    default: ''
  },
  projectTotalUnits: {
    type: String,
    default: ''
  },
  // Plot dimensions for all four sides (in feet)
  northSideLength: { 
    type: String, 
    default: '' 
  },
  southSideLength: { 
    type: String, 
    default: '' 
  },
  eastSideLength: { 
    type: String, 
    default: '' 
  },
  westSideLength: { 
    type: String, 
    default: '' 
  },
  dimensions: { 
    type: String, 
    default: '' 
  },
  roadSize: { 
    type: String, 
    default: ''  // In feet now
  },
  frontageWidth: {
    type: String,
    default: ''
  },
  roadFacingDirection: {
    type: String,
    default: ''
  },
  pincode: {
    type: String,
    default: '',
    index: true
  },
  zoningClassification: {
    type: String,
    default: ''
  },
  developerRatio: { 
    type: String, 
    default: '' 
  },
  partlySale: {
    type: String,
    enum: ['', 'yes', 'no'],
    default: ''
  },
  partlySaleUnit: {
    type: String,
    enum: ['', 'Square Yard', 'Square Feet', 'Acres'],
    default: 'Square Yard'
  },
  partlySaleValue: {
    type: String,
    default: '0'
  },
  partlySalePrice: {
    type: String,
    default: ''
  },
  facing: { 
    type: String, 
    default: '' 
  },
  goodwill: { 
    type: String, 
    default: ''  // Optional
  },
  advance: { 
    type: String, 
    default: ''  // Optional
  },
  squareYardPrice: {
    type: String,
    default: ''
  },
  squareFeetPrice: {
    type: String,
    default: ''
  },
  totalBudget: {
    type: String,
    default: ''
  },
  totalBudgetOnwards: {
    type: Boolean,
    default: false
  },
  amenitiesChargeExtra: {
    type: String,
    default: ''
  },
  priceRange: {
    type: String,
    default: ''
  },
  purchaseTimeline: {
    type: String,
    default: ''
  },
  address: { 
    type: String, 
    default: '' 
  },
  city: { 
    type: String, 
    required: true 
  },
  state: {
    type: String,
    default: ''
  },
  landmark: { 
    type: String, 
    required: true  // Made required
  },
  locality: { 
    type: String, 
    required: true 
  },
  societyName: {  // NEW: For apartment/society name
    type: String,
    default: ''
  },
  bedrooms: {
    type: String,
    default: ''
  },
  bathrooms: {
    type: String,
    default: ''
  },
  bhkBathrooms: {  // Per-BHK bathroom counts, e.g. { "2 BHK": "2", "3 BHK": "3" }
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  floorNumber: {
    type: String,
    default: ''
  },
  totalFloors: {
    type: String,
    default: ''
  },
  furnishingStatus: {
    type: String,
    enum: ['', 'Unfurnished', 'Semi-Furnished', 'Fully-Furnished'],
    default: ''
  },
  possessionStatus: {
    type: String,
    enum: ['', 'Ready to Move', 'Under Construction'],
    default: ''
  },
  possessionDate: {
    type: String,
    default: ''
  },
  reraId: {
    type: String,
    default: ''
  },
  localityHighlights: {
    type: String,
    default: ''
  },
  projectHighlights: {
    type: String,
    default: ''
  },
  map: { 
    type: String, 
    default: '' 
  },
  coordinates: { 
    type: String, 
    default: '' 
  },
  description: { 
    type: String, 
    default: ''  // Optional
  },
  selectedAmenities: { 
    type: [String], 
    default: [] 
  },
  imageUrl: {
    type: String,
    default: ''
  },
  images: {  // Photo gallery (multiple property images)
    type: [String],
    default: []
  },
  plotDiagramUrl: {  // NEW: For 2D plot diagram
    type: String,
    default: ''
  },
  floorPlanUrl: {  // Flat floor plan image (legacy single plan)
    type: String,
    default: ''
  },
  floorPlanUnits: {  // Per-unit floor plans: BHK type, size, price, image, and room dimensions
    type: [{
      bedrooms: { type: String, default: '' },
      size: { type: String, default: '' },
      price: { type: String, default: '' },
      plotSizeSqYd: { type: String, default: '' },
      dimension: { type: String, default: '' },
      unitFacing: { type: String, default: '' },
      imageUrl: { type: String, default: '' },
      imageUrls: { type: [String], default: [] },
      rooms: {
        type: [{
          name: { type: String, default: '' },
          dimension: { type: String, default: '' }
        }],
        default: []
      }
    }],
    default: []
  },
  propertyFormUrl: {  // Uploaded property form / document
    type: String,
    default: ''
  },
  costSheetUrl: {  // Uploaded cost sheet (PDF/JPEG/PNG)
    type: String,
    default: ''
  },
  videoUrl: {
    type: String,
    default: ''
  },
  contactEmail: { 
    type: String, 
    default: '' 
  },
  contactPhone: { 
    type: String, 
    default: '' 
  },
  userId: { 
    type: String, 
    required: true,
    index: true 
  },
  phone: { 
    type: String, 
    default: '',
    index: true 
  },
  dealStatus: { 
    type: String, 
    default: 'open',
    enum: ['open', 'closed']
  },
  status: {  // NEW: For admin approval
    type: String,
    default: 'pending',
    enum: ['pending', 'approved', 'rejected']
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  approvedAt: {
    type: Date,
    default: null
  },
  expiresAt: {  // Set from the listing owner's active subscription plan validity (Basic/Premium+/Assist/Super Assist). Null means no expiry.
    type: Date,
    default: null,
    index: true
  },
  contactRevealRule: {
    type: String,
    enum: ['mutual_interest'],
    default: 'mutual_interest'
  },
  source: {
    type: String,
    enum: ['', 'manual', 'admin_assisted', 'whatsapp_webhook', 'whatsapp_manual'],
    default: '',
    index: true
  },
  whatsappIntakeId: {
    type: String,
    default: '',
    index: true
  },
  whatsappMediaIds: {
    type: [String],
    default: []
  },
  intakePeriod: {
    type: String,
    enum: ['', 'morning', 'evening'],
    default: '',
    index: true
  }
}, { 
  timestamps: true 
});

// Add indexes for common queries
propertySchema.index({ city: 1, locality: 1 });
propertySchema.index({ developmentType: 1 });
propertySchema.index({ dealStatus: 1 });
propertySchema.index({ status: 1 });

module.exports = mongoose.model('Property', propertySchema);
