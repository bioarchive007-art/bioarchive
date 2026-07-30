/**
 * ============================================================================
 * NISER BIOLOGY PROFESSORS MASTER DATA & ACRONYMS FILE
 * ============================================================================
 * 
 * FILE LOCATION: src/data/professors.ts
 * 
 * HOW TO UPDATE / MAINTAIN THIS FILE IN THE FUTURE:
 * 
 * 1. EDITING / FIXING PROFESSOR NAMES & SPELLINGS:
 *    - Locate the professor entry in the `PROFESSORS` array below.
 *    - Update the `name` field directly with correct spelling (e.g. "Dr. R. Srinivasan").
 *    - Ensure `acronym` matches the intended 2-4 letter uppercase code used for filenames (e.g. "RS").
 * 
 * 2. ADDING A NEW PROFESSOR:
 *    - Append a new object to the `PROFESSORS` array following this format:
 *      {
 *        id: 'prof-lastname',
 *        name: 'Dr. Full Name',
 *        acronym: 'FN',
 *        gender: 'Male', // 'Male' | 'Female' | 'Other' (optional)
 *        department: 'School of Biological Sciences', // (optional)
 *        email: 'email@niser.ac.in' // (optional)
 *      }
 * 
 * 3. ADDING MORE DATA FIELDS (e.g. Gender, Office Room, Designation, Research Area):
 *    - Update the `Professor` interface below to include your new field (e.g. `officeRoom?: string;`).
 *    - Populate the new field for existing or new professor entries.
 *    - The rest of the app will automatically pick up updated names, acronyms, and metadata.
 * 
 * ============================================================================
 */

export interface Professor {
  id: string;
  name: string;
  acronym: string;
  // gender?: 'Male' | 'Female' | 'Other';
  // department?: string;
  email?: string;
}

export const PROFESSORS: Professor[] = [
  {
    id: 'prof-srinivasan',
    name: 'Dr. Ramanujam Srinivasan',
    acronym: 'RS',
    // gender: 'Male',
    // department: 'School of Biological Sciences',
  },
  {
    id: 'prof-datta-roy',
    name: 'Dr. Aniruddha Datta Roy',
    acronym: 'ADR',
    // gender: 'Male',
    // department: 'School of Biological Sciences',
  },
  {
    id: 'prof-deb',
    name: 'Dr. Rittik Deb',
    acronym: 'RD',
    // gender: 'Male',
    // department: 'School of Biological Sciences',
  },
  {
    id: 'prof-rehman',
    name: 'Dr. Abdur Rehman',
    acronym: 'AR',
    // gender: 'Male',
    // department: 'School of Biological Sciences',
  },
  {
    id: 'prof-saleem',
    name: 'Dr. Mohammed Saleem',
    acronym: 'MS',
    // gender: 'Male',
    // department: 'School of Biological Sciences',
  },
  {
    id: 'prof-dixit',
    name: 'Dr. Majusha Dixit',
    acronym: 'MD',
    // gender: 'Female',
    // department: 'School of Biological Sciences',
  },
  {
    id: 'prof-vasuki',
    name: 'Dr. K Himabindu Vasuki',
    acronym: 'HVK',
    // gender: 'Female',
    // department: 'School of Biological Sciences',
  },
  {
    id: 'prof-mohapatra',
    name: 'Dr. Harapriya Mohapatra',
    acronym: 'HM',
    // gender: 'Female',
    // department: 'School of Biological Sciences',
  },
  {
    id: 'prof-goswami',
    name: 'Prof. Chandan Goswami',
    acronym: 'CG',
    // gender: 'Male',
    // department: 'School of Biological Sciences',
  },
  {
    id: 'prof-panigrahi',
    name: 'Dr. Kishore C.S. Panigrahi',
    acronym: 'KCSP',
    // gender: 'Male',
    // department: 'School of Biological Sciences',
  },
  {
    id: 'prof-pankaj-alone',
    name: 'Dr. Pankaj Vidyadhar Alone',
    acronym: 'PVA',
    // gender: 'Male',
    // department: 'School of Biological Sciences',
  },
  {
    id: 'prof-mahata',
    name: 'Dr. Tridib Mahata',
    acronym: 'TM',
    // gender: 'Male',
    // department: 'School of Biological Sciences',
  },
  {
    id: 'prof-bhattacharyya',
    name: 'Dr. Asima Bhattacharyya',
    acronym: 'AB',
    // gender: 'Female',
    // department: 'School of Biological Sciences',
  },
  {
    id: 'prof-chattopadhyay',
    name: 'Dr. Subhasis Chattopadhyay',
    acronym: 'SC',
    // gender: 'Male',
    // department: 'School of Biological Sciences',
  },
  {
    id: 'prof-debasmita-alone',
    name: 'Dr. Debasmita Pankaj Alone',
    acronym: 'DPA',
    // gender: 'Female',
    // department: 'School of Biological Sciences',
  },
  {
    id: 'prof-ghatak',
    name: 'Dr. Swagata Ghatak',
    acronym: 'SG',
    // gender: 'Female',
    // department: 'School of Biological Sciences',
  },
  {
    id: 'prof-acharya',
    name: 'Dr. Rudresh Acharya',
    acronym: 'RA',
    // gender: 'Male',
    // department: 'School of Biological Sciences',
  },
  {
    id: 'prof-konimala',
    name: 'Dr. V Badireenath Konkimalla',
    acronym: 'VBK',
    // gender: 'Male',
    // department: 'School of Biological Sciences',
  },
  {
    id: 'prof-aich',
    name: 'Prof. Palok Aich',
    acronym: 'PA',
    // gender: 'Male',
    // department: 'School of Biological Sciences',
  },
  {
    id: 'prof-chaudhary',
    name: 'Dr. Tirumala Kumar Chowdary',
    acronym: 'TKC',
    // gender: 'Male',
    // department: 'School of Biological Sciences',
  },
  {
    id: 'prof-singru',
    name: 'Dr. Praful Singru',
    acronym: 'PS',
    // gender: 'Male',
    // department: 'School of Biological Sciences',
  },
];

