import{j as e,m as l,C as d,H as _,S as x,h as g,L as N,F as w}from"./index-BZSE7y-S.js";import{r as o}from"./tanstack-query-S5E7Fnf-.js";import{P as y}from"./pen-BrFuD7lw.js";import{B as E}from"./briefcase-CBrJKDxZ.js";import{C as v}from"./check-6nwpAyQJ.js";import{C as A,D as I}from"./download-EDJGLYor.js";const k=[{id:"rent",title:"Rent Agreement",icon:_,category:"Property",color:"text-blue-400",bg:"bg-blue-500/10 border-blue-500/20",desc:"Standard residential rent agreement between landlord and tenant.",fields:[{key:"landlordName",label:"Landlord's Full Name",placeholder:"Rajesh Kumar Sharma"},{key:"tenantName",label:"Tenant's Full Name",placeholder:"Amit Verma"},{key:"propertyAddress",label:"Property Address",placeholder:"C-42, Sector 15, Noida, UP 201301",multiline:!0},{key:"monthlyRent",label:"Monthly Rent (₹)",placeholder:"25000"},{key:"securityDeposit",label:"Security Deposit (₹)",placeholder:"50000"},{key:"startDate",label:"Lease Start Date",placeholder:"01/04/2026"},{key:"duration",label:"Lease Duration",placeholder:"11 months"}],template:t=>`RENT AGREEMENT

This Rent Agreement is made and executed on this ${new Date().toLocaleDateString("en-IN")} at New Delhi.

BETWEEN:
${t.landlordName||"[LANDLORD NAME]"} (hereinafter referred to as "LANDLORD")

AND

${t.tenantName||"[TENANT NAME]"} (hereinafter referred to as "TENANT")

PROPERTY: The Landlord hereby agrees to let out the property situated at ${t.propertyAddress||"[PROPERTY ADDRESS]"} to the Tenant.

TERMS AND CONDITIONS:

1. DURATION: This agreement shall be valid for a period of ${t.duration||"11 months"} commencing from ${t.startDate||"[DATE]"}.

2. RENT: The monthly rent shall be ₹${t.monthlyRent||"[AMOUNT]"}/- (Rupees ${t.monthlyRent||"[Amount in words]"} Only) payable on or before the 5th of every month.

3. SECURITY DEPOSIT: The Tenant has paid a security deposit of ₹${t.securityDeposit||"[AMOUNT]"}/- which shall be refunded at the time of vacating after deduction of dues if any.

4. UTILITIES: The Tenant shall pay all utility bills including electricity, water, gas, etc.

5. SUBLETTING: The Tenant shall not sublet the premises without written consent of the Landlord.

6. MAINTENANCE: The Tenant shall maintain the premises in good condition and shall not make any structural changes.

7. TERMINATION: Either party may terminate this agreement by giving one month's advance written notice.

8. LOCK-IN PERIOD: There shall be a lock-in period of [SPECIFY] months.

IN WITNESS WHEREOF, both parties have signed this agreement on the date first mentioned above.

LANDLORD: _______________________        TENANT: _______________________
(${t.landlordName||"[Landlord Name]"})           (${t.tenantName||"[Tenant Name]"})

WITNESS 1: _______________________       WITNESS 2: _______________________

[Note: This draft should be reviewed by an advocate and stamped on ₹500 stamp paper for legal validity]`},{id:"affidavit",title:"General Affidavit",icon:x,category:"Legal",color:"text-amber-400",bg:"bg-amber-500/10 border-amber-500/20",desc:"General purpose sworn statement / affidavit for official use.",fields:[{key:"deponentName",label:"Deponent's Full Name",placeholder:"Sunita Joshi"},{key:"deponentAge",label:"Age",placeholder:"35"},{key:"deponentAddress",label:"Address",placeholder:"B-12, Civil Lines, Delhi 110054",multiline:!0},{key:"purpose",label:"Purpose / Statement",placeholder:"I hereby declare that I am a resident of the above address since the year 2010 and the said property belongs to my family.",multiline:!0}],template:t=>`AFFIDAVIT

I, ${t.deponentName||"[FULL NAME]"}, aged ${t.deponentAge||"[AGE]"} years, residing at ${t.deponentAddress||"[ADDRESS]"}, do hereby solemnly affirm and declare as under:

1. That I am the deponent in this affidavit and am competent to swear this affidavit.

2. ${t.purpose||"[YOUR STATEMENT HERE]"}

3. That the above facts mentioned are true and correct to the best of my knowledge and belief and nothing material has been concealed therein.

DEPONENT

Verified on this _____ day of __________, 20___, at _____________.

I, ${t.deponentName||"[NAME]"}, the above-named deponent, do hereby verify that the contents of the above affidavit are true and correct to my knowledge, no part of it is false, and nothing material has been concealed therein.

DEPONENT

Signed before me:

_______________________
NOTARY / OATH COMMISSIONER
[Stamp & Seal]

[Note: This affidavit must be executed on stamp paper (₹10 or ₹20 as applicable) and attested by a Notary or Oath Commissioner]`},{id:"notice",title:"Legal Notice",icon:d,category:"Legal",color:"text-rose-400",bg:"bg-rose-500/10 border-rose-500/20",desc:"Legal notice to demand payment or resolution of a dispute.",fields:[{key:"senderName",label:"Your Full Name",placeholder:"Priya Mehta"},{key:"senderAddress",label:"Your Address",placeholder:"A-5, Lajpat Nagar, New Delhi 110024"},{key:"recipientName",label:"Recipient's Name",placeholder:"Mr. Vikas Gupta"},{key:"recipientAddress",label:"Recipient's Address",placeholder:"B-22, Rohini Sector 3, Delhi 110085"},{key:"subject",label:"Subject of Notice",placeholder:"Recovery of outstanding dues of ₹1,50,000"},{key:"facts",label:"Facts & Demand",placeholder:"You had borrowed ₹1,50,000 from me on 15/01/2026 with a promise to return by 15/03/2026. Despite multiple reminders, you have failed to repay the same.",multiline:!0},{key:"demand",label:"Your Demand",placeholder:"Pay ₹1,50,000 within 15 days of receipt of this notice"}],template:t=>`LEGAL NOTICE

Date: ${new Date().toLocaleDateString("en-IN")}

From:
${t.senderName||"[YOUR NAME]"}
${t.senderAddress||"[YOUR ADDRESS]"}

To:
${t.recipientName||"[RECIPIENT NAME]"}
${t.recipientAddress||"[RECIPIENT ADDRESS]"}

SUBJECT: ${t.subject||"[SUBJECT]"}

Dear Sir/Madam,

Under the instructions of and on behalf of my client ${t.senderName||"[CLIENT NAME]"}, I hereby serve upon you this legal notice as under:

1. ${t.facts||"[STATE THE FACTS]"}

2. You have failed to comply with your obligations despite repeated verbal and written requests, thereby causing loss and inconvenience to my client.

3. You are hereby called upon to ${t.demand||"[STATE YOUR DEMAND]"} from the date of receipt of this notice, failing which my client shall be constrained to initiate appropriate legal proceedings against you in the competent court of law, without further notice, at your risk, cost, and consequences.

4. A copy of this notice is being retained in our office for future reference.

Yours faithfully,

_______________________
${t.senderName||"[NAME]"}
[or Advocate's name and stamp]

[Note: For stronger legal standing, send this notice through a registered advocate and by Registered Post / Speed Post with Acknowledgement Due]`},{id:"nda",title:"NDA / Non-Disclosure",icon:E,category:"Business",color:"text-violet-400",bg:"bg-violet-500/10 border-violet-500/20",desc:"Simple one-way non-disclosure agreement for business use.",fields:[{key:"disclosingParty",label:"Disclosing Party (You)",placeholder:"TechStartup Pvt. Ltd."},{key:"receivingParty",label:"Receiving Party",placeholder:"Rahul Sharma, Freelancer"},{key:"purpose",label:"Purpose of Disclosure",placeholder:"Evaluation of a potential business collaboration for mobile app development"},{key:"duration",label:"Confidentiality Period",placeholder:"2 years"}],template:t=>`NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into on ${new Date().toLocaleDateString("en-IN")} between:

DISCLOSING PARTY: ${t.disclosingParty||"[YOUR NAME/COMPANY]"}
RECEIVING PARTY: ${t.receivingParty||"[RECIPIENT NAME]"}

PURPOSE: ${t.purpose||"[STATE PURPOSE]"}

1. CONFIDENTIAL INFORMATION: "Confidential Information" means any and all information disclosed by the Disclosing Party to the Receiving Party in connection with the Purpose, including but not limited to business plans, financial information, technical data, trade secrets, customer lists, and proprietary information.

2. OBLIGATIONS: The Receiving Party agrees to:
   a) Hold all Confidential Information in strict confidence;
   b) Not disclose Confidential Information to third parties without prior written consent;
   c) Use the Confidential Information solely for the Purpose stated above;
   d) Take reasonable measures to protect the confidentiality of the information.

3. DURATION: This Agreement shall remain in effect for ${t.duration||"2 years"} from the date of execution.

4. EXCLUSIONS: This Agreement does not apply to information that: (a) is or becomes publicly available; (b) was known to Receiving Party before disclosure; (c) is independently developed by Receiving Party.

5. GOVERNING LAW: This Agreement shall be governed by the laws of India and disputes shall be subject to the jurisdiction of courts in [CITY].

DISCLOSING PARTY: _______________________     RECEIVING PARTY: _______________________
(${t.disclosingParty||"[Name]"})                      (${t.receivingParty||"[Name]"})
Date: _______________                          Date: _______________

[Note: Have this reviewed by an advocate for complex business arrangements]`}];function V(){const[t,u]=o.useState(null),[n,c]=o.useState({}),[r,m]=o.useState(null),[f,p]=o.useState(!1),b=()=>{if(!t)return;const a=t.template(n);m(a)},h=()=>{r&&(navigator.clipboard.writeText(r),p(!0),setTimeout(()=>p(!1),2e3))},D=()=>{if(!r||!t)return;const a=new Blob([r],{type:"text/plain"}),i=URL.createObjectURL(a),s=document.createElement("a");s.href=i,s.download=`${t.title.replace(/\s+/g,"_")}_${Date.now()}.txt`,s.click(),URL.revokeObjectURL(i)};return e.jsxDEV("div",{className:"space-y-8",children:[e.jsxDEV(l.div,{initial:{opacity:0,y:-10},animate:{opacity:1,y:0},children:[e.jsxDEV("div",{className:"flex items-center gap-3 mb-1",children:[e.jsxDEV(y,{className:"w-7 h-7 text-blue-400"},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:247,columnNumber:11},this),e.jsxDEV("h1",{className:"text-3xl font-serif font-bold text-[#1A2332]",children:"DIY Legal Documents"},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:248,columnNumber:11},this)]},void 0,!0,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:246,columnNumber:9},this),e.jsxDEV("p",{className:"text-[#1A2332]/40 ml-10",children:"Draft basic legal documents yourself — instantly, for free."},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:250,columnNumber:9},this)]},void 0,!0,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:245,columnNumber:7},this),e.jsxDEV("div",{className:"bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex items-start gap-3",children:[e.jsxDEV(d,{className:"w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:254,columnNumber:9},this),e.jsxDEV("p",{className:"text-[#1A2332]/70 text-sm leading-relaxed",children:"Template preview only — not filed, not notarized, and not Legal Connect-supervised advice. Have a verified advocate review before signing or filing."},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:255,columnNumber:9},this)]},void 0,!0,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:253,columnNumber:7},this),t?e.jsxDEV(l.div,{initial:{opacity:0,y:10},animate:{opacity:1,y:0},children:[e.jsxDEV("button",{onClick:()=>{u(null),m(null)},className:"flex items-center gap-2 text-[#1A2332]/40 hover:text-[#1A2332] text-sm mb-6 transition-colors",children:"← Back to Documents"},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:308,columnNumber:11},this),e.jsxDEV("div",{className:`border rounded-2xl p-5 mb-6 ${t.bg}`,children:e.jsxDEV("div",{className:"flex items-center gap-3",children:[e.jsxDEV(t.icon,{className:`w-7 h-7 ${t.color}`},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:317,columnNumber:15},this),e.jsxDEV("div",{children:[e.jsxDEV("h2",{className:"text-[#1A2332] font-bold text-lg",children:t.title},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:319,columnNumber:17},this),e.jsxDEV("p",{className:"text-[#1A2332]/40 text-xs",children:t.desc},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:320,columnNumber:17},this)]},void 0,!0,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:318,columnNumber:15},this)]},void 0,!0,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:316,columnNumber:13},this)},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:315,columnNumber:11},this),e.jsxDEV("div",{className:"grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6",children:t.fields.map(a=>e.jsxDEV("div",{className:a.multiline?"sm:col-span-2":"",children:[e.jsxDEV("label",{className:"block text-[#1A2332]/60 text-xs font-semibold uppercase tracking-wider mb-2",children:a.label},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:328,columnNumber:17},this),a.multiline?e.jsxDEV("textarea",{value:n[a.key]||"",onChange:i=>c(s=>({...s,[a.key]:i.target.value})),placeholder:a.placeholder,rows:3,className:"w-full bg-card/40 border border-[#1A2332]/10 rounded-xl px-4 py-3 text-[#1A2332] text-sm placeholder:text-[#1A2332]/25 focus:outline-none focus:border-blue-500/40 resize-none"},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:330,columnNumber:19},this):e.jsxDEV("input",{value:n[a.key]||"",onChange:i=>c(s=>({...s,[a.key]:i.target.value})),placeholder:a.placeholder,className:"w-full bg-card/40 border border-[#1A2332]/10 rounded-xl px-4 py-3 text-[#1A2332] text-sm placeholder:text-[#1A2332]/25 focus:outline-none focus:border-blue-500/40"},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:338,columnNumber:19},this)]},a.key,!0,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:327,columnNumber:15},this))},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:325,columnNumber:11},this),e.jsxDEV("button",{onClick:b,className:"w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-[#1A2332] py-4 rounded-xl font-bold text-base transition-all hover:shadow-lg hover:shadow-blue-500/30 mb-6",children:[e.jsxDEV(w,{className:"w-5 h-5"},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:353,columnNumber:13},this),"Generate Document"]},void 0,!0,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:349,columnNumber:11},this),r&&e.jsxDEV(l.div,{initial:{opacity:0,y:10},animate:{opacity:1,y:0},children:[e.jsxDEV("div",{className:"flex items-center justify-between mb-3",children:[e.jsxDEV("h3",{className:"text-[#1A2332] font-semibold",children:"Your Document is Ready"},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:360,columnNumber:17},this),e.jsxDEV("div",{className:"flex gap-2",children:[e.jsxDEV("button",{onClick:h,className:"flex items-center gap-1.5 bg-[#1A2332]/10 hover:bg-[#1A2332]/20 text-[#1A2332]/60 hover:text-[#1A2332] px-3 py-2 rounded-xl text-xs font-bold transition-all border border-[#1A2332]/10",children:[f?e.jsxDEV(v,{className:"w-3.5 h-3.5 text-emerald-400"},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:366,columnNumber:31},this):e.jsxDEV(A,{className:"w-3.5 h-3.5"},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:366,columnNumber:84},this),f?"Copied!":"Copy"]},void 0,!0,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:362,columnNumber:19},this),e.jsxDEV("button",{onClick:D,className:"flex items-center gap-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 px-3 py-2 rounded-xl text-xs font-bold transition-all",children:[e.jsxDEV(I,{className:"w-3.5 h-3.5"},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:373,columnNumber:21},this),"Download"]},void 0,!0,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:369,columnNumber:19},this)]},void 0,!0,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:361,columnNumber:17},this)]},void 0,!0,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:359,columnNumber:15},this),e.jsxDEV("pre",{className:"bg-card/40 border border-[#1A2332]/10 rounded-2xl p-5 text-[#1A2332]/80 text-xs leading-relaxed whitespace-pre-wrap font-mono max-h-96 overflow-y-auto",children:r},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:378,columnNumber:15},this),e.jsxDEV("div",{className:"mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl",children:e.jsxDEV("p",{className:"text-amber-400 text-xs flex items-start gap-2",children:[e.jsxDEV(d,{className:"w-4 h-4 flex-shrink-0 mt-0.5"},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:383,columnNumber:19},this),"Review this draft carefully and have it checked by a qualified advocate before signing, notarizing, or filing it."]},void 0,!0,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:382,columnNumber:17},this)},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:381,columnNumber:15},this)]},void 0,!0,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:358,columnNumber:13},this)]},void 0,!0,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:307,columnNumber:9},this):e.jsxDEV("div",{children:[e.jsxDEV("h2",{className:"text-xs font-semibold uppercase tracking-widest text-[#1A2332]/40 mb-4",children:"Choose a Document"},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:262,columnNumber:11},this),e.jsxDEV("div",{className:"grid grid-cols-1 sm:grid-cols-2 gap-4",children:k.map((a,i)=>e.jsxDEV(l.div,{initial:{opacity:0,y:15},animate:{opacity:1,y:0},transition:{delay:.08*i},onClick:()=>{u(a),c({}),m(null)},className:`border rounded-2xl p-5 cursor-pointer hover:-translate-y-1 transition-all duration-300 group ${a.bg}`,children:e.jsxDEV("div",{className:"flex items-start gap-4",children:[e.jsxDEV(a.icon,{className:`w-8 h-8 ${a.color} flex-shrink-0`},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:274,columnNumber:19},this),e.jsxDEV("div",{className:"flex-1",children:[e.jsxDEV("div",{className:"flex items-center justify-between mb-1",children:[e.jsxDEV("h3",{className:"text-[#1A2332] font-bold",children:a.title},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:277,columnNumber:23},this),e.jsxDEV("span",{className:"text-[10px] text-[#1A2332]/30 bg-[#1A2332]/5 px-2 py-0.5 rounded-full border border-[#1A2332]/10",children:a.category},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:278,columnNumber:23},this)]},void 0,!0,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:276,columnNumber:21},this),e.jsxDEV("p",{className:"text-[#1A2332]/50 text-sm",children:a.desc},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:280,columnNumber:21},this),e.jsxDEV("div",{className:`flex items-center gap-1.5 mt-3 text-sm font-bold ${a.color} group-hover:gap-2 transition-all`,children:["Create Draft ",e.jsxDEV(g,{className:"w-4 h-4"},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:282,columnNumber:36},this)]},void 0,!0,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:281,columnNumber:21},this)]},void 0,!0,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:275,columnNumber:19},this)]},void 0,!0,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:273,columnNumber:17},this)},a.id,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:265,columnNumber:15},this))},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:263,columnNumber:11},this),e.jsxDEV("div",{className:"mt-6 p-5 bg-card/30 border border-[#1A2332]/10 rounded-2xl text-center",children:[e.jsxDEV("p",{className:"text-[#1A2332]/40 text-sm mb-3",children:"Need a custom document or something more complex?"},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:291,columnNumber:13},this),e.jsxDEV("div",{className:"flex justify-center gap-3",children:[e.jsxDEV(N,{href:"/client/book",children:e.jsxDEV("button",{className:"flex items-center gap-2 bg-[#1A2332]/10 text-[#1A2332] border border-[#1A2332]/10 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#1A2332]/20 transition-all",children:"Submit an intake"},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:294,columnNumber:17},this)},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:293,columnNumber:15},this),e.jsxDEV(N,{href:"/client/lawbot",children:e.jsxDEV("button",{className:"flex items-center gap-2 bg-[#D4A050]/15 text-[#8A5A13] border border-[#D4A050]/30 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#D4A050]/25 transition-all",children:"Ask LawBot"},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:299,columnNumber:17},this)},void 0,!1,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:298,columnNumber:15},this)]},void 0,!0,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:292,columnNumber:13},this)]},void 0,!0,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:290,columnNumber:11},this)]},void 0,!0,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:261,columnNumber:9},this)]},void 0,!0,{fileName:"/workspace/artifacts/law-firm/src/pages/client/ClientDIYDocs.tsx",lineNumber:244,columnNumber:5},this)}export{V as ClientDIYDocs};
