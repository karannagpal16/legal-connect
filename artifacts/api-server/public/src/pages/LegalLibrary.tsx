import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Scale, ExternalLink, Search, ChevronDown, ChevronUp, Clock, Gavel } from "lucide-react";

const recentJudgements = [
  {
    title: "Supriyo @ Supriya Chakraborty & Anr. v. Union of India",
    citation: "Writ Petition (Civil) No. 1011 of 2022",
    court: "Supreme Court of India",
    date: "October 17, 2023",
    bench: "5-Judge Constitution Bench",
    summary: "The Supreme Court unanimously held that there is no fundamental right to marry under the Constitution. The Court declined to recognise same-sex marriage and left it to Parliament to legislate on the matter.",
    tags: ["Constitutional Law", "Fundamental Rights", "Marriage"],
    link: "https://indiankanoon.org/doc/193543132/",
  },
  {
    title: "Electoral Bonds Scheme Case – Association for Democratic Reforms v. Union of India",
    citation: "Writ Petition (Civil) No. 880 of 2017",
    court: "Supreme Court of India",
    date: "February 15, 2024",
    bench: "5-Judge Constitution Bench",
    summary: "The Supreme Court struck down the Electoral Bonds Scheme as unconstitutional, holding that anonymous political funding violates the right to information under Article 19(1)(a). The SBI was directed to submit all bond details to the Election Commission.",
    tags: ["Constitutional Law", "Election Law", "Right to Information"],
    link: "https://indiankanoon.org/doc/150228087/",
  },
  {
    title: "Property Owners Association v. State of Maharashtra",
    citation: "Civil Appeal No. 1012 of 2002",
    court: "Supreme Court of India",
    date: "November 5, 2024",
    bench: "9-Judge Constitution Bench",
    summary: "A 9-judge Constitution Bench (7:2 majority) held that not every private resource constitutes 'material resources of the community' under Article 39(b). The Court overruled the minority view in Kesavananda Bharati and clarified the scope of State's directive principle powers.",
    tags: ["Constitutional Law", "Property Rights", "Article 39(b)"],
    link: "https://indiankanoon.org/",
  },
  {
    title: "Bilkis Bano v. Union of India",
    citation: "Writ Petition (Criminal) No. 491 of 2022",
    court: "Supreme Court of India",
    date: "January 8, 2024",
    bench: "Division Bench",
    summary: "The Supreme Court quashed the Gujarat Government's premature release of convicts in the Bilkis Bano gang-rape and murder case, holding that the State of Gujarat lacked jurisdiction to grant remission as the trial was held in Maharashtra.",
    tags: ["Criminal Law", "Remission", "Jurisdiction"],
    link: "https://indiankanoon.org/doc/131217108/",
  },
  {
    title: "Arvind Kejriwal v. Directorate of Enforcement",
    citation: "Criminal Appeal No. 2609 of 2024",
    court: "Supreme Court of India",
    date: "September 13, 2024",
    bench: "Division Bench",
    summary: "The Supreme Court granted interim bail to Delhi CM Arvind Kejriwal in the Delhi liquor policy scam case, holding that the right to liberty under Article 21 cannot be curtailed merely on the basis of the seriousness of the allegation.",
    tags: ["Criminal Law", "Bail", "PMLA", "Article 21"],
    link: "https://indiankanoon.org/",
  },
  {
    title: "Chandrashekhar Singh v. State of Bihar (Sub-classification within SC/ST)",
    citation: "Civil Appeal No. 2317 of 2011",
    court: "Supreme Court of India",
    date: "August 1, 2024",
    bench: "7-Judge Constitution Bench",
    summary: "A 7-judge Constitution Bench (6:1 majority) overruled E.V. Chinnaiah and held that States have the constitutional power to sub-classify Scheduled Castes and Scheduled Tribes for the purpose of reservation to ensure adequate representation.",
    tags: ["Constitutional Law", "Reservation", "Equality", "SC/ST"],
    link: "https://indiankanoon.org/",
  },
  {
    title: "Right to Privacy in Digital Age – PUCL v. Union of India (Digital Personal Data)",
    citation: "Various Petitions",
    court: "Supreme Court of India",
    date: "2024 (Ongoing)",
    bench: "Division Bench",
    summary: "Ongoing challenge to the Digital Personal Data Protection Act, 2023, concerning the scope of exemptions granted to the government, data localisation requirements, and safeguards for citizens' digital privacy rights.",
    tags: ["Privacy", "Data Protection", "Technology Law"],
    link: "https://indiankanoon.org/",
  },
  {
    title: "Abhishek Singh v. High Court of Judicature at Allahabad",
    citation: "SLP (Civil) No. 8889 of 2023",
    court: "Supreme Court of India",
    date: "March 2024",
    bench: "Division Bench",
    summary: "The Supreme Court reiterated guidelines on the use of Section 482 CrPC (now Section 528 BNSS) for quashing FIRs, emphasising that inherent jurisdiction must be exercised sparingly to prevent abuse of process of court.",
    tags: ["Criminal Procedure", "FIR Quashing", "Section 482 CrPC"],
    link: "https://indiankanoon.org/",
  },
];

