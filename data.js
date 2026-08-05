const RESOURCES_DATA = [
  // 1. Universal / Emergency (5 items)
  {
    id: "res-1",
    title: "SAMHSA Overdose Prevention and Response Kit",
    org: "SAMHSA",
    type: "pdf",
    audiences: ["teen", "helper/peer", "patient", "clinician/educator"],
    topics: ["overdose-response", "naloxone"],
    url: "https://library.samhsa.gov/sites/default/files/overdose-prevention-response-kit-pep23-03-00-001.pdf",
    description: "A comprehensive toolkit containing guidelines, strategies, and facts on preventing drug overdose, recognizing signs, and administering naloxone."
  },
  {
    id: "res-2",
    title: "SAMHSA Official Portal",
    org: "SAMHSA",
    type: "article",
    audiences: ["teen", "helper/peer", "patient", "clinician/educator"],
    topics: ["recovery-support", "family-support"],
    url: "https://www.samhsa.gov/",
    description: "Official resource portal of the Substance Abuse and Mental Health Services Administration, providing support pathways and directories."
  },
  {
    id: "res-3",
    title: "988 Suicide & Crisis Lifeline",
    org: "988 Lifeline",
    type: "article",
    audiences: ["teen", "helper/peer", "patient", "clinician/educator"],
    topics: ["recovery-support", "family-support"],
    url: "https://988lifeline.org",
    description: "Vetted crisis support connection page, linking individuals with free, confidential help, counselors, and local prevention centers."
  },
  {
    id: "res-4",
    title: "Narcan Training Video",
    org: "NEXT Distro",
    type: "video",
    audiences: ["teen", "helper/peer", "patient", "clinician/educator"],
    topics: ["naloxone", "overdose-response"],
    url: "https://nextdistro.org/resources-collection/narcan-training-video-next-distro",
    description: "An educational demonstration video covering standard overdose prevention and instructions on administering Narcan nasal spray."
  },
  {
    id: "res-5",
    title: "Layperson Naloxone Administration Course",
    org: "Overdose Lifeline",
    type: "video",
    audiences: ["teen", "helper/peer", "patient", "clinician/educator"],
    topics: ["naloxone", "overdose-response"],
    url: "https://www.overdoselifeline.org/opioid-training-and-courses/layperson-naloxone-administration/",
    description: "Online education module and demonstration detailing how a layperson can administer naloxone safely during an opioid crisis."
  },

  // 2. Teen Struggling (3 items)
  {
    id: "res-6",
    title: "NIDA for Teens: Drug Facts & Science",
    org: "NIDA",
    type: "article",
    audiences: ["teen"],
    topics: ["fentanyl-awareness", "recovery-support"],
    url: "https://www.riprc.org/resources/nida-for-teens-facts-on-drugs/",
    description: "Youth-centered facts and research explaining the science of drug use, risks, and peer support guides."
  },
  {
    id: "res-7",
    title: "ACF Behavioral Health for Young Adults",
    org: "ACF",
    type: "article",
    audiences: ["teen"],
    topics: ["recovery-support"],
    url: "https://acf.gov/behavioral-health/teens-and-young-adults",
    description: "Resources from the Administration for Children and Families focusing on mental health, resilience, and youth wellbeing."
  },
  {
    id: "res-8",
    title: "NIDA Research and Science Homepage",
    org: "NIDA",
    type: "article",
    audiences: ["teen"],
    topics: ["fentanyl-awareness", "recovery-support"],
    url: "https://nida.nih.gov",
    description: "The main portal for the National Institute on Drug Abuse, hosting science-based publications on addiction, prevention, and treatment."
  },

  // 3. I want to help someone (3 items)
  {
    id: "res-9",
    title: "Warning Signs of Substance Use Disorder",
    org: "NAATP",
    type: "article",
    audiences: ["helper/peer"],
    topics: ["family-support"],
    url: "https://www.naatp.org/warning-signs-substance-use-disorder",
    description: "Vetted indicators and behavior patterns compiled by the National Association of Addiction Treatment Providers to help identify SUD."
  },
  {
    id: "res-10",
    title: "Communities Talk: Prevention and Dialogue",
    org: "SAMHSA",
    type: "article",
    audiences: ["helper/peer"],
    topics: ["family-support"],
    url: "https://www.samhsa.gov/substance-use/prevention/communities-talk",
    description: "Action toolkits and planning templates to help families and communities initiate prevention discussions with youth."
  },
  {
    id: "res-11",
    title: "SAMHSA Overdose Prevention and Response Toolkit",
    org: "SAMHSA",
    type: "pdf",
    audiences: ["helper/peer"],
    topics: ["overdose-response", "naloxone"],
    url: "https://www.samhsa.gov/resource/recovery/overdose-prevention-response-toolkit",
    description: "Detailed toolkit with response training, instructions for administering naloxone, and local response plans."
  },

  // 4. I'm a patient (3 items)
  {
    id: "res-12",
    title: "Recognizing the Signs of Drug Problems",
    org: "NIDA",
    type: "article",
    audiences: ["patient"],
    topics: ["recovery-support"],
    url: "https://nida.nih.gov/research-topics/parents-educators/conversation-starters/what-are-signs-having-problem-drugs",
    description: "Guided indicators and self-reflection points to help individuals recognize warning signs of problematic drug use."
  },
  {
    id: "res-13",
    title: "Medications for Opioid Use Disorder (MOUD)",
    org: "NIDA",
    type: "article",
    audiences: ["patient"],
    topics: ["recovery-support"],
    url: "https://nida.nih.gov/research-topics/medications-opioid-use-disorder",
    description: "Clinical overview of FDA-approved medications (such as methadone, buprenorphine, and naltrexone) for OUD recovery."
  },
  {
    id: "res-14",
    title: "SAMHSA Recovery and Prevention Toolkit (Patient Edition)",
    org: "SAMHSA",
    type: "pdf",
    audiences: ["patient"],
    topics: ["overdose-response", "naloxone"],
    url: "https://www.samhsa.gov/resource/recovery/overdose-prevention-response-toolkit",
    description: "Patient-centered guidelines, overdose prevention tips, and evidence-based strategies for harm reduction."
  },

  // 5. I'm a clinician/educator (3 items)
  {
    id: "res-15",
    title: "Teacher Resources and Lesson Plans",
    org: "NIDA",
    type: "article",
    audiences: ["clinician/educator"],
    topics: ["fentanyl-awareness", "family-support"],
    url: "https://nida.nih.gov/research-topics/parents-educators/teachers",
    description: "Curriculum materials, science lesson plans, and teaching tools regarding neuroscience, drug use, and teen health."
  },
  {
    id: "res-16",
    title: "NIDA Portal for Parents and Educators",
    org: "NIDA",
    type: "article",
    audiences: ["clinician/educator"],
    topics: ["family-support"],
    url: "https://nida.nih.gov/research-topics/parents-educators",
    description: "Evidence-based guides, conversation toolkits, and scientific resources to assist educators in youth drug prevention."
  },
  {
    id: "res-17",
    title: "Preventing Drug Use among Children and Adolescents",
    org: "NIDA",
    type: "pdf",
    audiences: ["clinician/educator"],
    topics: ["family-support"],
    url: "https://nida.nih.gov/sites/default/files/redbook_0.pdf",
    description: "Research-based prevention guide for community leaders, clinicians, and educators, detailing effective youth programming principles."
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
