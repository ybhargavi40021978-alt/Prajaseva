export const INITIAL_DATA = {
  // Empty profile data by default - user fills it up!
  profile: {
    name: "",
    email: "",
    phone: "",
    aadhaar: "",
    dob: "",
    gender: "",
    district: "",
    mandal: "",
    address: "",
    avatar: "/citizen_avatar.png"
  },
  
  categories: [
    {
      id: "certificates",
      title: "Citizen Certificates",
      subtitle: "Income, Caste, Residence, Birth, Death & Land Records",
      icon: "file-text",
      logoClass: "logo-revenue",
      count: 14,
      targetView: "service-certificates",
      desc: "Apply for official government certificates & land records"
    },
    {
      id: "education",
      title: "Education & Scholarships",
      subtitle: "Vidya Deevena, Vasathi Deevena, Admissions",
      icon: "graduation-cap",
      logoClass: "logo-education",
      count: 18,
      targetView: "dept-education",
      desc: "Student assistance, fee reimbursement & academic support"
    },
    {
      id: "health",
      title: "Health & Medical Welfare",
      subtitle: "Dr. YSR Aarogyasri, CMRF, Cashless Hospitalization",
      icon: "heart-pulse",
      logoClass: "logo-health",
      count: 15,
      targetView: "dept-health",
      desc: "Comprehensive health insurance & medical expense relief"
    },
    {
      id: "agriculture",
      title: "Agriculture & Farmers Welfare",
      subtitle: "Rythu Bharosa, e-Crop Booking, Seed Subsidies",
      icon: "sprout",
      logoClass: "logo-agriculture",
      count: 22,
      targetView: "dept-agriculture",
      desc: "Rythu Bharosa, seed subsidy & financial aid for farmers"
    },
    {
      id: "municipal",
      title: "Municipal & Civic Amenities",
      subtitle: "Property Tax, Drinking Water Tap, Building Plans",
      icon: "landmark",
      logoClass: "logo-municipal",
      count: 31,
      targetView: "dept-municipal",
      desc: "Civic complaints, water supply, tax payment & urban development"
    },
    {
      id: "transport",
      title: "Transport & RTO Services",
      subtitle: "Driving License, LLR Slot, RC Transfer & Tax",
      icon: "car",
      logoClass: "logo-transport",
      count: 16,
      targetView: "dept-transport",
      desc: "RTO services, learner license, driving test slot booking"
    },
    {
      id: "housing",
      title: "Housing & Site Allotment",
      subtitle: "Pedalandariki Illu, House Site Pattas, Subsidies",
      icon: "home",
      logoClass: "logo-housing",
      count: 12,
      targetView: "dept-housing",
      desc: "Navaratnalu Pedalandarikki Illu housing assistance"
    },
    {
      id: "revenue",
      title: "Revenue & Land Records",
      subtitle: "Webland 1B, Adangal, Mutation & Title Deeds",
      icon: "map",
      logoClass: "logo-revenue",
      count: 24,
      targetView: "dept-revenue",
      desc: "Digital land records mutation and revenue administration"
    }
  ],

  departments: [
    {
      id: "revenue",
      name: "Revenue Department",
      subtitle: "Caste, Income, Residence, Land Records, Adangal",
      icon: "building-columns",
      targetView: "dept-revenue",
      servicesCount: 24,
      services: [
        "Integrated Caste & Date of Birth Certificate",
        "Income & Asset Certificate (EWS / BC / SC / ST)",
        "Residence / Nativity Certificate",
        "Webland 1B / Adangal Verification",
        "Mutation of Land Record"
      ]
    },
    {
      id: "education-dept",
      name: "Education Department",
      subtitle: "Scholarships, Fee Reimbursement, Jagananna Vidya Deevena",
      icon: "graduation-cap",
      targetView: "dept-education",
      servicesCount: 19,
      services: [
        "Post-Matric Scholarship & Fee Reimbursement",
        "Jagananna Vasathi Deevena",
        "School Admission & Transfer Certificate Approval",
        "Merit Scholarship Application"
      ]
    },
    {
      id: "health-dept",
      name: "Health Department",
      subtitle: "YSR Aarogyasri Card, Medical Aid, Sanction",
      icon: "heart-pulse",
      targetView: "dept-health",
      servicesCount: 15,
      services: [
        "YSR Aarogyasri Health Card Renewal & Addition",
        "Chief Minister Relief Fund (CMRF) Medical Claim",
        "Universal Health Insurance Coverage Scheme",
        "Free Dialysis / Chronic Illness Support"
      ]
    },
    {
      id: "municipal",
      name: "Municipal Department",
      subtitle: "Property Tax, Water Bill, Building Approvals",
      icon: "landmark",
      targetView: "dept-municipal",
      servicesCount: 31,
      services: [
        "Property Tax Assessment & Online Payment",
        "New Water Connection & Tap Charges",
        "Building Plan Approval (AP-DPMS)",
        "Trade License Issuance & Renewal"
      ]
    },
    {
      id: "agri-dept",
      name: "Agriculture Department",
      subtitle: "Rythu Bharosa, Crop Insurance, Seed Subsidy",
      icon: "sprout",
      targetView: "dept-agriculture",
      servicesCount: 27,
      services: [
        "YSR Rythu Bharosa Payment Status",
        "Free Crop Insurance (e-Crop Registration)",
        "Subsidy Fertilizer & Seed Booking",
        "Farm Machinery Subsidy Registration"
      ]
    },
    {
      id: "transport-dept",
      name: "Transport Department",
      subtitle: "Driving License, LLR Slot, RC Transfer",
      icon: "car",
      targetView: "dept-transport",
      servicesCount: 16,
      services: [
        "Learner's License Slot Booking (LLR)",
        "Permanent Driving License Renewal",
        "Vehicle RC Transfer of Ownership",
        "Road Tax Clearance Certificate"
      ]
    }
  ],

  schemesList: [
    {
      id: "fee-reimbursement",
      title: "Fee Reimbursement",
      subtitle: "Jagananna Vidya Deevena Fee Reimbursement Scheme",
      dept: "Education Department",
      targetView: "scheme-fee-reimbursement",
      icon: "graduation-cap",
      badge: "100% Tuition Fee",
      desc: "Complete financial support for tuition fees of eligible SC, ST, BC, EBC, Kapu, Minority students."
    },
    {
      id: "aarogyasri",
      title: "YSR Aarogyasri Health Scheme",
      subtitle: "Cashless Medical Treatment Up to ₹5 Lakhs",
      dept: "Health Department",
      targetView: "scheme-aarogyasri",
      icon: "heart-pulse",
      badge: "Cashless Healthcare",
      desc: "Free super-specialty medical treatment for BPL families across empaneled hospitals."
    },
    {
      id: "rythu-bharosa",
      title: "YSR Rythu Bharosa",
      subtitle: "Annual Financial Assistance of ₹13,500 for Farmers",
      dept: "Agriculture Department",
      targetView: "scheme-rythu-bharosa",
      icon: "sprout",
      badge: "₹13,500 / Year",
      desc: "Direct benefit transfer for farmer families to support input costs before crop seasons."
    }
  ],

  initialApplications: [],
  initialGrievances: []
};
