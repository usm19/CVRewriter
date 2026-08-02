'use strict';

/*
 * The engine's knowledge base.
 *
 * UK_SPELLINGS and SLOP come from the humanizer skill (Wikipedia's "Signs of
 * AI writing" word lists, plus recruiter-specific tells). SYNONYMS is a curated
 * taxonomy of same-meaning professional terms: the engine only ever proposes a
 * swap inside one group, so a proposal can change wording but never a claim.
 * TECH and TECH_ALIASES follow the alias-canonicalisation approach in
 * career-ops' skill-extract.mjs: aliases map spellings of the SAME skill only,
 * never umbrella terms.
 */

/* American -> British. Applied as whole-word suggestions, never silently. */
export const UK_SPELLINGS = {
  organized: 'organised', organize: 'organise', organizing: 'organising', organization: 'organisation', organizations: 'organisations',
  optimized: 'optimised', optimize: 'optimise', optimizing: 'optimising', optimization: 'optimisation',
  prioritized: 'prioritised', prioritize: 'prioritise', prioritizing: 'prioritising', prioritization: 'prioritisation',
  specialized: 'specialised', specialize: 'specialise', specializing: 'specialising', specialization: 'specialisation',
  recognized: 'recognised', recognize: 'recognise', recognition: 'recognition',
  analyzed: 'analysed', analyze: 'analyse', analyzing: 'analysing',
  utilized: 'used', utilize: 'use', utilizing: 'using',
  maximized: 'maximised', maximize: 'maximise', minimized: 'minimised', minimize: 'minimise',
  standardized: 'standardised', standardize: 'standardise',
  customized: 'customised', customize: 'customise',
  digitized: 'digitised', digitize: 'digitise',
  modernized: 'modernised', modernize: 'modernise',
  mobilized: 'mobilised', mobilize: 'mobilise',
  color: 'colour', colors: 'colours', behavior: 'behaviour', behaviors: 'behaviours',
  labor: 'labour', favor: 'favour', favorite: 'favourite', honors: 'honours', honor: 'honour',
  center: 'centre', centers: 'centres', theater: 'theatre', liter: 'litre', meters: 'metres',
  catalog: 'catalogue', catalogs: 'catalogues', dialog: 'dialogue',
  fulfillment: 'fulfilment', fulfill: 'fulfil', fulfilled: 'fulfilled', enrollment: 'enrolment', enroll: 'enrol',
  skillful: 'skilful', traveled: 'travelled', traveling: 'travelling', modeling: 'modelling', modeled: 'modelled',
  counseling: 'counselling', counselor: 'counsellor', labeled: 'labelled', labeling: 'labelling',
  resume: 'CV', 'résumé': 'CV', resumes: 'CVs',
  defense: 'defence', offense: 'offence', practiced: 'practised', practicing: 'practising',
  aging: 'ageing', gray: 'grey', jewelry: 'jewellery', checkbook: 'chequebook', checks: 'cheques',
  'driving license': 'driving licence', "driver's license": "driver's licence",
  'best practise': 'best practice', 'best practises': 'best practices',
};
for (const q of ['training', 'development', 'graduate', 'apprenticeship', 'mentoring', 'induction']) {
  UK_SPELLINGS[`${q} program`] = `${q} programme`;
  UK_SPELLINGS[`${q} programs`] = `${q} programmes`;
}

/* AI-tell words with plain replacements. Suggestions only; if the CV's owner
 * genuinely writes this way it is their voice and the user just unticks. */
export const SLOP = {
  utilised: 'used', utilise: 'use', utilising: 'using',
  leverage: 'use', leveraged: 'used', leveraging: 'using',
  spearheaded: 'led', spearheading: 'leading',
  showcased: 'presented', showcase: 'present', showcasing: 'presenting',
  fostered: 'built', fostering: 'building',
  delve: 'look', delved: 'looked',
  synergy: 'teamwork', synergies: 'teamwork',
  endeavoured: 'worked', endeavour: 'effort',
  'in order to': 'to',
  'due to the fact that': 'because',
  'at this point in time': 'now',
  'a wide variety of': 'many',
  'proven track record of': 'record of',
  'responsible for managing': 'managed',
  'responsible for overseeing': 'oversaw',
  harnessed: 'used', harness: 'use',
  garnered: 'earned', garner: 'earn',
  commenced: 'started', commence: 'start',
  meticulously: 'carefully', seamlessly: 'smoothly',
  'in excess of': 'over',
  'prior to': 'before',
  'a wide range of': 'many',
  'first and foremost': 'first',
};

