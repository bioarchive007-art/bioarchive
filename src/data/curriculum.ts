/**
 * NISER Integrated MSc Biology Curriculum
 * Contains course information organized by semester
 */

export interface Course {
  code: string;
  name: string;
  image: string;
  description: string;
  professors: string[];
  textbooks?: string[];
}

/**
 * Curriculum data organized by semester
 * NISER Integrated MSc Biology program (5-year program, 10 semesters)
 */
export const CURRICULUM: Record<string, Course[]> = {
  '1': [
    {
      code: 'B101',
      name: 'Biology I',
      image: 'courseicons/b101.png',
      description: 'Science of Life',
      professors: ['Dr. Ramanujam Srinivasan', 'Dr. Aniruddha Datta Roy', 'Dr. Rittik Deb', 'Dr. Abdur Rehman', 'Other'],
      textbooks: ['Campbell Biology by Lisa A. Urry', 'Biology by Peter H. Raven'],
    },
    {
      code: 'B141',
      name: 'Biology Laboratory-I',
      image: 'courseicons/b141.png',
      description: '',
      professors: ['Dr. Ramanujam Srinivasan', 'Dr. Mohammed Saleem', 'Other'],
    },
  ],
  '2': [
    {
      code: 'B102',
      name: 'Biology II',
      image: 'courseicons/b102.png',
      description: 'Cellular and Genetic Basis of Life',
      professors: ['Dr. Majusha Dixit', 'Dr. Ramanujam Srinivasan', 'Dr. Rittik Deb', 'Dr. Aniruddha Datta Roy', 'Other'],
      textbooks: ['Essential Cell Biology by Bruce Alberts', 'iGenetics: A Molecular Approach by Peter J. Russell'],
    },
    {
      code: 'B142',
      name: 'Biology Laboratory-2',
      image: 'courseicons/b142.png',
      description: '',
      professors: ['Dr. Ramanujam Srinivasan', 'Dr. Majusha Dixit', 'Dr. K Himabindu Vasuki', 'Other'],
    },
  ],
  '3': [
    {
      code: 'B201',
      name: 'Microbiology',
      image: 'courseicons/b201.png',
      description: '',
      professors: ['Dr. Ramanujam Srinivasan', 'Dr. Harapriya Mohapatra', 'Other'],
      textbooks: ['Brock Biology of Microorganisms by Michael T. Madigan', "Prescott's Microbiology by Joanne Willey"],
    },
    {
      code: 'B202',
      name: 'Biochemistry',
      image: 'courseicons/b202.png',
      description: '',
      professors: ['Dr. Abdur Rehman', 'Other'],
      textbooks: ['Lehninger Principles of Biochemistry by David L. Nelson', 'Biochemistry by Donald Voet'],
    },
    {
      code: 'B241',
      name: 'Microbiology Laboratory',
      image: 'courseicons/b241.png',
      description: '',
      professors: ['Dr. Ramanujam Srinivasan', 'Dr. Harapriya Mohapatra', 'Other'],
    },
    {
      code: 'B242',
      name: 'Biochemistry Laboratory',
      image: 'courseicons/b242.png',
      description: '',
      professors: ['Dr. Abdur Rehman', 'Other'],
    },
  ],
  '4': [
    {
      code: 'B204',
      name: 'Cell Biology',
      image: 'courseicons/b204.png',
      description: '',
      professors: ['Prof. Chandan Goswami', 'Dr. Kishore C.S. Panigrahi', 'Other'],
      textbooks: ['Molecular Biology of the Cell by Bruce Alberts', "Karp's Cell and Molecular Biology by Gerald Karp"],
    },
    {
      code: 'B206',
      name: 'Molecular Biology',
      image: 'courseicons/b206.png',
      description: '',
      professors: ['Dr. Pankaj Vidyadhar Alone', 'Dr. Tridib Mahata', 'Other'],
      textbooks: ['Molecular Biology of the Gene by James D. Watson', "Lewin's Genes by Jocelyn E. Krebs"],
    },
    {
      code: 'B243',
      name: 'Cell Biology Laboratory',
      image: 'courseicons/b243.png',
      description: '',
      professors: ['Prof. Chandan Goswami', 'Dr. Kishore C.S. Panigrahi', 'Other'],
    },
    {
      code: 'B245',
      name: 'Molecular Biology Laboratory',
      image: 'courseicons/b245.png',
      description: '',
      professors: ['Dr. Pankaj Vidyadhar Alone', 'Dr. Tridib Mahata', 'Other'],
    },
  ],
  '5': [
    {
      code: 'B301',
      name: 'Animal Physiology',
      image: 'courseicons/b301.png',
      description: '',
      professors: ['Dr. Asima Bhattacharyya'],
      textbooks: ['Guyton and Hall Textbook of Medical Physiology', 'Principles of Animal Physiology by Christopher D. Moyes'],
    },
    {
      code: 'B302',
      name: 'Plant Physiology',
      image: 'courseicons/b302.png',
      description: '',
      professors: ['Dr. Kishore C.S. Panigrahi', 'Dr. K Himabindu Vasuki'],
      textbooks: ['Plant Physiology and Development by Lincoln Taiz'],
    },
    {
      code: 'B303',
      name: 'Ecology',
      image: 'courseicons/b303.png',
      description: '',
      professors: ['Dr. Aniruddha Datta Roy', 'Dr. Rittik Deb'],
      textbooks: ['Ecology: From Individuals to Ecosystems by Michael Begon', 'Elements of Ecology by Thomas M. Smith'],
    },
    {
      code: 'B341',
      name: 'Animal Physiology Laboratory',
      image: 'courseicons/b341.png',
      description: '',
      professors: ['Dr. Asima Bhattacharyya'],
    },
    {
      code: 'B342',
      name: 'Plant Physiology Laboratory',
      image: 'courseicons/b342.png',
      description: '',
      professors: ['Dr. Kishore C.S. Panigrahi', 'Dr. K Himabindu Vasuki'],
    },
  ],
  '6': [
    {
      code: 'B305',
      name: 'Immunology',
      image: 'courseicons/b305.png',
      description: '',
      professors: ['Dr. Subhasis Chattopadhyay'],
      textbooks: ['Kuby Immunology by Jenni Punt', "Janeway's Immunobiology by Kenneth Murphy"],
    },
    {
      code: 'B307',
      name: 'Genetics',
      image: 'courseicons/b307.png',
      description: '',
      professors: ['Dr. Majusha Dixit', 'Dr. Debasmita Pankaj Alone', 'Other'],
      textbooks: ['Principles of Genetics by D. Peter Snustad', 'Genetics: A Conceptual Approach by Benjamin A. Pierce'],
    },
    {
      code: 'B306',
      name: 'Evolutionary Biology',
      image: 'courseicons/b306.png',
      description: '',
      professors: ['Dr. Aniruddha Datta Roy', 'Dr. Rittik Deb'],
      textbooks: ['Evolution by Douglas J. Futuyma', 'Evolutionary Analysis by Jon C. Herron'],
    },
    {
      code: 'B344',
      name: 'Immunology Laboratory',
      image: 'courseicons/b344.png',
      description: '',
      professors: ['Dr. Subhasis Chattopadhyay'],
    },
    {
      code: 'B345',
      name: 'Genetics Laboratory',
      image: 'courseicons/b345.png',
      description: '',
      professors: ['Dr. Majusha Dixit', 'Dr. Debasmita Pankaj Alone', 'Other'],
    },
  ],
  '7': [
    {
      code: 'B402',
      name: 'Developmental Biology',
      image: 'courseicons/b402.png',
      description: '',
      professors: ['Dr. Swagata Ghatak', 'Other'],
      textbooks: ['Developmental Biology by Scott F. Gilbert'],
    },
    {
      code: 'B405',
      name: 'Bio-techniques',
      image: 'courseicons/b405.png',
      description: '',
      professors: ['Dr. Rudresh Acharya', 'Other'],
      textbooks: ['Principles and Techniques of Biochemistry and Molecular Biology by Keith Wilson'],
    },
    {
      code: 'B406',
      name: 'Introductory Biophysics',
      image: 'courseicons/b406.png',
      description: '',
      professors: ['Dr. Mohammed Saleem'],
      textbooks: ['Biophysics by Rodney Cotterill', 'Introductory Biophysics by J.R. Claycomb'],
    },
  ],
  '8': [
    {
      code: 'B403',
      name: 'Bio-informatics and Computational Biology',
      image: 'courseicons/b403.png',
      description: '',
      professors: ['Dr. V Badireenath Konkimalla', 'Dr. Mohammed Saleem'],
    },
    {
      code: 'B407',
      name: 'Quantitative and Systems Biology',
      image: 'courseicons/b407.png',
      description: '',
      professors: ['Prof. Palok Aich', 'Other'],
    },
  ],
  'ADVANCE COURSES': [
    {
      code: 'B451',
      name: 'Advanced Cell Biology',
      image: 'courseicons/b451.png',
      description: '',
      professors: ['Prof. Chandan Goswami'],
    },
    {
      code: 'B455',
      name: 'Enzymology',
      image: 'courseicons/b455.png',
      description: '',
      professors: ['Dr. Tirumala Kumar Chowdary'],
    },
    {
      code: 'B453',
      name: 'Advance Biochemistry',
      image: 'courseicons/b453.png',
      description: '',
      professors: ['Dr. Abdur Rehman'],
    },
    {
      code: 'B460',
      name: 'Virology',
      image: 'courseicons/b460.png',
      description: '',
      professors: ['Dr. Tirumala Kumar Chowdary'],
    },
    {
      code: 'B462',
      name: 'Endocrinology',
      image: 'courseicons/b462.png',
      description: '',
      professors: ['Dr. Praful Singru'],
    },
    {
      code: 'B463',
      name: 'Plant Developmental Biology',
      image: 'courseicons/b463.png',
      description: '',
      professors: ['Dr. Kishore C.S. Panigrahi', 'Dr. K Himabindu Vasuki', 'Other'],
    },
    {
      code: 'B464',
      name: 'Neurobiology',
      image: 'courseicons/b464.png',
      description: '',
      professors: ['Dr. Praful Singru'],
    },
    {
      code: 'B465',
      name: 'Structural Biology',
      image: 'courseicons/b465.png',
      description: '',
      professors: ['Dr. Rudresh Acharya'],
    },
    {
      code: 'B551',
      name: 'Advanced Molecular Biology',
      image: 'courseicons/b551.png',
      description: '',
      professors: ['Dr. Pankaj Vidyadhar Alone', 'Dr. Tridib Mahata'],
    },
    {
      code: 'B554',
      name: 'Cancer Biology',
      image: 'courseicons/b554.png',
      description: '',
      professors: ['Dr. Asima Bhattacharyya'],
    },
    {
      code: 'B555/B702',
      name: 'Molecular Genetics',
      image: 'courseicons/b555.png',
      description: '',
      professors: ['Dr. Pankaj Vidyadhar Alone', 'Dr. Tridib Mahata'],
    },
    {
      code: 'BIO700',
      name: 'Research Methodology and Research Publication Ethics',
      image: 'courseicons/b700.png',
      description: '',
      professors: ['NA'],
    },
  ],
};
