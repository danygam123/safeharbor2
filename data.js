const RESOURCES_DATA = [
  {
    id: "res-1",
    title: "[PLACEHOLDER] Understanding Naloxone (Narcan) Nasal Spray — SAMHSA",
    org: "SAMHSA",
    type: "video",
    audiences: ["helper/peer", "patient"],
    topics: ["naloxone", "overdose-response"],
    url: "https://www.samhsa.gov/resource/dbh/understanding-naloxone",
    description: "A step-by-step video guide explaining what naloxone is, how it works in the brain, and how to obtain it from local pharmacies."
  },
  {
    id: "res-2",
    title: "[PLACEHOLDER] Fentanyl Myths vs. Facts — CDC",
    org: "CDC",
    type: "infographic",
    audiences: ["teen", "helper/peer", "clinician/educator"],
    topics: ["fentanyl-awareness"],
    url: "https://www.cdc.gov/stopoverdose/fentanyl/index.html",
    description: "A clear, visual breakdown addressing common misconceptions about skin exposure, potency, and detection methods."
  },
  {
    id: "res-3",
    title: "[PLACEHOLDER] Recognizing the Signs of an Opioid Overdose — NIDA",
    org: "NIDA",
    type: "article",
    audiences: ["teen", "helper/peer", "patient"],
    topics: ["overdose-response"],
    url: "https://nida.nih.gov/publications/drugfacts/naloxone",
    description: "Learn to recognize the critical physical signs of an active overdose, including pinpoint pupils, cold clammy skin, and shallow breathing."
  },
  {
    id: "res-4",
    title: "[PLACEHOLDER] Navigating Early Recovery: A Guide for Young Adults — SAMHSA",
    org: "SAMHSA",
    type: "pdf",
    audiences: ["teen", "patient"],
    topics: ["recovery-support"],
    url: "https://store.samhsa.gov/product/navigating-recovery-young-adults",
    description: "A downloadable handbook containing coping mechanisms, community resources, and peer guidance for the first 90 days of recovery."
  },
  {
    id: "res-5",
    title: "[PLACEHOLDER] How to Talk to a Loved One About Substance Use — NIDA",
    org: "NIDA",
    type: "article",
    audiences: ["helper/peer", "clinician/educator"],
    topics: ["family-support"],
    url: "https://nida.nih.gov/publications/family-checkup",
    description: "Evidence-based communication techniques for families, focusing on reducing stigma, active listening, and setting boundaries."
  },
  {
    id: "res-6",
    title: "[PLACEHOLDER] Naloxone Administration for School Educators — Local Health Department",
    org: "Local Health Department",
    type: "video",
    audiences: ["clinician/educator"],
    topics: ["naloxone", "overdose-response"],
    url: "https://www.naccho.org/programs/community-health/injury-violence-prevention/naloxone",
    description: "An instructional walkthrough video designed for teachers, administrators, and campus staff on emergency protocol."
  },
  {
    id: "res-7",
    title: "[PLACEHOLDER] Fentanyl Awareness Toolkit for Parents — CDC",
    org: "CDC",
    type: "pdf",
    audiences: ["helper/peer", "clinician/educator"],
    topics: ["fentanyl-awareness", "family-support"],
    url: "https://www.cdc.gov/stopoverdose/fentanyl/parents-toolkit.html",
    description: "A downloadable toolkit with conversation starters, key facts, and local emergency contact lists for parents."
  },
  {
    id: "res-8",
    title: "[PLACEHOLDER] Peer Support Specialist Roles in Recovery — SAMHSA",
    org: "SAMHSA",
    type: "article",
    audiences: ["helper/peer", "patient"],
    topics: ["recovery-support"],
    url: "https://www.samhsa.gov/brss-tacs/recovery-support-tools/peer-support-services",
    description: "Exploring how lived experience helps break down recovery barriers and provides reliable community mentorship."
  },
  {
    id: "res-9",
    title: "[PLACEHOLDER] Understanding Opioid Use Disorder and Treatment Options — NIDA",
    org: "NIDA",
    type: "video",
    audiences: ["patient", "clinician/educator"],
    topics: ["recovery-support"],
    url: "https://nida.nih.gov/publications/research-reports/medications-to-treat-opioid-addiction",
    description: "A brief animated overview of medical treatments (MOUD) such as buprenorphine and methadone, explaining their neurological mechanism."
  },
  {
    id: "res-10",
    title: "[PLACEHOLDER] Rapid Response Protocol for Community Organizers — Local Health Department",
    org: "Local Health Department",
    type: "infographic",
    audiences: ["helper/peer", "clinician/educator"],
    topics: ["overdose-response"],
    url: "https://www.naccho.org/resources",
    description: "A simple visual flowchart explaining how to organize naloxone distribution and community emergency plans."
  }
];

