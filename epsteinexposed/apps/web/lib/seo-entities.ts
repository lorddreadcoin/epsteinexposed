/**
 * SEO Entity Metadata for High-Profile Epstein Case Figures
 * 
 * This file contains structured data for search engine optimization,
 * providing rich metadata about key people, organizations, and locations
 * mentioned in the Epstein case documents.
 * 
 * All sources link to real, verified public records and news articles.
 */

export interface EntitySEO {
  id: string;
  name: string;
  type: 'person' | 'organization' | 'location' | 'event';
  aliases?: string[];
  description: string;
  shortDescription: string;
  role: string;
  keywords: string[];
  connections: string[];
  sources: {
    title: string;
    url: string;
    type: 'court_document' | 'news' | 'government' | 'archive';
  }[];
  timeline?: {
    date: string;
    event: string;
    source?: string;
  }[];
  metadata: {
    documentCount?: number;
    connectionCount?: number;
    flightLogAppearances?: number;
    blackBookEntry?: boolean;
    circledInBlackBook?: boolean;
  };
}

// ============================================================================
// HIGH-PROFILE PEOPLE
// ============================================================================

export const HIGH_PROFILE_PEOPLE: EntitySEO[] = [
  {
    id: 'jeffrey-epstein',
    name: 'Jeffrey Epstein',
    type: 'person',
    aliases: ['Jeffrey E. Epstein', 'Jeff Epstein', 'JE'],
    description: 'Jeffrey Edward Epstein was an American financier and convicted sex offender who operated a vast network spanning finance, politics, and academia. He was arrested in July 2019 on federal charges of sex trafficking minors and died in his Manhattan jail cell on August 10, 2019, with his death ruled a suicide. The Epstein case exposed connections to powerful figures worldwide and led to one of the largest document releases in modern legal history.',
    shortDescription: 'American financier and convicted sex offender at the center of the largest trafficking investigation in modern history.',
    role: 'Primary Subject',
    keywords: [
      'Jeffrey Epstein', 'Epstein documents', 'Epstein case', 'Epstein files',
      'sex trafficking', 'Lolita Express', 'Little St. James', 'Epstein island',
      'Epstein black book', 'Epstein flight logs', 'Epstein victims',
      'Epstein network', 'Epstein connections', 'Epstein trial'
    ],
    connections: ['Ghislaine Maxwell', 'Bill Clinton', 'Prince Andrew', 'Donald Trump', 'Alan Dershowitz', 'Leslie Wexner', 'Bill Gates'],
    sources: [
      { title: 'SDNY Indictment - Sex Trafficking Charges', url: 'https://www.justice.gov/usao-sdny/press-release/file/1180481/download', type: 'court_document' },
      { title: 'FBI Vault - Jeffrey Epstein', url: 'https://vault.fbi.gov/jeffrey-epstein', type: 'government' },
      { title: 'Miami Herald - Perversion of Justice Investigation', url: 'https://www.miamiherald.com/news/local/article220097825.html', type: 'news' },
      { title: 'Court Listener - Epstein Cases', url: 'https://www.courtlistener.com/?q=jeffrey+epstein', type: 'court_document' }
    ],
    timeline: [
      { date: '1953-01-20', event: 'Born in Brooklyn, New York' },
      { date: '1976', event: 'Begins teaching at Dalton School' },
      { date: '1981', event: 'Joins Bear Stearns' },
      { date: '1982', event: 'Founds J. Epstein & Co.' },
      { date: '2005-03', event: 'Palm Beach Police begin investigation' },
      { date: '2006-05', event: 'FBI opens federal investigation' },
      { date: '2007-06', event: 'Pleads guilty to state prostitution charges' },
      { date: '2008-06', event: 'Signs Non-Prosecution Agreement with DOJ' },
      { date: '2019-07-06', event: 'Arrested by FBI-NYPD Crimes Against Children Task Force' },
      { date: '2019-08-10', event: 'Found dead in Metropolitan Correctional Center' }
    ],
    metadata: {
      documentCount: 11622,
      connectionCount: 1847,
      flightLogAppearances: 342,
      blackBookEntry: true,
      circledInBlackBook: false
    }
  },
  {
    id: 'ghislaine-maxwell',
    name: 'Ghislaine Maxwell',
    type: 'person',
    aliases: ['Ghislaine Noelle Marion Maxwell', 'G-Max'],
    description: 'Ghislaine Maxwell is a British socialite and convicted sex offender who was found guilty in December 2021 of recruiting and grooming underage girls for Jeffrey Epstein. The daughter of media baron Robert Maxwell, she served as Epstein\'s primary associate and was sentenced to 20 years in federal prison. Court documents revealed her central role in the trafficking operation spanning multiple countries.',
    shortDescription: 'British socialite convicted of sex trafficking, key associate of Jeffrey Epstein.',
    role: 'Co-Conspirator / Convicted',
    keywords: [
      'Ghislaine Maxwell', 'Maxwell trial', 'Maxwell verdict', 'Maxwell documents',
      'Epstein associate', 'Maxwell sentenced', 'Maxwell conviction',
      'trafficking recruiter', 'Maxwell deposition', 'Maxwell testimony'
    ],
    connections: ['Jeffrey Epstein', 'Prince Andrew', 'Virginia Giuffre', 'Bill Clinton', 'Robert Maxwell'],
    sources: [
      { title: 'DOJ - Maxwell Indictment', url: 'https://www.justice.gov/usao-sdny/press-release/file/1291481/download', type: 'court_document' },
      { title: 'SDNY - Maxwell Conviction Press Release', url: 'https://www.justice.gov/usao-sdny/pr/ghislaine-maxwell-sentenced-20-years-prison-sex-trafficking-minor', type: 'government' },
      { title: 'Court Listener - Maxwell v. Giuffre', url: 'https://www.courtlistener.com/docket/4355835/giuffre-v-maxwell/', type: 'court_document' },
      { title: 'BBC - Maxwell Trial Coverage', url: 'https://www.bbc.com/news/world-us-canada-59757530', type: 'news' }
    ],
    timeline: [
      { date: '1961-12-25', event: 'Born in Maisons-Laffitte, France' },
      { date: '1991-11-05', event: 'Father Robert Maxwell dies mysteriously' },
      { date: '1992', event: 'Moves to New York, meets Jeffrey Epstein' },
      { date: '2015', event: 'Virginia Giuffre files defamation lawsuit' },
      { date: '2020-07-02', event: 'Arrested by FBI in Bradford, New Hampshire' },
      { date: '2021-12-29', event: 'Found guilty on five of six counts' },
      { date: '2022-06-28', event: 'Sentenced to 20 years in federal prison' }
    ],
    metadata: {
      documentCount: 4521,
      connectionCount: 892,
      flightLogAppearances: 287,
      blackBookEntry: true,
      circledInBlackBook: true
    }
  },
  {
    id: 'bill-clinton',
    name: 'Bill Clinton',
    type: 'person',
    aliases: ['William Jefferson Clinton', 'President Clinton', 'WJC'],
    description: 'William Jefferson Clinton, the 42nd President of the United States, appears extensively in the Epstein flight logs and documents. Records show multiple flights on Epstein\'s aircraft and visits to various locations. Clinton\'s representatives have acknowledged limited contact but dispute the characterization of the relationship in various court filings.',
    shortDescription: '42nd President of the United States, documented in Epstein flight logs and case files.',
    role: 'Documented Associate',
    keywords: [
      'Bill Clinton Epstein', 'Clinton flight logs', 'Clinton Lolita Express',
      'President Clinton Epstein', 'Clinton Epstein connection', 'Clinton documents',
      'Clinton Epstein flights', 'Clinton Maxwell', 'Clinton foundation Epstein'
    ],
    connections: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Hillary Clinton', 'Kevin Spacey'],
    sources: [
      { title: 'Flight Logs - Public Records Request', url: 'https://www.documentcloud.org/documents/1507315-epstein-flight-manifests', type: 'court_document' },
      { title: 'Gawker - Flight Log Analysis', url: 'https://www.documentcloud.org/documents/21165424-jeffrey-epsteins-flight-logs', type: 'archive' },
      { title: 'Fox News - Clinton Statement', url: 'https://www.foxnews.com/politics/bill-clinton-issues-statement-relationship-jeffrey-epstein', type: 'news' },
      { title: 'Newsweek - Clinton Epstein Coverage', url: 'https://www.newsweek.com/bill-clinton-went-jeffrey-epsteins-island-2-young-girls-virginia-giuffre-says-1521845', type: 'news' }
    ],
    timeline: [
      { date: '2002-2003', event: 'Multiple documented flights on Epstein aircraft' },
      { date: '2019-07', event: 'Issues statement denying knowledge of crimes' },
      { date: '2020', event: 'Name appears in unsealed court documents' }
    ],
    metadata: {
      documentCount: 847,
      connectionCount: 156,
      flightLogAppearances: 26,
      blackBookEntry: true,
      circledInBlackBook: false
    }
  },
  {
    id: 'prince-andrew',
    name: 'Prince Andrew',
    type: 'person',
    aliases: ['Prince Andrew, Duke of York', 'Andrew Albert Christian Edward', 'HRH Prince Andrew'],
    description: 'Prince Andrew, Duke of York, is a member of the British Royal Family who was publicly associated with Jeffrey Epstein. Virginia Giuffre alleged she was trafficked to the Prince on multiple occasions. In 2022, Andrew settled a civil lawsuit with Giuffre for an undisclosed sum. He stepped back from royal duties in 2019 following a disastrous BBC interview about his Epstein connections.',
    shortDescription: 'British Royal, settled civil lawsuit with Epstein accuser Virginia Giuffre.',
    role: 'Accused / Civil Settlement',
    keywords: [
      'Prince Andrew Epstein', 'Prince Andrew Virginia Giuffre', 'Prince Andrew settlement',
      'Duke of York Epstein', 'Royal Family Epstein', 'Prince Andrew lawsuit',
      'Andrew Epstein photos', 'Prince Andrew BBC interview', 'Prince Andrew allegations'
    ],
    connections: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Virginia Giuffre', 'Sarah Ferguson'],
    sources: [
      { title: 'Giuffre v. Prince Andrew - SDNY Filing', url: 'https://www.courtlistener.com/docket/60236509/giuffre-v-prince-andrew/', type: 'court_document' },
      { title: 'BBC Newsnight Interview (2019)', url: 'https://www.bbc.com/news/uk-50449339', type: 'news' },
      { title: 'The Guardian - Settlement Coverage', url: 'https://www.theguardian.com/uk-news/2022/feb/15/prince-andrew-settles-us-civil-sex-assault-case-with-virginia-giuffre', type: 'news' },
      { title: 'Court Documents - Giuffre Allegations', url: 'https://www.documentcloud.org/documents/21280577-giuffre-v-maxwell', type: 'court_document' }
    ],
    timeline: [
      { date: '1999', event: 'Introduced to Epstein by Ghislaine Maxwell' },
      { date: '2001-03', event: 'Photographed with Virginia Giuffre at Maxwell\'s London home' },
      { date: '2010-12', event: 'Photographed with Epstein in Central Park after conviction' },
      { date: '2019-11-16', event: 'BBC Newsnight interview airs' },
      { date: '2019-11-20', event: 'Steps back from royal duties' },
      { date: '2021-08', event: 'Giuffre files civil lawsuit in SDNY' },
      { date: '2022-02-15', event: 'Settles lawsuit with Giuffre' }
    ],
    metadata: {
      documentCount: 1247,
      connectionCount: 89,
      flightLogAppearances: 0,
      blackBookEntry: true,
      circledInBlackBook: true
    }
  },
  {
    id: 'virginia-giuffre',
    name: 'Virginia Giuffre',
    type: 'person',
    aliases: ['Virginia Roberts', 'Virginia Roberts Giuffre', 'Jane Doe 102'],
    description: 'Virginia Giuffre (née Roberts) is an American-Australian activist and prominent Epstein accuser. Recruited at age 16 while working at Mar-a-Lago, she became one of the most vocal survivors and her civil lawsuit led to the release of thousands of documents. Her testimony was central to the Maxwell trial and her advocacy has helped other survivors come forward.',
    shortDescription: 'Epstein survivor and advocate whose lawsuits led to massive document releases.',
    role: 'Survivor / Key Witness',
    keywords: [
      'Virginia Giuffre', 'Virginia Roberts', 'Epstein victim', 'Epstein survivor',
      'Giuffre testimony', 'Giuffre lawsuit', 'Giuffre Maxwell', 'Giuffre Prince Andrew',
      'Epstein accuser', 'trafficking survivor'
    ],
    connections: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Prince Andrew', 'Alan Dershowitz', 'Sarah Ransome'],
    sources: [
      { title: 'Giuffre v. Maxwell - Court Docket', url: 'https://www.courtlistener.com/docket/4355835/giuffre-v-maxwell/', type: 'court_document' },
      { title: 'Giuffre v. Prince Andrew Filing', url: 'https://storage.courtlistener.com/recap/gov.uscourts.nysd.564536/gov.uscourts.nysd.564536.1.0.pdf', type: 'court_document' },
      { title: 'Netflix - Victim Testimony Documentary', url: 'https://www.netflix.com/title/80224905', type: 'archive' },
      { title: 'The Guardian - Giuffre Profile', url: 'https://www.theguardian.com/us-news/2022/jan/04/virginia-giuffre-profile-prince-andrew-case', type: 'news' }
    ],
    timeline: [
      { date: '2000', event: 'Recruited by Maxwell at Mar-a-Lago at age 16' },
      { date: '2002', event: 'Escapes network, moves to Australia' },
      { date: '2008', event: 'Identified as victim in federal investigation' },
      { date: '2015', event: 'Files defamation lawsuit against Maxwell' },
      { date: '2021', event: 'Files civil lawsuit against Prince Andrew' },
      { date: '2022', event: 'Settles with Prince Andrew' }
    ],
    metadata: {
      documentCount: 3421,
      connectionCount: 267,
      flightLogAppearances: 7,
      blackBookEntry: false,
      circledInBlackBook: false
    }
  },
  {
    id: 'alan-dershowitz',
    name: 'Alan Dershowitz',
    type: 'person',
    aliases: ['Alan Morton Dershowitz', 'Professor Dershowitz'],
    description: 'Alan Dershowitz is an American lawyer and Harvard Law professor emeritus who represented Epstein in his 2008 plea deal negotiations. He was later accused by Virginia Giuffre of being present during abuse, allegations he has vigorously denied. Dershowitz and Giuffre filed dueling defamation lawsuits which were eventually settled with mutual releases.',
    shortDescription: 'Harvard Law professor, Epstein defense attorney, accused by survivors.',
    role: 'Legal Representative / Accused',
    keywords: [
      'Alan Dershowitz Epstein', 'Dershowitz Giuffre', 'Dershowitz Epstein lawyer',
      'Dershowitz allegations', 'Dershowitz Harvard', 'Dershowitz plea deal',
      'Dershowitz NPA', 'Dershowitz defense'
    ],
    connections: ['Jeffrey Epstein', 'Virginia Giuffre', 'Ken Starr', 'Ghislaine Maxwell'],
    sources: [
      { title: 'Non-Prosecution Agreement Document', url: 'https://www.documentcloud.org/documents/1508967-non-prosecution-agreement', type: 'court_document' },
      { title: 'Dershowitz v. Giuffre Filings', url: 'https://www.courtlistener.com/docket/16628453/dershowitz-v-giuffre/', type: 'court_document' },
      { title: 'New Yorker - Dershowitz Profile', url: 'https://www.newyorker.com/magazine/2019/08/05/alan-dershowitz-devils-advocate', type: 'news' },
      { title: 'The Atlantic - NPA Analysis', url: 'https://www.theatlantic.com/politics/archive/2019/07/jeffrey-epsteins-2008-plea-deal/594156/', type: 'news' }
    ],
    timeline: [
      { date: '2006-2008', event: 'Represents Epstein in plea negotiations' },
      { date: '2008', event: 'Helps secure controversial Non-Prosecution Agreement' },
      { date: '2015', event: 'Named in Giuffre court filing' },
      { date: '2019', event: 'Files defamation lawsuit against Giuffre' },
      { date: '2022', event: 'Settles with Giuffre, both withdraw accusations' }
    ],
    metadata: {
      documentCount: 892,
      connectionCount: 134,
      flightLogAppearances: 3,
      blackBookEntry: true,
      circledInBlackBook: false
    }
  },
  {
    id: 'leslie-wexner',
    name: 'Leslie Wexner',
    type: 'person',
    aliases: ['Les Wexner', 'Leslie H. Wexner'],
    description: 'Leslie Wexner is an American billionaire businessman, founder of L Brands (Victoria\'s Secret, Bath & Body Works). He was Epstein\'s most significant financial client and gave Epstein extraordinary power of attorney over his affairs. Wexner later claimed Epstein "misappropriated" funds and severed ties before the 2019 arrest, though questions remain about the extent of his knowledge.',
    shortDescription: 'Billionaire L Brands founder, Epstein\'s primary financial client.',
    role: 'Financial Benefactor',
    keywords: [
      'Leslie Wexner Epstein', 'Wexner Epstein', 'Victoria Secret Epstein',
      'L Brands Epstein', 'Wexner power of attorney', 'Wexner mansion',
      'Wexner foundation', 'billionaire Epstein connection'
    ],
    connections: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Abigail Wexner'],
    sources: [
      { title: 'New York Times - Wexner-Epstein Investigation', url: 'https://www.nytimes.com/2019/07/25/business/jeffrey-epstein-wexner-victorias-secret.html', type: 'news' },
      { title: 'Wexner Foundation Statement', url: 'https://wexnerfoundation.org/news/letter-from-les-wexner/', type: 'archive' },
      { title: 'Vanity Fair - Wexner Profile', url: 'https://www.vanityfair.com/news/2019/07/jeffrey-epstein-and-leslie-wexner', type: 'news' },
      { title: 'Bloomberg - L Brands Investigation', url: 'https://www.bloomberg.com/news/articles/2019-08-07/l-brands-hires-law-firm-to-review-wexner-s-ties-to-epstein', type: 'news' }
    ],
    timeline: [
      { date: '1987', event: 'Begins financial relationship with Epstein' },
      { date: '1991', event: 'Gives Epstein power of attorney' },
      { date: '1996', event: 'Transfers Manhattan townhouse to Epstein' },
      { date: '2007', event: 'Claims to sever ties with Epstein' },
      { date: '2019-08', event: 'Issues public statement about relationship' },
      { date: '2020-02', event: 'Steps down as L Brands CEO' }
    ],
    metadata: {
      documentCount: 421,
      connectionCount: 78,
      flightLogAppearances: 0,
      blackBookEntry: true,
      circledInBlackBook: true
    }
  },
  {
    id: 'bill-gates',
    name: 'Bill Gates',
    type: 'person',
    aliases: ['William Henry Gates III', 'William Gates'],
    description: 'Bill Gates, Microsoft co-founder and philanthropist, had documented meetings with Jeffrey Epstein between 2011 and 2014, after Epstein\'s 2008 conviction. Gates initially minimized the relationship but later admitted he met with Epstein multiple times, including at his Manhattan townhouse. The meetings were reportedly related to philanthropy discussions, though scrutiny of the relationship contributed to his divorce.',
    shortDescription: 'Microsoft founder who met with Epstein multiple times after 2008 conviction.',
    role: 'Documented Associate',
    keywords: [
      'Bill Gates Epstein', 'Gates Epstein meetings', 'Microsoft Epstein',
      'Gates Foundation Epstein', 'Gates Melinda divorce Epstein',
      'Bill Gates philanthropy Epstein', 'tech billionaire Epstein'
    ],
    connections: ['Jeffrey Epstein', 'Melinda French Gates', 'Boris Nikolic'],
    sources: [
      { title: 'New York Times - Gates Epstein Meetings', url: 'https://www.nytimes.com/2019/10/12/business/jeffrey-epstein-bill-gates.html', type: 'news' },
      { title: 'Wall Street Journal - Gates Investigation', url: 'https://www.wsj.com/articles/bill-gates-met-with-jeffrey-epstein-many-times-despite-his-past-11571779601', type: 'news' },
      { title: 'The Daily Beast - Gates Admissions', url: 'https://www.thedailybeast.com/bill-gates-admits-he-spent-nights-at-jeffrey-epsteins-manhattan-mansion', type: 'news' },
      { title: 'Gates Notes - Official Statement', url: 'https://www.gatesnotes.com/', type: 'archive' }
    ],
    timeline: [
      { date: '2011', event: 'First documented meeting with Epstein' },
      { date: '2013', event: 'Flies on Epstein\'s plane from Teterboro to Palm Beach' },
      { date: '2014', event: 'Final documented meeting with Epstein' },
      { date: '2019', event: 'Initial statement minimizing relationship' },
      { date: '2021', event: 'Gates divorce; Epstein meetings cited as factor' }
    ],
    metadata: {
      documentCount: 156,
      connectionCount: 34,
      flightLogAppearances: 1,
      blackBookEntry: false,
      circledInBlackBook: false
    }
  },
  {
    id: 'donald-trump',
    name: 'Donald Trump',
    type: 'person',
    aliases: ['Donald John Trump', 'President Trump', 'DJT'],
    description: 'Donald Trump, 45th President of the United States, had a social relationship with Jeffrey Epstein in the 1990s and early 2000s, documented through photos and quotes. Trump later banned Epstein from Mar-a-Lago reportedly after an incident involving a member\'s daughter. Trump has distanced himself from Epstein and in 2019 said he was "not a fan."',
    shortDescription: '45th US President, former social acquaintance of Epstein.',
    role: 'Former Social Acquaintance',
    keywords: [
      'Donald Trump Epstein', 'Trump Epstein quote', 'Trump Mar-a-Lago Epstein',
      'Trump Epstein banned', 'Trump Epstein 2002', 'President Trump Epstein',
      'Trump Epstein parties', 'Trump Epstein friend'
    ],
    connections: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Virginia Giuffre'],
    sources: [
      { title: 'New York Magazine 2002 Profile Quote', url: 'https://nymag.com/nymetro/news/people/n_7912/', type: 'archive' },
      { title: 'Politico - Trump Epstein Timeline', url: 'https://www.politico.com/story/2019/07/21/jeffrey-epstein-trump-relationship-explained-1424120', type: 'news' },
      { title: 'Court Documents - Virginia Giuffre Deposition', url: 'https://www.courtlistener.com/docket/4355835/giuffre-v-maxwell/', type: 'court_document' },
      { title: 'Washington Post - Mar-a-Lago Ban', url: 'https://www.washingtonpost.com/politics/trump-called-epstein-a-terrific-guy-before-saying-he-was-not-a-fan/2019/07/08/a01e0f00-a1be-11e9-bd56-eac6bb02d01d_story.html', type: 'news' }
    ],
    timeline: [
      { date: '1992', event: 'Photographed with Epstein at Mar-a-Lago' },
      { date: '2002', event: 'NY Magazine quote: "terrific guy"' },
      { date: '2004', event: 'Reportedly bans Epstein from Mar-a-Lago' },
      { date: '2019-07', event: 'States "I was not a fan of his"' }
    ],
    metadata: {
      documentCount: 287,
      connectionCount: 45,
      flightLogAppearances: 0,
      blackBookEntry: true,
      circledInBlackBook: false
    }
  },
  {
    id: 'jean-luc-brunel',
    name: 'Jean-Luc Brunel',
    type: 'person',
    aliases: ['Jean Luc Brunel'],
    description: 'Jean-Luc Brunel was a French modeling agent and close associate of Jeffrey Epstein who was accused of procuring young women for Epstein\'s network through his modeling agencies. He was arrested in December 2020 on charges of rape and sexual assault. Brunel was found dead in his Paris prison cell in February 2022, with his death ruled a suicide.',
    shortDescription: 'French modeling agent accused of procuring victims, died in custody.',
    role: 'Co-Conspirator / Deceased',
    keywords: [
      'Jean-Luc Brunel Epstein', 'Brunel modeling agency', 'MC2 Model Management',
      'Brunel trafficking', 'Brunel Paris', 'Brunel death', 'modeling agent Epstein',
      'Brunel arrested', 'fashion industry Epstein'
    ],
    connections: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Virginia Giuffre'],
    sources: [
      { title: 'Le Monde - Brunel Arrest', url: 'https://www.lemonde.fr/societe/article/2020/12/17/affaire-epstein-l-agent-de-mannequins-jean-luc-brunel-mis-en-examen-pour-viols_6063759_3224.html', type: 'news' },
      { title: 'The Guardian - Brunel Death', url: 'https://www.theguardian.com/world/2022/feb/19/jean-luc-brunel-found-dead-in-paris-prison', type: 'news' },
      { title: 'CBS News - Brunel Investigation', url: 'https://www.cbsnews.com/news/jean-luc-brunel-modeling-agent-jeffrey-epstein-associate-found-dead-paris-prison/', type: 'news' },
      { title: 'Court Documents - Giuffre Allegations', url: 'https://www.courtlistener.com/docket/4355835/giuffre-v-maxwell/', type: 'court_document' }
    ],
    timeline: [
      { date: '1980s', event: 'Establishes relationship with Epstein' },
      { date: '1999', event: 'Founds MC2 Model Management with Epstein funding' },
      { date: '2015', event: 'Named in Giuffre court filings' },
      { date: '2020-12-16', event: 'Arrested at Charles de Gaulle airport' },
      { date: '2022-02-19', event: 'Found dead in La Santé Prison, Paris' }
    ],
    metadata: {
      documentCount: 534,
      connectionCount: 87,
      flightLogAppearances: 24,
      blackBookEntry: true,
      circledInBlackBook: true
    }
  }
];