const bareActs = [
  {
    category: "Criminal Law",
    icon: "⚖️",
    acts: [
      { name: "Bharatiya Nyaya Sanhita (BNS), 2023", year: "2023", replaces: "Replaces IPC 1860", link: "https://www.indiacode.nic.in/handle/123456789/20062", note: "Effective July 1, 2024" },
      { name: "Indian Penal Code (IPC), 1860", year: "1860", link: "https://www.indiacode.nic.in/handle/123456789/2263", note: "Superseded by BNS 2023" },
      { name: "Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023", year: "2023", replaces: "Replaces CrPC 1973", link: "https://www.indiacode.nic.in/handle/123456789/20063", note: "Effective July 1, 2024" },
      { name: "Code of Criminal Procedure (CrPC), 1973", year: "1973", link: "https://www.indiacode.nic.in/handle/123456789/1357", note: "Superseded by BNSS 2023" },
      { name: "Bharatiya Sakshya Adhiniyam (BSA), 2023", year: "2023", replaces: "Replaces IEA 1872", link: "https://www.indiacode.nic.in/handle/123456789/20064", note: "Effective July 1, 2024" },
      { name: "Indian Evidence Act (IEA), 1872", year: "1872", link: "https://www.indiacode.nic.in/handle/123456789/1322", note: "Superseded by BSA 2023" },
      { name: "Prevention of Money Laundering Act (PMLA), 2002", year: "2002", link: "https://www.indiacode.nic.in/handle/123456789/2072" },
      { name: "Narcotic Drugs and Psychotropic Substances Act (NDPS), 1985", year: "1985", link: "https://www.indiacode.nic.in/handle/123456789/1818" },
      { name: "Arms Act, 1959", year: "1959", link: "https://www.indiacode.nic.in/handle/123456789/1598" },
      { name: "Explosives Act, 1884", year: "1884", link: "https://www.indiacode.nic.in/handle/123456789/2327" },
    ],
  },
  {
    category: "Constitutional Law",
    icon: "🏛️",
    acts: [
      { name: "The Constitution of India, 1950", year: "1950", link: "https://www.indiacode.nic.in/handle/123456789/15240" },
      { name: "Representation of the People Act, 1951", year: "1951", link: "https://www.indiacode.nic.in/handle/123456789/1910" },
      { name: "Representation of the People Act, 1950", year: "1950", link: "https://www.indiacode.nic.in/handle/123456789/1909" },
      { name: "Right to Information Act (RTI), 2005", year: "2005", link: "https://www.indiacode.nic.in/handle/123456789/1872" },
      { name: "Prevention of Corruption Act, 1988", year: "1988", link: "https://www.indiacode.nic.in/handle/123456789/1835" },
      { name: "Lokpal and Lokayuktas Act, 2013", year: "2013", link: "https://www.indiacode.nic.in/handle/123456789/2106" },
    ],
  },
  {
    category: "Civil & Procedural Law",
    icon: "📜",
    acts: [
      { name: "Code of Civil Procedure (CPC), 1908", year: "1908", link: "https://www.indiacode.nic.in/handle/123456789/1318" },
      { name: "Limitation Act, 1963", year: "1963", link: "https://www.indiacode.nic.in/handle/123456789/1353" },
      { name: "Specific Relief Act, 1963", year: "1963", link: "https://www.indiacode.nic.in/handle/123456789/1358" },
      { name: "Arbitration and Conciliation Act, 1996", year: "1996", link: "https://www.indiacode.nic.in/handle/123456789/1978" },
      { name: "Legal Services Authorities Act, 1987", year: "1987", link: "https://www.indiacode.nic.in/handle/123456789/1829" },
      { name: "Contempt of Courts Act, 1971", year: "1971", link: "https://www.indiacode.nic.in/handle/123456789/1381" },
      { name: "Court Fees Act, 1870", year: "1870", link: "https://www.indiacode.nic.in/handle/123456789/2308" },
    ],
  },
  {
    category: "Contract & Commercial Law",
    icon: "🤝",
    acts: [
      { name: "Indian Contract Act, 1872", year: "1872", link: "https://www.indiacode.nic.in/handle/123456789/2187" },
      { name: "Sale of Goods Act, 1930", year: "1930", link: "https://www.indiacode.nic.in/handle/123456789/1460" },
      { name: "Partnership Act, 1932", year: "1932", link: "https://www.indiacode.nic.in/handle/123456789/1463" },
      { name: "Negotiable Instruments Act, 1881", year: "1881", link: "https://www.indiacode.nic.in/handle/123456789/2191" },
      { name: "Companies Act, 2013", year: "2013", link: "https://www.indiacode.nic.in/handle/123456789/2101" },
      { name: "Insolvency and Bankruptcy Code (IBC), 2016", year: "2016", link: "https://www.indiacode.nic.in/handle/123456789/11388" },
      { name: "Competition Act, 2002", year: "2002", link: "https://www.indiacode.nic.in/handle/123456789/2082" },
      { name: "Consumer Protection Act, 2019", year: "2019", link: "https://www.indiacode.nic.in/handle/123456789/13425" },
      { name: "SEBI Act, 1992", year: "1992", link: "https://www.indiacode.nic.in/handle/123456789/1950" },
      { name: "Foreign Exchange Management Act (FEMA), 1999", year: "1999", link: "https://www.indiacode.nic.in/handle/123456789/2047" },
    ],
  },
  {
    category: "Property Law",
    icon: "🏠",
    acts: [
      { name: "Transfer of Property Act, 1882", year: "1882", link: "https://www.indiacode.nic.in/handle/123456789/2340" },
      { name: "Registration Act, 1908", year: "1908", link: "https://www.indiacode.nic.in/handle/123456789/1343" },
      { name: "Indian Stamp Act, 1899", year: "1899", link: "https://www.indiacode.nic.in/handle/123456789/2380" },
      { name: "Land Acquisition Act, 2013 (RFCTLARR)", year: "2013", link: "https://www.indiacode.nic.in/handle/123456789/2107" },
      { name: "Real Estate (Regulation & Development) Act (RERA), 2016", year: "2016", link: "https://www.indiacode.nic.in/handle/123456789/11387" },
      { name: "Easements Act, 1882", year: "1882", link: "https://www.indiacode.nic.in/handle/123456789/2338" },
    ],
  },
  {
    category: "Family Law",
    icon: "👨‍👩‍👧",
    acts: [
      { name: "Hindu Marriage Act, 1955", year: "1955", link: "https://www.indiacode.nic.in/handle/123456789/1560" },
      { name: "Hindu Succession Act, 1956", year: "1956", link: "https://www.indiacode.nic.in/handle/123456789/1562" },
      { name: "Hindu Adoption and Maintenance Act, 1956", year: "1956", link: "https://www.indiacode.nic.in/handle/123456789/1561" },
      { name: "Hindu Minority and Guardianship Act, 1956", year: "1956", link: "https://www.indiacode.nic.in/handle/123456789/1564" },
      { name: "Special Marriage Act, 1954", year: "1954", link: "https://www.indiacode.nic.in/handle/123456789/1550" },
      { name: "Muslim Personal Law (Shariat) Application Act, 1937", year: "1937", link: "https://www.indiacode.nic.in/handle/123456789/1494" },
      { name: "Dissolution of Muslim Marriages Act, 1939", year: "1939", link: "https://www.indiacode.nic.in/handle/123456789/1501" },
      { name: "Guardianship and Wards Act, 1890", year: "1890", link: "https://www.indiacode.nic.in/handle/123456789/2360" },
      { name: "Protection of Women from Domestic Violence Act, 2005", year: "2005", link: "https://www.indiacode.nic.in/handle/123456789/15436" },
      { name: "Dowry Prohibition Act, 1961", year: "1961", link: "https://www.indiacode.nic.in/handle/123456789/1611" },
      { name: "Indian Divorce Act, 1869", year: "1869", link: "https://www.indiacode.nic.in/handle/123456789/2304" },
      { name: "Juvenile Justice Act, 2015", year: "2015", link: "https://www.indiacode.nic.in/handle/123456789/11311" },
    ],
  },
  {
    category: "Labour & Employment Law",
    icon: "👷",
    acts: [
      { name: "Code on Wages, 2019", year: "2019", link: "https://www.indiacode.nic.in/handle/123456789/13421" },
      { name: "Industrial Relations Code, 2020", year: "2020", link: "https://www.indiacode.nic.in/handle/123456789/15222" },
      { name: "Code on Social Security, 2020", year: "2020", link: "https://www.indiacode.nic.in/handle/123456789/15223" },
      { name: "Occupational Safety, Health and Working Conditions Code, 2020", year: "2020", link: "https://www.indiacode.nic.in/handle/123456789/15224" },
      { name: "Industrial Disputes Act, 1947", year: "1947", link: "https://www.indiacode.nic.in/handle/123456789/1520" },
      { name: "Factories Act, 1948", year: "1948", link: "https://www.indiacode.nic.in/handle/123456789/1530" },
      { name: "Minimum Wages Act, 1948", year: "1948", link: "https://www.indiacode.nic.in/handle/123456789/1533" },
      { name: "Employees' Provident Funds Act, 1952", year: "1952", link: "https://www.indiacode.nic.in/handle/123456789/1545" },
      { name: "Maternity Benefit Act, 1961", year: "1961", link: "https://www.indiacode.nic.in/handle/123456789/1612" },
      { name: "Payment of Gratuity Act, 1972", year: "1972", link: "https://www.indiacode.nic.in/handle/123456789/1391" },
      { name: "Sexual Harassment of Women at Workplace Act (POSH), 2013", year: "2013", link: "https://www.indiacode.nic.in/handle/123456789/2104" },
    ],
  },
  {
    category: "Tax & Revenue Law",
    icon: "📊",
    acts: [
      { name: "Income Tax Act, 1961", year: "1961", link: "https://www.indiacode.nic.in/handle/123456789/1624" },
      { name: "Goods and Services Tax (GST) Act, 2017", year: "2017", link: "https://www.indiacode.nic.in/handle/123456789/11396" },
      { name: "Customs Act, 1962", year: "1962", link: "https://www.indiacode.nic.in/handle/123456789/1641" },
      { name: "Central Excise Act, 1944", year: "1944", link: "https://www.indiacode.nic.in/handle/123456789/1511" },
      { name: "Benami Transactions (Prohibition) Act, 1988", year: "1988", link: "https://www.indiacode.nic.in/handle/123456789/1834" },
    ],
  },
  {
    category: "Intellectual Property Law",
    icon: "💡",
    acts: [
      { name: "Patents Act, 1970", year: "1970", link: "https://www.indiacode.nic.in/handle/123456789/1384" },
      { name: "Trade Marks Act, 1999", year: "1999", link: "https://www.indiacode.nic.in/handle/123456789/2031" },
      { name: "Copyright Act, 1957", year: "1957", link: "https://www.indiacode.nic.in/handle/123456789/1582" },
      { name: "Designs Act, 2000", year: "2000", link: "https://www.indiacode.nic.in/handle/123456789/2058" },
      { name: "Geographical Indications of Goods Act, 1999", year: "1999", link: "https://www.indiacode.nic.in/handle/123456789/2048" },
    ],
  },
  {
    category: "Technology & Data Law",
    icon: "💻",
    acts: [
      { name: "Information Technology Act (IT Act), 2000", year: "2000", link: "https://www.indiacode.nic.in/handle/123456789/1999" },
      { name: "Digital Personal Data Protection Act (DPDPA), 2023", year: "2023", link: "https://www.indiacode.nic.in/handle/123456789/20063" },
      { name: "Aadhaar (Targeted Delivery) Act, 2016", year: "2016", link: "https://www.indiacode.nic.in/handle/123456789/11389" },
      { name: "Telecom Regulatory Authority of India Act, 1997", year: "1997", link: "https://www.indiacode.nic.in/handle/123456789/1986" },
    ],
  },
  {
    category: "SC/ST & Social Justice",
    icon: "🏅",
    acts: [
      { name: "SC/ST (Prevention of Atrocities) Act, 1989", year: "1989", link: "https://www.indiacode.nic.in/handle/123456789/1853" },
      { name: "Protection of Civil Rights Act, 1955", year: "1955", link: "https://www.indiacode.nic.in/handle/123456789/1557" },
      { name: "Rights of Persons with Disabilities Act, 2016", year: "2016", link: "https://www.indiacode.nic.in/handle/123456789/11390" },
      { name: "National Commission for Backward Classes Act, 1993", year: "1993", link: "https://www.indiacode.nic.in/handle/123456789/1956" },
      { name: "Bonded Labour System (Abolition) Act, 1976", year: "1976", link: "https://www.indiacode.nic.in/handle/123456789/1409" },
    ],
  },
  {
    category: "Child Protection",
    icon: "🛡️",
    acts: [
      { name: "Protection of Children from Sexual Offences Act (POCSO), 2012", year: "2012", link: "https://www.indiacode.nic.in/handle/123456789/2082" },
      { name: "Child Labour (Prohibition and Regulation) Act, 1986", year: "1986", link: "https://www.indiacode.nic.in/handle/123456789/1822" },
      { name: "Commissions for Protection of Child Rights Act, 2005", year: "2005", link: "https://www.indiacode.nic.in/handle/123456789/1891" },
      { name: "Prohibition of Child Marriage Act, 2006", year: "2006", link: "https://www.indiacode.nic.in/handle/123456789/1897" },
    ],
  },
  {
    category: "Environmental Law",
    icon: "🌿",
    acts: [
      { name: "Environment Protection Act, 1986", year: "1986", link: "https://www.indiacode.nic.in/handle/123456789/1824" },
      { name: "Forest Conservation Act, 1980", year: "1980", link: "https://www.indiacode.nic.in/handle/123456789/1431" },
      { name: "Water (Prevention and Control of Pollution) Act, 1974", year: "1974", link: "https://www.indiacode.nic.in/handle/123456789/1399" },
      { name: "Air (Prevention and Control of Pollution) Act, 1981", year: "1981", link: "https://www.indiacode.nic.in/handle/123456789/1435" },
      { name: "Wild Life (Protection) Act, 1972", year: "1972", link: "https://www.indiacode.nic.in/handle/123456789/1392" },
    ],
  },
];

