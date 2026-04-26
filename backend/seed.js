const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('./models/userModel');
const Note = require('./models/noteModel');

dotenv.config();

const uploadsDir = path.join(__dirname, 'uploads');

const samples = [
  {
    title: 'DBMS Unit 4 Normalization Master Notes',
    subject: 'Database Management Systems',
    subjectCode: 'CS501',
    semester: '5',
    branch: 'Computer Science',
    category: 'Lecture Notes',
    academicYear: '2025-26',
    tags: ['dbms', 'normalization', 'sql', 'unit-4'],
    upvotes: 92,
    downloads: 341,
    views: 820,
    fileName: 'seed-dbms-normalization.txt',
    content: 'DBMS normalization notes. 1NF, 2NF, 3NF, BCNF, functional dependencies, candidate keys, lossless decomposition, dependency preservation, solved examples.'
  },
  {
    title: 'Operating Systems Previous Year Questions 2025',
    subject: 'Operating Systems',
    subjectCode: 'CS502',
    semester: '5',
    branch: 'Computer Science',
    category: 'Question Paper',
    academicYear: '2024-25',
    tags: ['os', 'pyq', 'process', 'memory'],
    upvotes: 118,
    downloads: 512,
    views: 1090,
    fileName: 'seed-os-pyq-2025.txt',
    content: 'Operating Systems PYQ. Process scheduling, deadlock detection, bankers algorithm, paging, segmentation, virtual memory, file systems, semaphores.'
  },
  {
    title: 'Computer Networks Fast Revision Guide',
    subject: 'Computer Networks',
    subjectCode: 'CS503',
    semester: '5',
    branch: 'Computer Science',
    category: 'Study Guide',
    academicYear: '2025-26',
    tags: ['networks', 'osi', 'tcp', 'routing'],
    upvotes: 84,
    downloads: 275,
    views: 640,
    fileName: 'seed-cn-revision.txt',
    content: 'Computer Networks guide. OSI model, TCP/IP, subnetting, routing algorithms, congestion control, DNS, HTTP, VLAN, switching.'
  },
  {
    title: 'Data Structures Lab Manual With Viva Questions',
    subject: 'Data Structures',
    subjectCode: 'CS301',
    semester: '3',
    branch: 'Computer Science',
    category: 'Lab Manual',
    academicYear: '2025-26',
    tags: ['dsa', 'lab', 'viva', 'trees'],
    upvotes: 76,
    downloads: 198,
    views: 520,
    fileName: 'seed-dsa-lab.txt',
    content: 'Data Structures lab manual. Arrays, linked lists, stacks, queues, trees, graphs, hashing, sorting, viva questions and output formats.'
  },
  {
    title: 'Digital Electronics Gate Level Notes',
    subject: 'Digital Electronics',
    subjectCode: 'EC302',
    semester: '3',
    branch: 'Electronics',
    category: 'Lecture Notes',
    academicYear: '2025-26',
    tags: ['logic gates', 'kmap', 'flipflop'],
    upvotes: 63,
    downloads: 144,
    views: 410,
    fileName: 'seed-digital-electronics.txt',
    content: 'Digital Electronics notes. Boolean algebra, K-map simplification, multiplexers, flip-flops, counters, registers, timing diagrams.'
  },
  {
    title: 'Signals and Systems Important Problems',
    subject: 'Signals and Systems',
    subjectCode: 'EC401',
    semester: '4',
    branch: 'Electronics',
    category: 'Assignment',
    academicYear: '2024-25',
    tags: ['signals', 'fourier', 'laplace'],
    upvotes: 57,
    downloads: 126,
    views: 355,
    fileName: 'seed-signals-problems.txt',
    content: 'Signals and Systems problems. Fourier transform, Laplace transform, convolution, impulse response, LTI systems, sampling theorem.'
  },
  {
    title: 'Thermodynamics Formula Sheet',
    subject: 'Thermodynamics',
    subjectCode: 'ME305',
    semester: '3',
    branch: 'Mechanical',
    category: 'Study Guide',
    academicYear: '2025-26',
    tags: ['thermo', 'formula', 'cycles'],
    upvotes: 71,
    downloads: 232,
    views: 510,
    fileName: 'seed-thermo-formula.txt',
    content: 'Thermodynamics formula sheet. First law, second law, entropy, enthalpy, Carnot cycle, Otto cycle, Diesel cycle, steam tables.'
  },
  {
    title: 'Strength of Materials Previous Year Set',
    subject: 'Strength of Materials',
    subjectCode: 'ME402',
    semester: '4',
    branch: 'Mechanical',
    category: 'Question Paper',
    academicYear: '2024-25',
    tags: ['som', 'pyq', 'stress', 'strain'],
    upvotes: 49,
    downloads: 151,
    views: 380,
    fileName: 'seed-som-pyq.txt',
    content: 'Strength of Materials PYQ set. Stress strain, bending moment, shear force diagram, torsion, deflection of beams, Mohr circle.'
  },
  {
    title: 'Engineering Mathematics III Solved Notes',
    subject: 'Engineering Mathematics',
    subjectCode: 'MAT301',
    semester: '3',
    branch: 'Mathematics',
    category: 'Lecture Notes',
    academicYear: '2025-26',
    tags: ['maths', 'laplace', 'probability'],
    upvotes: 103,
    downloads: 427,
    views: 980,
    fileName: 'seed-maths-3.txt',
    content: 'Engineering Mathematics III. Laplace transforms, Fourier series, probability distributions, numerical methods, solved university examples.'
  },
  {
    title: 'MBA Marketing Management Case Notes',
    subject: 'Marketing Management',
    subjectCode: 'MBA201',
    semester: '2',
    branch: 'MBA',
    category: 'Study Guide',
    academicYear: '2025-26',
    tags: ['marketing', 'case study', 'segmentation'],
    upvotes: 44,
    downloads: 117,
    views: 290,
    fileName: 'seed-mba-marketing.txt',
    content: 'Marketing Management case notes. STP, brand positioning, consumer behaviour, marketing mix, pricing strategies, distribution channels.'
  },
  {
    title: 'Civil Engineering Surveying Field Book Guide',
    subject: 'Surveying',
    subjectCode: 'CV204',
    semester: '2',
    branch: 'Civil',
    category: 'Lab Manual',
    academicYear: '2025-26',
    tags: ['surveying', 'field book', 'civil'],
    upvotes: 39,
    downloads: 88,
    views: 244,
    fileName: 'seed-surveying-fieldbook.txt',
    content: 'Surveying field book guide. Chain survey, compass survey, leveling, contouring, total station basics, field notes format.'
  },
  {
    title: 'Electrical Machines Short Notes',
    subject: 'Electrical Machines',
    subjectCode: 'EE405',
    semester: '4',
    branch: 'Electrical',
    category: 'Lecture Notes',
    academicYear: '2025-26',
    tags: ['machines', 'transformer', 'dc motor'],
    upvotes: 58,
    downloads: 164,
    views: 402,
    fileName: 'seed-electrical-machines.txt',
    content: 'Electrical Machines notes. Transformers, DC machines, induction motors, synchronous machines, equivalent circuits, efficiency tests.'
  }
];

