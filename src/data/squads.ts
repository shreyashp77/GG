import {
  DATABASE_VERSION,
  type Contract,
  type DatabasePack,
  type FranchiseId,
  type Player,
  type PlayerRatings,
  type PlayerRole,
} from "../domain/models";
import { franchises } from "./franchises";

type RawPlayer = readonly [name: string, salaryLakhs: number, overseas?: true];

// Frozen from the official "TATA IPL 2026 – Playing Squad – 15.11.2025".
// "(T)" remains in the source name to preserve transfer markers.
const rawSquads: Record<FranchiseId, RawPlayer[]> = {
  csk: [
    ["Anshul Kamboj", 340], ["Gurjapneet Singh", 220], ["Jamie Overton", 150, true],
    ["MS Dhoni", 400], ["Mukesh Choudhary", 30], ["Nathan Ellis", 200, true],
    ["Noor Ahmad", 1000, true], ["Ramakrishna Ghosh", 30], ["Sanju Samson (T)", 1800],
    ["Ruturaj Gaikwad", 1800], ["Shivam Dube", 1200], ["Shreyas Gopal", 30],
    ["Syed Khaleel Ahmed", 480], ["Ayush Mhatre", 30], ["Dewald Brevis", 220, true],
    ["Urvil Patel", 30],
  ],
  dc: [
    ["Abhishek Porel", 400], ["Ajay Mandal", 30], ["Ashutosh Sharma", 380],
    ["Axar Patel", 1650], ["Dushmantha Chameera", 75, true], ["Karun Nair", 50],
    ["KL Rahul", 1400], ["Kuldeep Yadav", 1325], ["Madhav Tiwari", 40],
    ["Mitchell Starc", 1175, true], ["Mukesh Kumar", 800], ["Nitish Rana (T)", 420],
    ["Sameer Rizvi", 95], ["T. Natarajan", 1075], ["Tripurana Vijay", 30],
    ["Tristan Stubbs", 1000, true], ["Vipraj Nigam", 50],
  ],
  gt: [
    ["Anuj Rawat", 30], ["Glenn Phillips", 200, true], ["Gurnoor Singh Brar", 130],
    ["Ishant Sharma", 75], ["Jayant Yadav", 75], ["Jos Buttler", 1575, true],
    ["Kagiso Rabada", 1075, true], ["Kumar Kushagra", 65], ["Manav Suthar", 30],
    ["Mohammad Siraj", 1225], ["Mohd. Arshad Khan", 130], ["Nishant Sindhu", 30],
    ["Prasidh Krishna", 950], ["R. Sai Kishore", 200], ["Rahul Tewatia", 400],
    ["Rashid Khan", 1800, true], ["Sai Sudharsan", 850], ["Shahrukh Khan", 400],
    ["Shubman Gill", 1650], ["Washington Sundar", 320],
  ],
  kkr: [
    ["Ajinkya Rahane", 150], ["Angkrish Raghuvanshi", 300], ["Anukul Roy", 40],
    ["Harshit Rana", 400], ["Manish Pandey", 75], ["Ramandeep Singh", 400],
    ["Rinku Singh", 1300], ["Rovman Powell", 150, true], ["Sunil Narine", 1200, true],
    ["Umran Malik", 75], ["Vaibhav Arora", 180], ["Varun Chakaravarthy", 1200],
  ],
  lsg: [
    ["Abdul Samad", 420], ["Aiden Markram", 200, true], ["Akash Singh", 30],
    ["Arjun Tendulkar (T)", 30], ["Arshin Kulkarni", 30], ["Avesh Khan", 975],
    ["Ayush Badoni", 400], ["Digvesh Rathi", 30], ["Himmat Singh", 30],
    ["Manimaran Siddharth", 75], ["Matthew Breetzke", 75, true], ["Mayank Yadav", 1100],
    ["Md Shami (T)", 1000], ["Mitchell Marsh", 340, true], ["Mohsin Khan", 400],
    ["Nicholas Pooran", 2100, true], ["Prince Yadav", 30], ["Rishabh Pant", 2700],
    ["Shahbaz Ahmed", 240],
  ],
  mi: [
    ["Allah Ghazanfar", 480, true], ["Ashwani Kumar", 30], ["Corbin Bosch", 75, true],
    ["Deepak Chahar", 925], ["Hardik Pandya", 1635], ["Jasprit Bumrah", 1800],
    ["Mayank Markande (T)", 30], ["Mitchell Santner", 200, true], ["Naman Dhir", 525],
    ["Raghu Sharma", 30], ["Raj Angad Bawa", 30], ["Robin Minz", 65],
    ["Rohit Sharma", 1630], ["Ryan Rickelton", 100, true], ["Shardul Thakur (T)", 200],
    ["Sherfane Rutherford (T)", 260, true], ["Suryakumar Yadav", 1635],
    ["Tilak Verma", 800], ["Trent Boult", 1250, true], ["Will Jacks", 525, true],
  ],
  pbks: [
    ["Arshdeep Singh", 1800], ["Azmatullah Omarzai", 240, true], ["Harnoor Pannu", 30],
    ["Harpreet Brar", 150], ["Lockie Ferguson", 200, true], ["Marco Jansen", 700, true],
    ["Marcus Stoinis", 1100, true], ["Mitch Owen", 300, true], ["Musheer Khan", 30],
    ["Nehal Wadhera", 420], ["Prabhsimran Singh", 400], ["Priyansh Arya", 380],
    ["Pyla Avinash", 30], ["Shashank Singh", 550], ["Shreyas Iyer", 2675],
    ["Suryansh Shedge", 30], ["Vishnu Vinod", 95], ["Vyshak Vijaykumar", 180],
    ["Xavier Bartlett", 80, true], ["Yash Thakur", 160], ["Yuzvendra Chahal", 1800],
  ],
  rr: [
    ["Dhruv Jurel", 1400], ["Donovan Ferreira (T)", 100, true], ["Jofra Archer", 1250, true],
    ["Kwena Maphaka", 150, true], ["Lhuan-Dre Pretorious", 30, true],
    ["Nandre Burger", 350, true], ["Ravindra Jadeja (T)", 1400],
    ["Riyan Parag", 1400], ["Sam Curran (T)", 240, true], ["Sandeep Sharma", 400],
    ["Shimron Hetmyer", 1100, true], ["Shubham Dubey", 80], ["Tushar Deshpande", 650],
    ["Vaibhav Suryavanshi", 110], ["Yashaswi Jaiswal", 1800], ["Yudhvir Charak", 35],
  ],
  rcb: [
    ["Abhinandan Singh", 30], ["Bhuvneshwar Kumar", 1075], ["Devdutt Padikkal", 200],
    ["Jacob Bethell", 260, true], ["Jitesh Sharma", 1100], ["Josh Hazlewood", 1250, true],
    ["Krunal Pandya", 575], ["Nuwan Thushara", 160, true], ["Phil Salt", 1150, true],
    ["Rajat Patidar", 1100], ["Rasikh Dar", 600], ["Romario Shepherd", 150, true],
    ["Suyash Sharma", 260], ["Swapnil Singh", 50], ["Tim David", 300, true],
    ["Virat Kohli", 2100], ["Yash Dayal", 500],
  ],
  srh: [
    ["Abhishek Sharma", 1400], ["Aniket Verma", 30], ["Brydon Carse", 100, true],
    ["Eshan Malinga", 120, true], ["Harsh Dubey", 30], ["Harshal Patel", 800],
    ["Heinrich Klaasen", 2300, true], ["Ishan Kishan", 1125], ["Jaydev Unadkat", 100],
    ["Kamindu Mendis", 75, true], ["Nitish Kumar Reddy", 600], ["Pat Cummins", 1800, true],
    ["Smaran Ravichandaran", 30], ["Travis Head", 1400, true], ["Zeeshan Ansari", 40],
  ],
};

