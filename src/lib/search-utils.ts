import { SheetRow } from '@/types';

export interface ProfessorProfile {
  name: string;
  acronym: string;
  aliases: string[];
}

export const PROFESSOR_PROFILES: ProfessorProfile[] = [
  { name: 'Dr. Asima Bhattacharyya', acronym: 'AB', aliases: ['asima', 'bhattacharyya', 'bhattacharya'] },
  { name: 'Dr. Abdur Rehman', acronym: 'AR', aliases: ['abdur', 'rehman', 'rahman'] },
  { name: 'Dr. Tirumala K Chaudhary', acronym: 'TKC', aliases: ['tirumala', 'chaudhary', 'chaudhuri', 'kumar'] },
  { name: 'Dr. Rittik Deb', acronym: 'RD', aliases: ['rittik', 'deb'] },
  { name: 'Dr. Ramanujam Srinivasan', acronym: 'RS', aliases: ['ramanujam', 'srinivasan', 'srinivas', 'r srinivasan'] },
  { name: 'Dr. Majusha Dixit', acronym: 'MD', aliases: ['majusha', 'dixit', 'manjusha'] },
  { name: 'Dr. A. Datta Roy', acronym: 'ADR', aliases: ['datta', 'roy', 'dattaroy', 'aniruddha'] },
  { name: 'Dr. Chandan Goswami', acronym: 'CG', aliases: ['chandan', 'goswami'] },
  { name: 'Dr. K.C.S. Panigrahi', acronym: 'KCSP', aliases: ['panigrahi', 'kcs', 'k.c.s.'] },
  { name: 'Dr. Pankaj Alone', acronym: 'PA', aliases: ['pankaj', 'alone'] },
  { name: 'Dr. Tridib Mahata', acronym: 'TM', aliases: ['tridib', 'mahata'] },
  { name: 'Dr. Harapriya Mohapatra', acronym: 'HM', aliases: ['harapriya', 'mohapatra'] },
  { name: 'Dr. Subhasis Chattopadhyay', acronym: 'SC', aliases: ['subhasis', 'chattopadhyay', 'chatterjee'] },
  { name: 'Dr. Debasmita P. Alone', acronym: 'DPA', aliases: ['debasmita'] },
  { name: 'Dr. Swagata Ghatak', acronym: 'SG', aliases: ['swagata', 'ghatak'] },
  { name: 'Dr. Rudresh Acharya', acronym: 'RA', aliases: ['rudresh', 'acharya'] },
  { name: 'Dr. Mohammed Saleem', acronym: 'MS', aliases: ['saleem', 'mohammed', 'md saleem', 'md. saleem'] },
  { name: 'Dr. Badiree Konimala', acronym: 'BK', aliases: ['badiree', 'konimala'] },
  { name: 'Dr. Palok Aich', acronym: 'PA', aliases: ['palok', 'aich'] },
  { name: 'Dr. Praful Singru', acronym: 'PS', aliases: ['praful', 'singru'] },
  { name: 'Dr. Himabindu Vasuki', acronym: 'HV', aliases: ['himabindu', 'hemabindu', 'vasuki'] },
];

/**
 * Find professor profile by any name, alias, or acronym
 */
export function findProfessorProfile(queryToken: string): ProfessorProfile | null {
  const clean = queryToken.trim().toLowerCase().replace(/^(dr\.|prof\.|dr|prof)[\s._-]*/i, '');
  if (!clean) return null;

  for (const prof of PROFESSOR_PROFILES) {
    if (prof.acronym.toLowerCase() === clean) return prof;
    if (prof.name.toLowerCase().includes(clean)) return prof;
    for (const alias of prof.aliases) {
      if (alias === clean || clean.includes(alias) || alias.includes(clean)) {
        return prof;
      }
    }
  }
  return null;
}

/**
 * Normalizes user queries into structured search criteria
 */
export interface ParsedQuery {
  rawQuery: string;
  tokens: string[];
  matchedProfessors: ProfessorProfile[];
  fileType?: string;
  examType?: string;
  year?: string;
  courseCode?: string;
}