const QUICK_FACTS = [
  {
    id: "fact-1",
    fact: "Did you know Naloxone (Narcan) has no effect on non-opioid overdoses?",
    detail: "Naloxone only reverses overdoses caused by opioids (like fentanyl, heroin, oxycodone). However, if you are unsure what substances were taken, it is always safe to administer it, as it will not harm someone who hasn't taken opioids."
  },
  {
    id: "fact-2",
    fact: "Did you know most states have Good Samaritan Laws?",
    detail: "Good Samaritan Laws protect bystanders who call 911 or administer naloxone during an overdose from arrest, charge, or prosecution for minor drug offenses. The law is designed to prioritize saving lives over making arrests."
  },
  {
    id: "fact-3",
    fact: "Did you know that you cannot overdose simply by touching fentanyl?",
    detail: "Scientific consensus shows that brief skin exposure to dry fentanyl is extremely unlikely to cause toxicity or an overdose. The primary risk comes from ingestion, inhalation, or contact with open membranes. Wash hands with soap and water if you suspect contact."
  },
  {
    id: "fact-4",
    fact: "Did you know that naloxone starts working in 2 to 3 minutes?",
    detail: "Naloxone acts quickly to block opioid receptors. However, it only stays active in the body for 30 to 90 minutes. Because many opioids last longer than that, the person can relapse into an overdose, which is why calling 911 immediately is critical."
  }
];

const CHECKLIST_STEPS = [
  {
    step: 1,
    title: "Recognize the Signs",
    short: "Identify overdose indicators",
    detail: "Look and listen: check for extremely slow or stopped breathing, blue or pale lips and fingernails, cold or clammy skin, pinpoint pupils, and inability to wake up (try rubbing your knuckles hard in the center of their chest)."
  },
  {
    step: 2,
    title: "Call 911 Immediately",
    short: "Get professional medical help",
    detail: "Dial 911. Provide your exact location. Clearly state: 'Someone is unresponsive and not breathing.' Do not worry about drug possession charges; Good Samaritan Laws protect you."
  },
  {
    step: 3,
    title: "Administer Naloxone",
    short: "Use Narcan spray if available",
    detail: "Peel the device package. Place the nozzle in either nostril until your fingers touch the bottom of the nose. Press the plunger firmly to release the spray. If they do not respond in 2-3 minutes, administer a second dose in the other nostril."
  },
  {
    step: 4,
    title: "Perform Recovery Position",
    short: "Keep the airway clear",
    detail: "If they are breathing on their own, roll them onto their side. Fold their top knee and elbow to support their body. Tilt their chin up slightly to keep the throat clear. This prevents choking."
  },
  {
    step: 5,
    title: "Wait and Monitor",
    short: "Stay with them until EMS arrives",
    detail: "Keep watching their breathing. If they stop breathing, perform rescue breathing (mouth-to-mouth) if you are trained. Stay by their side until paramedics arrive. You can give additional naloxone if breathing fades again."
  }
];

// Assign to window objects for easy access in our pure HTML/JS frontend setup
window.RESOURCES_DATA = RESOURCES_DATA;
window.QUICK_FACTS = QUICK_FACTS;
window.CHECKLIST_STEPS = CHECKLIST_STEPS;