const wicketkeepers = new Set([
  "MS Dhoni", "Sanju Samson (T)", "Urvil Patel", "Abhishek Porel", "KL Rahul",
  "Tristan Stubbs", "Anuj Rawat", "Jos Buttler", "Kumar Kushagra", "Nicholas Pooran",
  "Rishabh Pant", "Ryan Rickelton", "Robin Minz", "Prabhsimran Singh", "Vishnu Vinod",
  "Dhruv Jurel", "Donovan Ferreira (T)", "Lhuan-Dre Pretorious", "Jitesh Sharma",
  "Phil Salt", "Heinrich Klaasen", "Ishan Kishan",
]);
const bowlers = new Set([
  "Gurjapneet Singh", "Mukesh Choudhary", "Nathan Ellis", "Noor Ahmad", "Shreyas Gopal",
  "Syed Khaleel Ahmed", "Dushmantha Chameera", "Kuldeep Yadav", "Mitchell Starc",
  "Mukesh Kumar", "T. Natarajan", "Ishant Sharma", "Kagiso Rabada", "Mohammad Siraj",
  "Prasidh Krishna", "R. Sai Kishore", "Harshit Rana", "Umran Malik", "Vaibhav Arora",
  "Varun Chakaravarthy", "Avesh Khan", "Mayank Yadav", "Md Shami (T)", "Mohsin Khan",
  "Allah Ghazanfar", "Deepak Chahar", "Jasprit Bumrah", "Raghu Sharma", "Trent Boult",
  "Arshdeep Singh", "Lockie Ferguson", "Vyshak Vijaykumar", "Xavier Bartlett",
  "Yash Thakur", "Yuzvendra Chahal", "Jofra Archer", "Kwena Maphaka", "Nandre Burger",
  "Sandeep Sharma", "Tushar Deshpande", "Yudhvir Charak", "Bhuvneshwar Kumar",
  "Josh Hazlewood", "Nuwan Thushara", "Rasikh Dar", "Suyash Sharma", "Yash Dayal",
  "Brydon Carse", "Eshan Malinga", "Harshal Patel", "Jaydev Unadkat", "Pat Cummins",
]);
const allRounders = new Set([
  "Jamie Overton", "Shivam Dube", "Axar Patel", "Vipraj Nigam", "Glenn Phillips",
  "Washington Sundar", "Anukul Roy", "Ramandeep Singh", "Sunil Narine", "Abdul Samad",
  "Arshin Kulkarni", "Mitchell Marsh", "Shahbaz Ahmed", "Corbin Bosch", "Hardik Pandya",
  "Mitchell Santner", "Raj Angad Bawa", "Shardul Thakur (T)", "Sherfane Rutherford (T)",
  "Will Jacks", "Azmatullah Omarzai", "Harpreet Brar", "Marco Jansen", "Marcus Stoinis",
  "Mitch Owen", "Ravindra Jadeja (T)", "Riyan Parag", "Sam Curran (T)", "Jacob Bethell",
  "Krunal Pandya", "Romario Shepherd", "Swapnil Singh", "Kamindu Mendis",
  "Nitish Kumar Reddy", "Abhishek Sharma",
]);