export function parseSearchQuery(rawQuery: string): ParsedQuery {
  const query = rawQuery.trim().toLowerCase();
  const tokens = query.split(/\s+/).filter(Boolean);
  const matchedProfessors: ProfessorProfile[] = [];

  let fileType: string | undefined;
  let examType: string | undefined;
  let year: string | undefined;
  let courseCode: string | undefined;

  for (const token of tokens) {
    // Check year
    if (/^\d{4}$/.test(token)) {
      year = token;
      continue;
    }
    // Check course code
    const codeMatch = token.match(/^(?:BIO|B)?(\d{3})$/i);
    if (codeMatch) {
      courseCode = `B${codeMatch[1]}`;
      continue;
    }
    // Check file type
    if (['notes', 'note'].includes(token)) fileType = 'notes';
    else if (['slides', 'slide', 'ppt', 'pptx'].includes(token)) fileType = 'slides';
    else if (['qpaper', 'qpapers', 'pyq', 'exam', 'paper'].includes(token)) fileType = 'qpaper';
    else if (['lab', 'manual'].includes(token)) fileType = 'lab';
    else if (['assignment', 'asgn', 'homework'].includes(token)) fileType = 'assignment';

    // Check exam type
    if (['mid', 'ms', 'midsem', 'midsemester'].includes(token)) examType = 'MS';
    else if (['end', 'es', 'endsem', 'endsemester'].includes(token)) examType = 'ES';

    // Check professor
    const prof = findProfessorProfile(token);
    if (prof && !matchedProfessors.some(p => p.name === prof.name)) {
      matchedProfessors.push(prof);
    }
  }

  // Also test full query string for professor match
  if (matchedProfessors.length === 0) {
    const fullProf = findProfessorProfile(query);
    if (fullProf) matchedProfessors.push(fullProf);
  }

  return {
    rawQuery: query,
    tokens,
    matchedProfessors,
    fileType,
    examType,
    year,
    courseCode,
  };
}

/**
 * Scores and filters files based on parsed search query
 */
export function scoreAndFilterFiles(files: SheetRow[], rawQuery: string): SheetRow[] {
  const parsed = parseSearchQuery(rawQuery);
  const tokens = parsed.tokens;

  if (tokens.length === 0) return [];

  const scoredFiles: { file: SheetRow; score: number }[] = [];

  for (const file of files) {
    let score = 0;
    const fileProf = (file.professor || '').toLowerCase();
    const fileProf2 = (file.professor2 || '').toLowerCase();
    const fileProf3 = (file.professor3 || '').toLowerCase();
    const fileName = (file.fileName || '').toLowerCase();
    const fileCourseCode = (file.courseCode || '').toLowerCase();
    const fileCourseName = (file.courseName || '').toLowerCase();
    const fileType = (file.fileType || '').toLowerCase();
    const fileExamType = (file.examType || '').toLowerCase();
    const fileYear = (file.year || '').toLowerCase();
    const fileRemarks = (file.remarks || '').toLowerCase();

    // 1. If query matches a professor profile
    if (parsed.matchedProfessors.length > 0) {
      let isProfMatch = false;

      for (const prof of parsed.matchedProfessors) {
        const profNameLower = prof.name.toLowerCase();
        const acronymLower = prof.acronym.toLowerCase();

        // Check if file.professor matches
        if (
          fileProf.includes(profNameLower) ||
          fileProf2.includes(profNameLower) ||
          fileProf3.includes(profNameLower) ||
          prof.aliases.some(alias => fileProf.includes(alias) || fileProf2.includes(alias) || fileProf3.includes(alias))
        ) {
          isProfMatch = true;
          score += 100;
        }

        // Check if filename contains professor acronym or professor alias
        const profAcronymInName = new RegExp(`_${acronymLower}_|_prof${acronymLower}_|^${acronymLower}_`, 'i');
        if (profAcronymInName.test(fileName)) {
          isProfMatch = true;
          score += 80;
        }

        for (const alias of prof.aliases) {
          if (alias.length > 2 && fileName.includes(alias)) {
            isProfMatch = true;
            score += 60;
          }
        }
      }

      // If user searched for a professor, but this file has NO match with that professor -> SKIP IT!
      if (!isProfMatch) {
        continue;
      }
    }

    // 2. Course code match
    if (parsed.courseCode) {
      const codeNum = parsed.courseCode.replace(/\D/g, '');
      if (fileCourseCode.includes(codeNum)) {
        score += 90;
      } else {
        if (!parsed.matchedProfessors.length && tokens.length === 1) continue;
      }
    }

    // 3. File type / exam type / year filters & boosts
    if (parsed.fileType && fileType.includes(parsed.fileType)) {
      score += 40;
    }
    if (parsed.examType && fileExamType.includes(parsed.examType)) {
      score += 40;
    }
    if (parsed.year && fileYear.includes(parsed.year)) {
      score += 30;
    }

    // 4. Token & string matching
    let allTokensMatched = true;
    for (const token of tokens) {
      const inName = fileName.includes(token);
      const inCourse = fileCourseCode.includes(token) || fileCourseName.includes(token);
      const inProf = fileProf.includes(token) || fileProf2.includes(token) || fileProf3.includes(token);
      const inRemarks = fileRemarks.includes(token);
      const inYear = fileYear.includes(token);
      const inExam = fileExamType.includes(token);
      const inType = fileType.includes(token);

      if (inName) score += 30;
      if (inCourse) score += 20;
      if (inProf) score += 25;
      if (inRemarks) score += 10;
      if (inExam) score += 15;

      if (!inName && !inCourse && !inProf && !inRemarks && !inYear && !inExam && !inType) {
        allTokensMatched = false;
      }
    }

    if (!parsed.matchedProfessors.length && !allTokensMatched) {
      continue;
    }

    if (score > 0) {
      scoredFiles.push({ file, score });
    }
  }

  scoredFiles.sort((a, b) => b.score - a.score);
  return scoredFiles.map(s => s.file);
}