/* Words that carry no matching signal. Superset of career-ops' stopword sets. */
export const STOPWORDS = new Set(('a an and are as at be been being but by can could did do does for from had has have he her him his how i if in into is it its just me more most my no nor not of on or our out over she so some such than that the their them then there these they this those through to under until up upon was we were what when where which while who whom why will with within would you your yours ' +
  'role job work working candidate candidates applicant applicants ideal successful strong excellent good great ability able skills skill experience experienced years year knowledge understanding familiarity background required requirement requirements preferred essential desirable must team teams company organisation organization opportunity opportunities benefits salary apply application closing looking join us new day days per week hours hour full part time permanent contract temporary based location including include includes etc plus bonus').split(/\s+/));

/* Generic single tokens that should never be reported as a gap on their own. */
export const GENERIC_TERMS = new Set(('software comfortable confident owning communication passionate motivated enthusiastic dynamic flexible reliable proactive detail attention environment fast paced fastpaced culture values mission vision growth development progression training support successful busy friendly positive attitude professional professionalism').split(/\s+/));

/* Same-meaning professional vocabulary. A swap inside one group changes the
 * word, never the claim. First entry is the group's display name. */
export const SYNONYMS = [
  /* people management */
  ['manage', 'supervise', 'oversee', 'run', 'head', 'lead'],
  ['line management', 'people management', 'staff management', 'team management'],
  ['team leader', 'team lead', 'supervisor', 'shift leader', 'shift supervisor'],
  ['train', 'coach', 'mentor', 'onboard', 'induct', 'upskill'],
  ['training', 'coaching', 'mentoring', 'onboarding', 'induction'],
  ['recruit', 'hire'],
  ['appraisals', 'performance reviews', 'performance management', 'one to ones', '1-2-1s'],
  ['delegate', 'assign', 'allocate'],
  /* scheduling */
  ['rota', 'roster', 'rostering', 'staff scheduling', 'shift planning', 'shift patterns', 'scheduling', 'workforce planning'],
  /* customers */
  ['customer', 'client', 'guest', 'service user', 'patron', 'shopper'],
  ['customer service', 'customer care', 'client service', 'guest experience', 'customer experience', 'customer support'],
  ['complaint', 'customer complaint', 'escalation', 'customer issue'],
  ['front of house', 'front-of-house', 'foh'],
  /* retail & stock */
  ['tills', 'checkouts', 'point of sale', 'pos', 'epos', 'cash registers'],
  ['cash handling', 'cash management', 'cashing up', 'till reconciliation', 'end of day banking'],
  ['stock control', 'inventory management', 'stock management', 'inventory control', 'stock keeping'],
  ['stockroom', 'stock room', 'back of house', 'storeroom', 'warehouse'],
  ['stocktake', 'stock take', 'stock counts', 'inventory counts', 'cycle counts'],
  ['deliveries', 'goods in', 'inbound deliveries', 'replenishment'],
  ['merchandising', 'visual merchandising', 'product displays', 'planograms'],
  ['shrinkage', 'stock loss', 'loss prevention'],
  ['sales targets', 'kpis', 'sales goals', 'performance targets', 'targets'],
  ['upselling', 'link selling', 'cross-selling', 'add-on sales'],
  /* office & admin */
  ['administration', 'admin', 'administrative support', 'office administration'],
  ['diary management', 'calendar management', 'scheduling meetings'],
  ['minutes', 'meeting minutes', 'minute taking', 'note taking'],
  ['data entry', 'data input', 'record keeping', 'records management'],
  ['filing', 'document management', 'document control'],
  ['correspondence', 'emails and letters', 'inbox management'],
  ['reception', 'front desk', 'front office', 'switchboard'],
  ['invoicing', 'billing', 'raising invoices'],
  ['purchase orders', 'ordering', 'procurement', 'purchasing'],
  ['reports', 'reporting', 'management reports', 'management information', 'mi reporting'],
  ['spreadsheets', 'excel', 'microsoft excel', 'google sheets'],
  ['microsoft office', 'ms office', 'office 365', 'microsoft 365'],
  /* communication & collaboration */
  ['stakeholders', 'internal and external contacts', 'partners', 'colleagues and clients'],
  ['liaise with', 'work with', 'coordinate with', 'partner with', 'collaborate with'],
  ['present', 'pitch', 'brief', 'deliver presentations'],
  ['negotiate', 'secure'],
  /* projects & process */
  ['projects', 'project work', 'initiatives', 'programmes of work'],
  ['project management', 'project delivery', 'project coordination'],
  ['deadlines', 'time-sensitive targets', 'tight timescales', 'timeframes'],
  ['processes', 'procedures', 'ways of working', 'workflows', 'sops', 'standard operating procedures'],
  ['process improvement', 'continuous improvement', 'streamlining', 'efficiency improvements'],
  ['problem solving', 'troubleshooting', 'issue resolution', 'resolving issues'],
  ['multitasking', 'juggling priorities', 'prioritising', 'prioritisation', 'workload management', 'time management'],
  ['budgets', 'budgeting', 'cost control', 'p&l', 'profit and loss'],
  ['audits', 'auditing', 'compliance checks', 'quality checks', 'quality assurance', 'qa'],
  ['health and safety', 'h&s', 'safe working practices', 'risk assessments', 'coshh'],
  ['safeguarding', 'child protection', 'vulnerable adults'],
  ['gdpr', 'data protection', 'confidentiality'],
  /* hospitality & care */
  ['food safety', 'food hygiene', 'haccp', 'allergen management'],
  ['barista', 'coffee preparation', 'hot drinks'],
  ['food preparation', 'food prep', 'kitchen work'],
  ['care plans', 'support plans', 'person-centred care'],
  ['medication', 'medication administration', 'meds rounds'],
  /* sales & marketing */
  ['business development', 'new business', 'lead generation', 'prospecting'],
  ['account management', 'client relationship management', 'relationship management', 'client accounts'],
  ['crm', 'customer relationship management', 'salesforce', 'hubspot'],
  ['social media', 'social channels', 'social content'],
  ['campaigns', 'marketing campaigns', 'promotions', 'promotional activity'],
  ['content creation', 'copywriting', 'content writing'],
  /* finance */
  ['bookkeeping', 'accounts', 'ledgers', 'accounts payable and receivable'],
  ['reconciliation', 'reconciliations', 'account reconciliation', 'bank reconciliation'],
  ['payroll', 'wages', 'payroll processing'],
  ['forecasting', 'financial forecasting', 'projections'],
  /* logistics */
  ['picking and packing', 'order picking', 'pick and pack', 'order fulfilment'],
  ['dispatch', 'despatch', 'shipping', 'outbound'],
  ['routing', 'route planning', 'delivery scheduling'],
  ['forklift', 'flt', 'counterbalance', 'reach truck'],
  /* education */
  ['lesson planning', 'planning lessons', 'session planning'],
  ['behaviour management', 'classroom management'],
  ['send', 'sen', 'special educational needs', 'additional needs'],
  ['assessment', 'marking', 'grading', 'feedback on work'],
  /* general verbs of achievement */
  ['improve', 'raise', 'lift', 'strengthen', 'boost'],
  ['reduce', 'cut', 'lower', 'bring down'],
  ['deliver', 'achieve', 'complete', 'bring in'],
  ['create', 'build', 'set up', 'establish', 'introduce', 'launch'],
  ['maintain', 'keep', 'uphold', 'sustain'],
  /* IT support */
  ['it support', 'technical support', 'helpdesk', 'service desk', 'first line support', '1st line support'],
  ['ticket', 'support ticket', 'service request', 'incident ticket'],
  ['fault finding', 'fault diagnosis', 'diagnostics'],
  ['remote support', 'remote assistance'],
  /* call centre */
  ['inbound calls', 'incoming calls'],
  ['outbound calls', 'outgoing calls'],
  ['call handling', 'phone handling', 'telephone handling'],
  ['call centre', 'contact centre', 'call center'],
  /* warehouse and driving */
  ['multi-drop', 'multidrop', 'multi drop deliveries'],
  ['manifest', 'delivery manifest', 'run sheet'],
  ['vehicle checks', 'walkaround checks', 'daily vehicle checks'],
  ['stock rotation', 'date rotation', 'fifo'],
  ['handover', 'shift handover'],
  /* construction and security */
  ['method statements', 'rams'],
  ['cctv', 'cctv monitoring', 'camera monitoring'],
  ['patrol', 'security patrol', 'site patrol'],
  ['incident report', 'incident reporting', 'incident log'],
  /* care */
  ['personal care', 'intimate care'],
  ['daily living', 'activities of daily living', 'adls'],
  ['medication records', 'mar charts'],
  /* office */
  ['travel booking', 'travel arrangements', 'booking travel'],
  ['expense claim', 'expense processing', 'staff expenses'],
  ['audio typing', 'dictation', 'transcription'],
  /* sales and marketing */
  ['sales pipeline', 'pipeline management', 'sales funnel'],
  ['cold calling', 'prospecting calls', 'cold outreach'],
  ['product demonstrations', 'demos', 'product demos'],
  ['contract renewals', 'renewals'],
  ['customer churn', 'churn', 'attrition'],
  ['split testing', 'a/b testing'],
  ['search engine optimisation', 'seo'],
  ['paid search', 'ppc'],
  ['user experience', 'ux'],
  /* finance */
  ['credit control', 'chasing overdue invoices'],
  ['vat returns', 'vat filings'],
  ['month end', 'month-end close', 'monthly close'],
  ['petty cash', 'cash floats'],
  /* hospitality and beauty */
  ['covers', 'service covers'],
  ['beauty treatments', 'treatments'],
  /* education and events */
  ['parents evenings', 'parent consultations'],
  ['schemes of work', 'curriculum plans'],
  ['event setup', 'event set up', 'set-up and breakdown'],
  ['guest list', 'guestlist management'],
  ['fundraising', 'fund raising'],
];