const tagColors: Record<string, string> = {
  "Constitutional Law": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Fundamental Rights": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "Marriage": "bg-pink-500/20 text-pink-300 border-pink-500/30",
  "Election Law": "bg-green-500/20 text-green-300 border-green-500/30",
  "Right to Information": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "Property Rights": "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "Criminal Law": "bg-red-500/20 text-red-300 border-red-500/30",
  "Bail": "bg-red-500/20 text-red-300 border-red-500/30",
  "PMLA": "bg-red-500/20 text-red-300 border-red-500/30",
  "Remission": "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "Jurisdiction": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Reservation": "bg-teal-500/20 text-teal-300 border-teal-500/30",
  "Equality": "bg-teal-500/20 text-teal-300 border-teal-500/30",
  "SC/ST": "bg-teal-500/20 text-teal-300 border-teal-500/30",
  "Article 39(b)": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "Privacy": "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  "Data Protection": "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  "Technology Law": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  "Criminal Procedure": "bg-red-500/20 text-red-300 border-red-500/30",
  "FIR Quashing": "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "Section 482 CrPC": "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "Article 21": "bg-purple-500/20 text-purple-300 border-purple-500/30",
};

function getTagColor(tag: string) {
  return tagColors[tag] || "bg-primary/20 text-primary border-primary/30";
}