function roleFor(name: string): PlayerRole {
  if (wicketkeepers.has(name)) return "wicketkeeper";
  if (allRounders.has(name)) return "all-rounder";
  if (bowlers.has(name)) return "bowler";
  return "batter";
}

function hash(text: string): number {
  let value = 2166136261;
  for (const character of text) {
    value ^= character.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function clamp(value: number): number {
  return Math.max(1, Math.min(100, Math.round(value)));
}

function ratingsFor(name: string, salary: number, role: PlayerRole): PlayerRatings {
  const noise = (offset: number) => ((hash(`${name}:${offset}`) % 15) - 7);
  const base = 38 + Math.sqrt(salary / 2700) * 48;
  const batBoost = role === "batter" || role === "wicketkeeper" ? 8 : role === "all-rounder" ? 3 : -16;
  const bowlBoost = role === "bowler" ? 9 : role === "all-rounder" ? 3 : -19;
  return {
    batting: {
      control: clamp(base + batBoost + noise(1)),
      power: clamp(base + batBoost + noise(2)),
      rotation: clamp(base + batBoost + noise(3)),
      pace: clamp(base + batBoost + noise(4)),
      spin: clamp(base + batBoost + noise(5)),
    },
    bowling: {
      accuracy: clamp(base + bowlBoost + noise(6)),
      economy: clamp(base + bowlBoost + noise(7)),
      threat: clamp(base + bowlBoost + noise(8)),
      variation: clamp(base + bowlBoost + noise(9)),
    },
    fielding: clamp(49 + noise(10) + Math.min(18, salary / 100)),
    wicketkeeping: role === "wicketkeeper" ? clamp(base + 9 + noise(11)) : clamp(12 + noise(11)),
    leadership: clamp(44 + noise(12) + Math.min(20, salary / 120)),
    fitness: clamp(66 + noise(13)),
    form: clamp(58 + noise(14)),
    potential: clamp(57 + noise(15)),
  };
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/\(t\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const players: Player[] = Object.entries(rawSquads).flatMap(([teamId, squad]) =>
  squad.map(([name, salaryLakhs, overseas]) => {
    const role = roleFor(name);
    return {
      id: `${teamId}-${slug(name)}`,
      name,
      nationality: overseas ? "Overseas — pending registry match" : "India",
      dateOfBirth: null,
      role,
      battingHand: "unknown",
      bowlingStyle: "Pending registry match",
      overseas: overseas ?? false,
      fictional: false,
      franchiseId: teamId as FranchiseId,
      salaryLakhs,
      metadataQuality: "fallback",
      ratings: ratingsFor(name, salaryLakhs, role),
    };
  }),
);

export const contracts: Contract[] = players.map((player) => ({
  playerId: player.id,
  franchiseId: player.franchiseId,
  salaryLakhs: player.salaryLakhs,
  season: 2027,
}));

export const database: DatabasePack = {
  version: DATABASE_VERSION,
  generatedAt: "2026-07-26",
  source: "Official TATA IPL 2026 Playing Squad, published 15 November 2025",
  franchises,
  players,
  contracts,
};

export const officialTeamTotals: Record<FranchiseId, {
  players: number;
  overseas: number;
  spentLakhs: number;
  purseLakhs: number;
  capAdjustmentLakhs: number;
}> = {
  // The cap adjustment reconciles listed contract deductions with the official
  // purse total (including retention/trade accounting not assigned to one row).
  csk: { players: 16, overseas: 4, spentLakhs: 8160, purseLakhs: 4340, capAdjustmentLakhs: 200 },
  dc: { players: 17, overseas: 3, spentLakhs: 10320, purseLakhs: 2180, capAdjustmentLakhs: 325 },
  gt: { players: 20, overseas: 4, spentLakhs: 11210, purseLakhs: 1290, capAdjustmentLakhs: 0 },
  kkr: { players: 12, overseas: 2, spentLakhs: 6070, purseLakhs: 6430, capAdjustmentLakhs: 600 },
  lsg: { players: 19, overseas: 4, spentLakhs: 10205, purseLakhs: 2295, capAdjustmentLakhs: 0 },
  mi: { players: 20, overseas: 7, spentLakhs: 12225, purseLakhs: 275, capAdjustmentLakhs: 0 },
  pbks: { players: 21, overseas: 6, spentLakhs: 11350, purseLakhs: 1150, capAdjustmentLakhs: 0 },
  rr: { players: 16, overseas: 7, spentLakhs: 10895, purseLakhs: 1605, capAdjustmentLakhs: 400 },
  rcb: { players: 17, overseas: 6, spentLakhs: 10860, purseLakhs: 1640, capAdjustmentLakhs: 0 },
  srh: { players: 15, overseas: 6, spentLakhs: 9950, purseLakhs: 2550, capAdjustmentLakhs: 0 },
};