/* Technology skills and exact aliases, after career-ops skill-extract.mjs.
 * Aliases map spellings of the SAME skill only. */
export const TECH = ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', '.NET', 'SQL', 'PHP', 'Ruby', 'Go',
  'React', 'Angular', 'Vue.js', 'Next.js', 'Node.js', 'Django', 'Flask', 'Rails', 'Spring', 'Laravel',
  'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'GraphQL', 'REST',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'Git', 'GitHub', 'CI/CD', 'Linux',
  'Power BI', 'Tableau', 'Looker', 'Pandas', 'NumPy', 'Spark', 'Airflow', 'dbt',
  'Salesforce', 'SAP', 'HubSpot', 'Xero', 'QuickBooks', 'Sage', 'Shopify', 'WordPress', 'Figma', 'Photoshop', 'InDesign', 'Illustrator', 'AutoCAD', 'Jira', 'Trello', 'Asana', 'Slack', 'Zendesk'];

/* Alias clusters are also synonym groups, so a CV's "Postgres" satisfies a
   listing's "PostgreSQL" and can be mirrored to the listing's exact form. */
export const TECH_ALIASES = {
  k8s: 'Kubernetes', golang: 'Go', postgres: 'PostgreSQL', 'node': 'Node.js', nodejs: 'Node.js',
  vuejs: 'Vue.js', nextjs: 'Next.js', js: 'JavaScript', ts: 'TypeScript', 'power bi': 'Power BI',
  'ms excel': 'Excel', 'microsoft excel': 'Excel', wordpress: 'WordPress', 'quick books': 'QuickBooks',
};