async function seed() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGO_URI missing');

  await mongoose.connect(uri);
  fs.mkdirSync(uploadsDir, { recursive: true });

  const password = await bcrypt.hash('demo123', 10);
  await User.updateOne(
    { email: 'demo@student.local' },
    {
      $set: {
        name: 'Demo Student',
        email: 'demo@student.local',
        password,
        college: 'OMSAI Institute of Technology',
        branch: 'Computer Science',
        semester: '5'
      }
    },
    { upsert: true }
  );

  const user = await User.findOne({ email: 'demo@student.local' });
  if (!user) throw new Error('Demo user missing after seed');

  let created = 0;
  for (const sample of samples) {
    const filePath = path.join(uploadsDir, sample.fileName);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, `${sample.title}\n\n${sample.content}\n\nSeeded for demo search and filters.`, 'utf8');
    }

    const exists = await Note.findOne({ title: sample.title, uploadedBy: user._id });
    if (!exists) created += 1;

    await Note.updateOne(
      { title: sample.title, uploadedBy: user._id },
      {
        $set: {
          ...sample,
          description: sample.content,
          fileUrl: `/uploads/${sample.fileName}`,
          originalName: sample.fileName,
          fileType: 'text/plain',
          fileSize: fs.statSync(filePath).size,
          uploadedBy: user._id
        }
      },
      { upsert: true }
    );
  }

  console.log(`Seed complete. ${created} new notes. Login demo@student.local / demo123`);
  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error(err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