/**
 * Returns all professors sorted alphabetically by name
 */
export function getAllProfessors(): Professor[] {
  return [...PROFESSORS].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Returns a professor object matching the given name or acronym (case-insensitive)
 */
export function getProfessorByName(nameOrAcronym: string): Professor | undefined {
  if (!nameOrAcronym) return undefined;
  const clean = nameOrAcronym.trim().toLowerCase();
  return PROFESSORS.find(
    (p) =>
      p.name.toLowerCase() === clean ||
      p.acronym.toLowerCase() === clean ||
      p.id.toLowerCase() === clean ||
      p.name.toLowerCase().includes(clean)
  );
}

/**
 * Gets the standardized acronym for a professor name.
 * Falls back to auto-generating from initials if not found in master database.
 */
export function getProfessorAcronym(profName: string): string {
  if (!profName || profName.trim() === '') return 'Unknown';
  const trimmed = profName.trim();

  // 1. Direct match in master list by name or acronym
  const found = PROFESSORS.find(
    (p) =>
      p.name.toLowerCase() === trimmed.toLowerCase() ||
      p.acronym.toLowerCase() === trimmed.toLowerCase()
  );
  if (found) return found.acronym;

  // 2. If already a short acronym
  if (/^[A-Z]{2,4}$/.test(trimmed)) {
    return trimmed;
  }

  const lower = trimmed.toLowerCase();
  if (lower === 'other') return 'Other';
  if (lower === 'na' || lower === 'n/a') return 'NA';
  if (lower === 'unknown') return 'Unknown';

  // 3. Match against name without title (Dr., Prof.) and middle initials
  const clean = trimmed.replace(/^(Dr\.|Prof\.|Dr|Prof)[\s._-]*/i, '').trim();

  const stripInitials = (str: string) =>
    str.replace(/(?:\b[A-Z]\b[\s._-]*)/gi, '').replace(/\s+/g, ' ').trim().toLowerCase();

  const cleanNoInitials = stripInitials(clean);

  const foundClean = PROFESSORS.find((p) => {
    const pClean = p.name.replace(/^(Dr\.|Prof\.|Dr|Prof)[\s._-]*/i, '').trim();
    if (pClean.toLowerCase() === clean.toLowerCase()) return true;
    if (cleanNoInitials && stripInitials(pClean) === cleanNoInitials) return true;
    return false;
  });
  if (foundClean) return foundClean.acronym;

  // 4. Fallback: extract initials
  const parts = clean.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return 'Unknown';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return parts.map((p) => p[0].toUpperCase()).join('');
}

/**
 * Resolves an input professor string (from upload or sheet)
 * to a canonical course professor name from availableCourseProfs if it refers to the same person.
 */
export function resolveCanonicalProfessor(inputName: string, availableCourseProfs: string[]): string {
  if (!inputName || !inputName.trim()) return inputName;
  const inputAcronym = getProfessorAcronym(inputName);

  // 1. Acronym match against course professors
  for (const cp of availableCourseProfs) {
    if (getProfessorAcronym(cp) === inputAcronym) {
      return cp;
    }
  }

  // 2. Token / clean name match ignoring titles & middle initials
  const stripInitials = (str: string) =>
    str.replace(/^(Dr\.|Prof\.|Dr|Prof)[\s._-]*/i, '')
      .replace(/(?:\b[A-Z]\b[\s._-]*)/gi, '')
      .replace(/\s+/g, ' ').trim().toLowerCase();

  const cleanInput = stripInitials(inputName);

  for (const cp of availableCourseProfs) {
    const cleanCp = stripInitials(cp);
    if (cleanInput && cleanCp && (cleanInput === cleanCp || cleanCp.includes(cleanInput) || cleanInput.includes(cleanCp))) {
      return cp;
    }
  }

  return inputName;
}