/* JD requirement-section headers, adapted from career-ops jd-skill-gap.mjs.
 * Terms under these headers score higher. */
for (const [alias, canon] of Object.entries(TECH_ALIASES)) {
  const g = SYNONYMS.find((grp) => grp[0] === canon);
  if (g) g.push(alias);
  else SYNONYMS.push([canon, alias]);
}

export const REQUIREMENT_HEADER_RE = new RegExp(
  '^\\s*(?:' + [
    'required', 'requirements', 'qualifications', 'must[- ]haves?', 'preferred', 'nice[- ]to[- ]have',
    "what\\s+we(?:'|’)?\\s*re\\s+looking\\s+for",
    "what\\s+you(?:(?:'|’)ll|\\s+will)?\\s+bring",
    'who\\s+you\\s+are', 'about\\s+you', 'the\\s+ideal\\s+candidate',
    'your\\s+(?:background|experience|profile|skills)',
    'skills\\s+(?:and|&)\\s+experience', 'key\\s+(?:skills|responsibilities|duties)',
    'responsibilities', 'duties', 'the\\s+role', 'role\\s+overview', "what\\s+you(?:(?:'|’)ll|\\s+will)\\s+(?:do|be\\s+doing)",
    'person\\s+specification', 'essential\\s+criteria', 'desirable\\s+criteria', 'we\\s+are\\s+looking\\s+for',
  ].join('|') + ')s?\\b.{0,40}$', 'i');

export const NON_REQUIREMENT_HEADER_RE = new RegExp(
  '^\\s*(?:' + [
    'benefits?', 'perks?', 'compensation', 'salary', 'pay(?:\\s+range)?', 'what\\s+we\\s+offer',
    'why\\s+(?:join|work|us)', 'about\\s+(?:us|the\\s+company|the\\s+team)',
    'equal\\s+opportunit', 'diversity', 'how\\s+to\\s+apply', 'to\\s+apply', 'application\\s+process',
    'interview\\s+process', 'our\\s+(?:values|mission|story)',
  ].join('|') + ')\\b.{0,40}$', 'i');

/* Role words used to spot the job title near the top of a listing. */
export const ROLE_WORDS = /\b(manager|assistant|supervisor|coordinator|administrator|executive|officer|advisor|adviser|analyst|engineer|developer|designer|technician|specialist|consultant|associate|apprentice|leader|lead|director|head|receptionist|accountant|bookkeeper|teacher|tutor|nurse|carer|chef|cook|barista|waiter|waitress|cleaner|driver|operative|picker|packer|steward|cashier|stylist|therapist|editor|writer|photographer|recruiter|buyer|merchandiser|surveyor|architect|paralegal|solicitor)\b/i;