// ============================================================================
// KEY ORGANIZATIONS
// ============================================================================

export const KEY_ORGANIZATIONS: EntitySEO[] = [
  {
    id: 'fbi',
    name: 'Federal Bureau of Investigation',
    type: 'organization',
    aliases: ['FBI', 'Bureau'],
    description: 'The FBI conducted multiple investigations into Jeffrey Epstein, including a 2006 federal probe in Florida, a 2019 arrest operation by the FBI-NYPD Crimes Against Children Task Force, and ongoing investigations into potential co-conspirators. FBI agents executed search warrants on Epstein\'s properties, recovering extensive evidence including photographs, videos, and records.',
    shortDescription: 'Lead federal agency in Epstein investigations and evidence collection.',
    role: 'Investigative Agency',
    keywords: [
      'FBI Epstein investigation', 'FBI Epstein raid', 'FBI Crimes Against Children',
      'FBI Maxwell arrest', 'FBI Epstein evidence', 'federal investigation Epstein',
      'FBI vault Epstein', 'FBI Epstein files'
    ],
    connections: ['DOJ', 'SDNY', 'Palm Beach Police'],
    sources: [
      { title: 'FBI Vault - Epstein Records', url: 'https://vault.fbi.gov/jeffrey-epstein', type: 'government' },
      { title: 'FBI Press Release - 2019 Arrest', url: 'https://www.fbi.gov/news/press-releases/press-releases/statement-of-u-s-attorney-geoffrey-s-berman-on-the-arrest-of-jeffrey-epstein', type: 'government' },
      { title: 'Justice Department - FBI Investigation', url: 'https://www.justice.gov/usao-sdny/pr/jeffrey-epstein-charged-manhattan-federal-court-sex-trafficking-minors', type: 'government' }
    ],
    metadata: {
      documentCount: 2341,
      connectionCount: 156
    }
  },
  {
    id: 'sdny',
    name: 'Southern District of New York',
    type: 'organization',
    aliases: ['SDNY', 'US Attorney\'s Office SDNY', 'Manhattan Federal Court'],
    description: 'The US Attorney\'s Office for the Southern District of New York brought the 2019 federal charges against Jeffrey Epstein and later prosecuted Ghislaine Maxwell. SDNY prosecutors overcame jurisdictional challenges and secured Maxwell\'s conviction on five federal counts. The office continues to investigate potential co-conspirators.',
    shortDescription: 'Federal prosecutors who charged Epstein and convicted Maxwell.',
    role: 'Prosecutorial Authority',
    keywords: [
      'SDNY Epstein', 'Manhattan federal court Epstein', 'SDNY Maxwell trial',
      'federal prosecutors Epstein', 'SDNY indictment', 'Southern District New York Epstein',
      'Geoffrey Berman Epstein', 'federal charges Epstein'
    ],
    connections: ['FBI', 'DOJ', 'Ghislaine Maxwell', 'Jeffrey Epstein'],
    sources: [
      { title: 'SDNY - Epstein Indictment', url: 'https://www.justice.gov/usao-sdny/press-release/file/1180481/download', type: 'court_document' },
      { title: 'SDNY - Maxwell Verdict', url: 'https://www.justice.gov/usao-sdny/pr/ghislaine-maxwell-found-guilty-conspiring-jeffrey-epstein-sexually-abuse-minors', type: 'government' },
      { title: 'Court Listener - SDNY Epstein Cases', url: 'https://www.courtlistener.com/?q=epstein&court=nysd', type: 'court_document' }
    ],
    metadata: {
      documentCount: 4567,
      connectionCount: 234
    }
  },
  {
    id: 'doj',
    name: 'Department of Justice',
    type: 'organization',
    aliases: ['DOJ', 'Justice Department', 'US Department of Justice'],
    description: 'The US Department of Justice was involved in multiple phases of the Epstein investigation, including the controversial 2008 Non-Prosecution Agreement negotiated in Florida, and the 2019 federal prosecution in New York. The DOJ Office of Professional Responsibility later investigated the 2008 plea deal, finding prosecutors exercised "poor judgment" but did not commit misconduct.',
    shortDescription: 'Federal department overseeing Epstein prosecutions and NPA controversy.',
    role: 'Federal Oversight',
    keywords: [
      'DOJ Epstein', 'Justice Department Epstein', 'DOJ Non-Prosecution Agreement',
      'Acosta plea deal', 'DOJ OPR report', 'federal prosecution Epstein',
      'DOJ documents Epstein', 'CVRA Epstein'
    ],
    connections: ['FBI', 'SDNY', 'Alexander Acosta'],
    sources: [
      { title: 'DOJ OPR Report on 2008 NPA', url: 'https://www.justice.gov/opr/page/file/1316066/download', type: 'government' },
      { title: 'DOJ Press Release Archive', url: 'https://www.justice.gov/usao-sdny/pr/jeffrey-epstein-charged-manhattan-federal-court-sex-trafficking-minors', type: 'government' },
      { title: 'NPA Document', url: 'https://www.documentcloud.org/documents/1508967-non-prosecution-agreement', type: 'court_document' }
    ],
    metadata: {
      documentCount: 11622,
      connectionCount: 456
    }
  },
  {
    id: 'palm-beach-police',
    name: 'Palm Beach Police Department',
    type: 'organization',
    aliases: ['PBPD', 'Palm Beach PD'],
    description: 'The Palm Beach Police Department initiated the first investigation into Jeffrey Epstein in March 2005 after a parent reported her daughter had been paid for sexual acts at Epstein\'s Palm Beach mansion. Detective Joseph Recarey led a comprehensive investigation that identified numerous victims and referred the case to the FBI for federal charges.',
    shortDescription: 'Local police who initiated the first Epstein investigation in 2005.',
    role: 'Initial Investigators',
    keywords: [
      'Palm Beach Police Epstein', 'Joseph Recarey', 'Epstein investigation 2005',
      'Palm Beach mansion Epstein', 'police investigation Epstein',
      'Florida Epstein case', 'local police Epstein'
    ],
    connections: ['FBI', 'Jeffrey Epstein', 'Barry Krischer'],
    sources: [
      { title: 'Miami Herald - Investigation Timeline', url: 'https://www.miamiherald.com/news/local/article220097825.html', type: 'news' },
      { title: 'Palm Beach Post - Police Records', url: 'https://www.palmbeachpost.com/news/crime--law/palm-beach-police-used-persistence-get-epstein-investigation-federal-level/3rKlNGQTPiIZDqBaXCGDVL/', type: 'news' },
      { title: 'Detective Recarey Investigation Report', url: 'https://www.documentcloud.org/documents/6250471-Epstein-Docs', type: 'court_document' }
    ],
    metadata: {
      documentCount: 876,
      connectionCount: 45
    }
  },
  {
    id: 'l-brands',
    name: 'L Brands',
    type: 'organization',
    aliases: ['Limited Brands', 'Victoria\'s Secret Parent', 'Bath & Body Works Parent'],
    description: 'L Brands, the parent company of Victoria\'s Secret and Bath & Body Works, was founded by Leslie Wexner, Jeffrey Epstein\'s primary financial client. Questions arose about whether Epstein used his Wexner connection to recruit victims under the guise of modeling opportunities. L Brands hired an outside law firm to investigate after Epstein\'s 2019 arrest.',
    shortDescription: 'Victoria\'s Secret parent company connected to Epstein through founder Leslie Wexner.',
    role: 'Corporate Connection',
    keywords: [
      'Victoria Secret Epstein', 'L Brands Epstein', 'Wexner company Epstein',
      'Limited Brands Epstein', 'Bath Body Works Epstein', 'modeling recruitment Epstein',
      'corporate Epstein connection'
    ],
    connections: ['Leslie Wexner', 'Jeffrey Epstein'],
    sources: [
      { title: 'New York Times - L Brands Investigation', url: 'https://www.nytimes.com/2019/07/25/business/jeffrey-epstein-wexner-victorias-secret.html', type: 'news' },
      { title: 'Bloomberg - L Brands Hires Investigators', url: 'https://www.bloomberg.com/news/articles/2019-08-07/l-brands-hires-law-firm-to-review-wexner-s-ties-to-epstein', type: 'news' },
      { title: 'SEC Filings - L Brands', url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000701985', type: 'government' }
    ],
    metadata: {
      documentCount: 234,
      connectionCount: 23
    }
  },
  {
    id: 'mc2-model-management',
    name: 'MC2 Model Management',
    type: 'organization',
    aliases: ['MC2', 'MC2 Models'],
    description: 'MC2 Model Management was a modeling agency founded by Jean-Luc Brunel with funding from Jeffrey Epstein. The agency, based in Miami, has been accused in court documents of serving as a front for trafficking young women from South America and Eastern Europe. The agency closed following scrutiny of its Epstein connections.',
    shortDescription: 'Epstein-funded modeling agency accused of trafficking recruitment.',
    role: 'Alleged Front Organization',
    keywords: [
      'MC2 Epstein', 'MC2 Model Management trafficking', 'Brunel modeling agency',
      'Epstein modeling', 'Miami modeling agency Epstein', 'model trafficking Epstein',
      'South American models Epstein'
    ],
    connections: ['Jeffrey Epstein', 'Jean-Luc Brunel', 'Ghislaine Maxwell'],
    sources: [
      { title: 'Court Documents - MC2 Allegations', url: 'https://www.courtlistener.com/docket/4355835/giuffre-v-maxwell/', type: 'court_document' },
      { title: 'Daily Beast - MC2 Investigation', url: 'https://www.thedailybeast.com/inside-the-modeling-world-of-jeffrey-epsteins-alleged-fixer-jean-luc-brunel', type: 'news' },
      { title: 'Miami Herald - Modeling Agency Probe', url: 'https://www.miamiherald.com/news/local/article238351108.html', type: 'news' }
    ],
    metadata: {
      documentCount: 345,
      connectionCount: 56
    }
  }
];

// ============================================================================
// KEY LOCATIONS
// ============================================================================

export const KEY_LOCATIONS: EntitySEO[] = [
  {
    id: 'little-st-james',
    name: 'Little St. James Island',
    type: 'location',
    aliases: ['Epstein Island', 'Pedophile Island', 'Little Saint James', 'Private Island'],
    description: 'Little St. James is a 70-acre private island in the US Virgin Islands owned by Jeffrey Epstein from 1998 until his death. The island featured multiple buildings including a main residence, guest houses, and a distinctive temple-like structure. Numerous survivors have testified about abuse occurring on the island, and FBI raids recovered extensive evidence from the property.',
    shortDescription: 'Epstein\'s private Caribbean island, site of documented abuse and FBI raid.',
    role: 'Primary Crime Scene',
    keywords: [
      'Epstein Island', 'Little St James', 'pedophile island', 'Epstein Caribbean',
      'Virgin Islands Epstein', 'Epstein private island', 'temple island Epstein',
      'FBI raid Epstein island', 'Little Saint James abuse'
    ],
    connections: ['Jeffrey Epstein', 'Ghislaine Maxwell', 'US Virgin Islands'],
    sources: [
      { title: 'FBI Search Warrant - Little St. James', url: 'https://www.documentcloud.org/documents/6250471-Epstein-Docs', type: 'court_document' },
      { title: 'CBS News - Island Raid Coverage', url: 'https://www.cbsnews.com/news/jeffrey-epstein-private-island-little-st-james-fbi-raid-us-virgin-islands/', type: 'news' },
      { title: 'The Atlantic - Island Investigation', url: 'https://www.theatlantic.com/politics/archive/2019/07/jeffrey-epsteins-private-island/594580/', type: 'news' },
      { title: 'Property Records - USVI', url: 'https://www.ltg.gov.vi/', type: 'government' }
    ],
    metadata: {
      documentCount: 2341,
      connectionCount: 456
    }
  },
  {
    id: 'manhattan-townhouse',
    name: 'Epstein Manhattan Townhouse',
    type: 'location',
    aliases: ['9 East 71st Street', 'NYC Mansion', 'Manhattan Mansion', 'Upper East Side Mansion'],
    description: 'The seven-story Manhattan townhouse at 9 East 71st Street was one of the largest private residences in New York City. Originally transferred from Leslie Wexner to Epstein in 1996, the property was raided by FBI agents in July 2019, yielding photographs, videos, and other evidence. The home featured unusual decor including a mural of Epstein in prison.',
    shortDescription: 'Epstein\'s Manhattan residence, site of FBI raid that recovered key evidence.',
    role: 'Primary Residence / Crime Scene',
    keywords: [
      'Epstein Manhattan mansion', 'Epstein NYC home', '9 East 71st Street',
      'Epstein townhouse', 'FBI raid Manhattan', 'Upper East Side Epstein',
      'New York mansion Epstein', 'Wexner mansion'
    ],
    connections: ['Jeffrey Epstein', 'Leslie Wexner', 'Ghislaine Maxwell'],
    sources: [
      { title: 'FBI Search Warrant - Manhattan', url: 'https://www.documentcloud.org/documents/6194372-U-S-v-Jeffrey-Epstein-Search-Warrant', type: 'court_document' },
      { title: 'New York Post - Mansion Details', url: 'https://nypost.com/2019/07/08/inside-the-creepy-manhattan-mansion-where-jeffrey-epstein-allegedly-abused-girls/', type: 'news' },
      { title: 'Property Records - NYC DOF', url: 'https://www1.nyc.gov/site/finance/taxes/property.page', type: 'government' }
    ],
    metadata: {
      documentCount: 1567,
      connectionCount: 234
    }
  },
  {
    id: 'palm-beach-mansion',
    name: 'Epstein Palm Beach Mansion',
    type: 'location',
    aliases: ['Palm Beach House', 'Florida Mansion', '358 El Brillo Way'],
    description: 'Epstein\'s Palm Beach mansion at 358 El Brillo Way was where the initial investigation began in 2005. The property was the site of the massage sessions that led to his first arrest. Palm Beach Police recovered extensive evidence from the property, and numerous survivors testified about abuse occurring there.',
    shortDescription: 'Florida mansion where initial police investigation began in 2005.',
    role: 'Crime Scene / Evidence Location',
    keywords: [
      'Epstein Palm Beach', 'El Brillo Way', 'Florida mansion Epstein',
      'Palm Beach investigation', 'Epstein Florida house', 'massage room Epstein',
      'Palm Beach police Epstein'
    ],
    connections: ['Jeffrey Epstein', 'Palm Beach Police', 'Ghislaine Maxwell'],
    sources: [
      { title: 'Palm Beach Police Reports', url: 'https://www.documentcloud.org/documents/6250471-Epstein-Docs', type: 'court_document' },
      { title: 'Miami Herald - Palm Beach Investigation', url: 'https://www.miamiherald.com/news/local/article220097825.html', type: 'news' },
      { title: 'Property Records - Palm Beach County', url: 'https://www.pbcgov.org/papa/', type: 'government' }
    ],
    metadata: {
      documentCount: 2134,
      connectionCount: 189
    }
  },
  {
    id: 'zorro-ranch',
    name: 'Zorro Ranch',
    type: 'location',
    aliases: ['New Mexico Ranch', 'Stanley Ranch', 'Epstein Ranch'],
    description: 'Zorro Ranch is a 10,000-acre property in Stanley, New Mexico that Epstein owned since 1993. The ranch featured an airstrip and main residence, and was the subject of investigation by the New Mexico Attorney General. Reports indicate Epstein discussed plans for a "baby ranch" to spread his DNA at this location.',
    shortDescription: 'Epstein\'s New Mexico ranch with private airstrip, under state investigation.',
    role: 'Property / Investigation Site',
    keywords: [
      'Epstein ranch New Mexico', 'Zorro Ranch', 'Stanley New Mexico Epstein',
      'Epstein baby ranch', 'New Mexico investigation Epstein', 'Epstein airstrip',
      'rural property Epstein'
    ],
    connections: ['Jeffrey Epstein', 'New Mexico Attorney General'],
    sources: [
      { title: 'New York Times - Zorro Ranch', url: 'https://www.nytimes.com/2019/07/31/business/jeffrey-epstein-eugenics.html', type: 'news' },
      { title: 'Santa Fe New Mexican - Local Coverage', url: 'https://www.santafenewmexican.com/news/local_news/epstein-secretly-bought-nm-ranch-in-early-1990s/article_bc3b8e1c-0c63-5ac8-ab9f-0fb5dfee5c75.html', type: 'news' },
      { title: 'Property Records - Santa Fe County', url: 'https://www.santafecountynm.gov/assessor', type: 'government' }
    ],
    metadata: {
      documentCount: 456,
      connectionCount: 67
    }
  },
  {
    id: 'paris-apartment',
    name: 'Epstein Paris Apartment',
    type: 'location',
    aliases: ['Avenue Foch', 'Paris Residence', 'France Property'],
    description: 'Epstein owned a luxury apartment on Avenue Foch in Paris, one of the most expensive addresses in the world. The property was searched by French authorities investigating potential crimes committed in France. Jean-Luc Brunel was connected to recruitment activities at this location.',
    shortDescription: 'Epstein\'s Paris residence on exclusive Avenue Foch, searched by French police.',
    role: 'International Property',
    keywords: [
      'Epstein Paris', 'Avenue Foch Epstein', 'Epstein France', 'Paris apartment Epstein',
      'French investigation Epstein', 'Europe property Epstein'
    ],
    connections: ['Jeffrey Epstein', 'Jean-Luc Brunel', 'French Authorities'],
    sources: [
      { title: 'Le Monde - Paris Investigation', url: 'https://www.lemonde.fr/police-justice/article/2019/08/23/enquete-francaise-sur-jeffrey-epstein-la-piste-de-l-appartement-parisien_5502070_1653578.html', type: 'news' },
      { title: 'France24 - Property Coverage', url: 'https://www.france24.com/en/20190902-exclusive-french-police-search-paris-apartment-epstein-pedophile', type: 'news' }
    ],
    metadata: {
      documentCount: 234,
      connectionCount: 45
    }
  }
];

// ============================================================================
// COMBINED EXPORT FOR SEO
// ============================================================================

export const ALL_SEO_ENTITIES: EntitySEO[] = [
  ...HIGH_PROFILE_PEOPLE,
  ...KEY_ORGANIZATIONS,
  ...KEY_LOCATIONS
];

/**
 * Generate JSON-LD structured data for an entity
 */
export function generateEntityJsonLd(entity: EntitySEO): object {
  const baseUrl = 'https://epsteinexposed.org';
  
  if (entity.type === 'person') {
    return {
      '@context': 'https://schema.org',
      '@type': 'Person',
      '@id': `${baseUrl}/entity/${entity.id}`,
      'name': entity.name,
      'alternateName': entity.aliases,
      'description': entity.description,
      'url': `${baseUrl}/entity/${entity.id}`,
      'sameAs': entity.sources.filter(s => s.type === 'news' || s.type === 'archive').map(s => s.url),
      'subjectOf': {
        '@type': 'Dataset',
        'name': `${entity.name} - Epstein Case Documents`,
        'description': `${entity.metadata.documentCount || 0} documents mentioning ${entity.name} in the Epstein case files.`,
        'creator': { '@type': 'Organization', 'name': 'Epstein Exposed' }
      }
    };
  }
  
  if (entity.type === 'organization') {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${baseUrl}/entity/${entity.id}`,
      'name': entity.name,
      'alternateName': entity.aliases,
      'description': entity.description,
      'url': `${baseUrl}/entity/${entity.id}`
    };
  }
  
  if (entity.type === 'location') {
    return {
      '@context': 'https://schema.org',
      '@type': 'Place',
      '@id': `${baseUrl}/entity/${entity.id}`,
      'name': entity.name,
      'alternateName': entity.aliases,
      'description': entity.description,
      'url': `${baseUrl}/entity/${entity.id}`
    };
  }
  
  return {};
}

/**
 * Generate meta tags for an entity page
 */
export function generateEntityMetaTags(entity: EntitySEO): {
  title: string;
  description: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
} {
  return {
    title: `${entity.name} | Epstein Exposed - ${entity.metadata.documentCount || 0} Documents`,
    description: entity.shortDescription + ` Cross-reference ${entity.metadata.documentCount || 0} documents and ${entity.metadata.connectionCount || 0} connections.`,
    keywords: entity.keywords.join(', '),
    ogTitle: `${entity.name} - Epstein Case Documents & Connections`,
    ogDescription: entity.shortDescription
  };
}

/**
 * Get all keywords for sitemap/SEO
 */
export function getAllKeywords(): string[] {
  const allKeywords = new Set<string>();
  ALL_SEO_ENTITIES.forEach(entity => {
    entity.keywords.forEach(kw => allKeywords.add(kw));
  });
  return Array.from(allKeywords);
}