export function LegalLibrary() {
  const [activeTab, setActiveTab] = useState<"judgements" | "bareacts">("judgements");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["Criminal Law"]));

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const filteredJudgements = recentJudgements.filter(j =>
    j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredActs = bareActs.map(cat => ({
    ...cat,
    acts: cat.acts.filter(act =>
      act.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.year.includes(searchQuery)
    ),
  })).filter(cat => cat.acts.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Legal Library</h1>
          <p className="mt-1 text-muted-foreground">Recent judgements and Indian bare acts reference</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 p-1 bg-card rounded-xl border border-border w-fit">
        <button
          onClick={() => setActiveTab("judgements")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "judgements"
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Gavel className="w-4 h-4" />
          Recent Judgements
        </button>
        <button
          onClick={() => setActiveTab("bareacts")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "bareacts"
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Bare Acts
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={activeTab === "judgements" ? "Search judgements by title, keyword, or tag…" : "Search acts by name or year…"}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
        />
      </div>

      {/* Recent Judgements */}
      {activeTab === "judgements" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Showing {filteredJudgements.length} landmark & recent Supreme Court judgements
          </p>
          {filteredJudgements.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">No judgements found for "{searchQuery}"</div>
          )}
          {filteredJudgements.map((j, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-base leading-snug">{j.title}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Scale className="w-3 h-3" />{j.court}</span>
                    <span>•</span>
                    <span>{j.citation}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{j.date}</span>
                    {j.bench && <><span>•</span><span>{j.bench}</span></>}
                  </div>
                </div>
                <a
                  href={j.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors whitespace-nowrap flex-shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Full Text
                </a>
              </div>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{j.summary}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {j.tags.map(tag => (
                  <span key={tag} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${getTagColor(tag)}`}>
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Bare Acts */}
      {activeTab === "bareacts" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            {filteredActs.reduce((acc, c) => acc + c.acts.length, 0)} acts across {filteredActs.length} categories — links to official India Code (indiacode.nic.in)
          </p>
          {filteredActs.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">No acts found for "{searchQuery}"</div>
          )}
          {filteredActs.map((cat) => {
            const isExpanded = expandedCategories.has(cat.category) || searchQuery.length > 0;
            return (
              <div key={cat.category} className="bg-card border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleCategory(cat.category)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{cat.icon}</span>
                    <span className="font-semibold text-foreground">{cat.category}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{cat.acts.length} acts</span>
                  </div>
                  {isExpanded && !searchQuery
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  }
                </button>
                {(isExpanded) && (
                  <div className="border-t border-border divide-y divide-border/50">
                    {cat.acts.map((act, i) => (
                      <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-accent/20 transition-colors group">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground leading-snug">{act.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">Year: {act.year}</span>
                            {act.note && (
                              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                                act.note.includes("Effective") ? "bg-green-500/15 text-green-400 border-green-500/30" :
                                act.note.includes("Superseded") ? "bg-orange-500/15 text-orange-400 border-orange-500/30" :
                                "bg-primary/15 text-primary border-primary/30"
                              }`}>
                                {act.note}
                              </span>
                            )}
                          </div>
                        </div>
                        <a
                          href={act.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-4 flex items-center gap-1.5 text-xs text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
