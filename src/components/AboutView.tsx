import React, { useRef, useState } from 'react';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Download,
  FileText,
  GraduationCap,
  Info,
  Mail,
  MapPin,
  Users,
  X,
} from 'lucide-react';

interface AboutViewProps {
  onGoHome: () => void;
}

type ProfileId = 'yashwanth' | 'praveen' | 'devendra';

interface TeamMemberSummary {
  id: ProfileId;
  name: string;
  shortRole: string;
  department: string;
  photoSrc?: string;
  initials: string;
}

const TEAM_MEMBERS: readonly TeamMemberSummary[] = [
  {
    id: 'yashwanth',
    name: 'Busi Reddy Yashwanth Reddy',
    shortRole: 'Technical Youth Trainer',
    department: 'Developer · Infosys Project',
    photoSrc: '/assets/extracted/developer_yashwanth.jpg',
    initials: 'BY',
  },
  {
    id: 'praveen',
    name: 'Praveen Kumar P',
    shortRole: 'Training Officer',
    department: 'Life Skills & Employability',
    photoSrc: '/assets/aistudio/Clean-Shaven_Corporate_Headshot_afefe89d.png',
    initials: 'PK',
  },
  {
    id: 'devendra',
    name: 'Mangali Devendra',
    shortRole: 'Technical Youth Trainer',
    department: 'Connect With Work',
    photoSrc: '/assets/aistudio/Warm_Professional_Portrait_84ce1413.png',
    initials: 'MD',
  },
];

const YASHWANTH_EXPERTISE = [
  {
    title: 'MERN Stack Development',
    description:
      'Full-stack web development with MongoDB, Express.js, React, and Node.js.',
  },
  {
    title: 'Python Programming',
    description: 'Core programming concepts and practical problem solving.',
  },
  {
    title: 'Data Analysis',
    description: 'Working with data to extract insights and support decisions.',
  },
  {
    title: 'AI / ML & AI Engineering',
    description:
      'Machine learning fundamentals and building AI-powered solutions.',
  },
  {
    title: 'AI Full Stack Development',
    description: 'End-to-end development of AI-integrated web applications.',
  },
  {
    title: 'Training & Mentoring',
    description:
      'Delivering practical online and in-person sessions for students and youth.',
  },
];

const YASHWANTH_EXPERIENCE = [
  {
    role: 'Technical Youth Trainer',
    period: 'Aug 2026 – Present',
    organization:
      'Magic Bus India Foundation · Infosys Project (Livelihood — Connect With Work)',
    highlights: [
      'Conducting technical training for youth in MERN Stack, Python, Data Analysis, AI/ML, and AI Engineering.',
      'Preparing learners with practical, industry-relevant skills to improve employability.',
    ],
  },
  {
    role: 'Remote Trainer — AI Full Stack Development',
    period: 'Past 2 Years',
    organization: 'Online Sessions for B.Tech Students',
    highlights: [
      'Delivered remote classes in AI Full Stack Development to B.Tech students.',
      'Guided learners through core concepts and hands-on practice using a project-based approach.',
    ],
  },
  {
    role: 'Peer Trainer (Juniors & Seniors)',
    period: 'From 2nd Year of B.Tech',
    organization: 'During B.Tech',
    highlights: [
      'Started training juniors and seniors in technical subjects while still a student.',
      'Achieved a cumulative reach of 300+ students across multiple technical domains.',
    ],
  },
];

const YASHWANTH_STATS = [
  { value: '300+', label: 'Students Trained' },
  { value: '2 Years', label: 'Remote Online Training' },
  { value: '5', label: 'Technical Domains' },
  { value: 'Since B.Tech', label: 'Training Journey (2nd Year)' },
];

const PRAVEEN_STATS = [
  { value: '20,000', label: 'Youth Trained (Ages 18–25)' },
  { value: '14 Years', label: 'Training Experience' },
  { value: 'Up to 80%', label: 'Placement Rate Improvement' },
  { value: '5 Languages', label: 'Multilingual Delivery' },
];

const PRAVEEN_EXPERTISE = [
  {
    title: 'Life Skills',
    description:
      'Building confidence, resilience, and a positive mindset for work and life.',
  },
  {
    title: 'Employability Skills',
    description:
      'Preparing young people aged 18 to 25 to transition smoothly into employment.',
  },
  {
    title: 'Communication Skills',
    description:
      'Practical workplace and interpersonal communication across five languages.',
  },
  {
    title: 'Problem-Solving Skills',
    description:
      'Activity-based learning that helps youth apply practical solutions in real contexts.',
  },
  {
    title: 'Youth Mentoring',
    description:
      'Guiding learners across classrooms, workshops, field sessions, and online formats.',
  },
];

const PRAVEEN_EXPERIENCE_HIGHLIGHTS = [
  'Serves as Training Officer at Magic Bus India Foundation.',
  'Brings 14 years of training experience to youth development in different organizations.',
  'Leads a three-district program, coordinating delivery across locations.',
  'Delivers training in classroom, workshop, field, and online settings.',
];

const PRAVEEN_CERTIFICATIONS = [
  'Science Graduate',
  'PG Diploma in Fire and Safety',
  'Internal Auditor for IMS (OHSAS, EMS and Quality)',
  "L1 Trainer, certified by Dr. Reddy's Foundation",
  'UK-certified in IGC',
];

const PRAVEEN_IMPACT = [
  'Trained 20,000 youth.',
  'Improved placement rates up to 80% for participants.',
  'Led a three-district program.',
];

const DEVENDRA_STATS = [
  { value: '43297', label: 'Employee ID' },
  { value: '15 Jun 2026', label: 'Date of Joining' },
  { value: 'Grade 3b', label: 'Junior Management' },
  { value: 'Livelihood', label: 'Business Unit' },
];

export const AboutView: React.FC<AboutViewProps> = ({ onGoHome }) => {
  const [selectedProfile, setSelectedProfile] = useState<ProfileId | null>(null);
  const [photoErrors, setPhotoErrors] = useState<Partial<Record<ProfileId, boolean>>>({});
  const [lightboxPhoto, setLightboxPhoto] = useState<{ src: string; name: string; role: string } | null>(null);
  const profileDetailRef = useRef<HTMLDivElement | null>(null);

  const handleSelectProfile = (id: ProfileId) => {
    setSelectedProfile((prev) => {
      const next = prev === id ? null : id;
      if (next) {
        window.requestAnimationFrame(() => {
          profileDetailRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        });
      }
      return next;
    });
  };

  const renderCircularAvatar = (member: TeamMemberSummary, isActive: boolean) => {
    const showImg = Boolean(member.photoSrc) && !photoErrors[member.id];
    return (
      <div
        className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden flex items-center justify-center transition-all duration-200 ${
          isActive
            ? 'ring-4 ring-[#FCD116] ring-offset-2 ring-offset-white shadow-[0_8px_24px_rgba(7,35,75,0.28)] scale-[1.03]'
            : 'ring-2 ring-[#CBD5E1] group-hover:ring-[#0B3C82] group-hover:shadow-[0_6px_18px_rgba(7,35,75,0.18)]'
        }`}
        style={
          !showImg
            ? {
                background: 'linear-gradient(135deg, #072754 0%, #0E3E82 100%)',
              }
            : undefined
        }
      >
        {showImg && member.photoSrc ? (
          <img
            src={member.photoSrc}
            alt={member.name}
            loading="eager"
            decoding="sync"
            referrerPolicy="no-referrer"
            onError={() =>
              setPhotoErrors((prev) => ({ ...prev, [member.id]: true }))
            }
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <span className="text-white text-[26px] sm:text-[30px] font-extrabold tracking-tight select-none">
            {member.initials}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-7">
      {/* Section 1: About Magic Bus India Foundation */}
      <section className="bg-white rounded-xl shadow-[0_3px_16px_rgba(8,37,82,0.08)] border border-[#E1E6EF] overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2.5"
          style={{
            background: 'linear-gradient(90deg, #072754 0%, #0C366F 100%)',
          }}
        >
          <Info className="w-5 h-5 text-white shrink-0" />
          <h2 className="text-white text-[18px] font-bold tracking-tight">
            About Magic Bus India Foundation
          </h2>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="max-w-3xl space-y-3">
            <h3 className="text-[22px] font-extrabold text-[#0A254E] tracking-tight">
              Childhood to Livelihood
            </h3>
            <p className="text-[15px] leading-relaxed text-[#334155]">
              Magic Bus India Foundation works with children and young people from
              underserved communities to equip them with life skills, employability
              readiness, and technical fluency so they complete secondary education
              and transition into dignified livelihoods.
            </p>
            <p className="text-[15px] leading-relaxed text-[#334155]">
              Under the{' '}
              <strong className="font-bold text-[#0A254E]">
                Magic Bus India Foundation &ndash; Infosys Project
              </strong>
              , trainers deliver the structured{' '}
              <strong className="font-bold text-[#0A254E]">
                12-Days AI &amp; Life &amp; Employability Skills
              </strong>{' '}
              curriculum across partner degree colleges and training centers. This
              platform streamlines multi-page A4 training reports, 12-day batch
              attendance sheets, and Cyber Security reports &amp; attendance rosters
              for fast submission and archiving.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-[#E6ECF5]">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[#0B336B]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <h4 className="text-[14.5px] font-bold text-[#0A254E]">
                  Standardized Institutional Format
                </h4>
              </div>
              <p className="text-[13.5px] text-[#475569] leading-relaxed">
                Preserves official Magic Bus branding, Infosys Project headers,
                fixed curriculum pages, and batch formatting automatically.
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[#0B336B]">
                <FileText className="w-4 h-4 shrink-0" />
                <h4 className="text-[14.5px] font-bold text-[#0A254E]">
                  Multi-Page Reports &amp; Attendance
                </h4>
              </div>
              <p className="text-[13.5px] text-[#475569] leading-relaxed">
                Combines cover sheets, daily photo logs, official letters, and
                Excel-ready 12-Days and Cyber Security attendance rosters.
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[#0B336B]">
                <Award className="w-4 h-4 shrink-0" />
                <h4 className="text-[14.5px] font-bold text-[#0A254E]">
                  Print-Ready PDF &amp; CSV Export
                </h4>
              </div>
              <p className="text-[13.5px] text-[#475569] leading-relaxed">
                Exports crisp multi-page A4 PDF documents and clean Excel-compatible
                CSV sheets ready for direct institutional submission.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Circular Profile Icons Showcase */}
      <section className="bg-white rounded-xl shadow-[0_3px_16px_rgba(8,37,82,0.08)] border border-[#E1E6EF] overflow-hidden">
        <div
          className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
          style={{
            background: 'linear-gradient(90deg, #072754 0%, #0C366F 100%)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-[#FCD116] shrink-0" />
            <h2 className="text-white text-[18px] font-bold tracking-tight">
              Team &amp; Trainer Profiles
            </h2>
          </div>
          <p className="text-[12.5px] text-[#D6E6FF] font-medium">
            Click any profile icon below to view full details
          </p>
        </div>

        <div className="p-6 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            {TEAM_MEMBERS.map((member) => {
              const isActive = selectedProfile === member.id;
              return (
                <button
                  key={member.id}
                  type="button"
                  aria-expanded={isActive}
                  onClick={() => handleSelectProfile(member.id)}
                  className={`group flex flex-col items-center text-center rounded-xl p-5 border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0B3C82] ${
                    isActive
                      ? 'bg-[#F4F8FF] border-[#0B3C82] shadow-[0_6px_18px_rgba(8,37,82,0.10)]'
                      : 'bg-[#FAFBFD] border-[#E2E8F0] hover:bg-white hover:border-[#BFD6F7] hover:shadow-[0_4px_14px_rgba(8,37,82,0.08)]'
                  }`}
                >
                  {renderCircularAvatar(member, isActive)}

                  <h3 className="mt-4 text-[15.5px] font-extrabold text-[#0A254E] leading-snug">
                    {member.name}
                  </h3>
                  <p className="mt-1 text-[13px] font-semibold text-[#0B3C82]">
                    {member.shortRole}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#64748B]">
                    {member.department}
                  </p>

                  <span
                    className={`mt-3 text-[12px] font-bold transition-colors ${
                      isActive
                        ? 'text-[#072754]'
                        : 'text-[#0B3C82] group-hover:underline'
                    }`}
                  >
                    {isActive ? 'Showing Profile' : 'View Profile →'}
                  </span>
                </button>
              );
            })}
          </div>

          {!selectedProfile && (
            <div className="mt-6 pt-5 border-t border-[#E6ECF5] flex flex-wrap items-center justify-between gap-4">
              <div className="text-[13px] text-[#64748B]">
                Developed for trainers of Magic Bus India Foundation &middot; Infosys
                Project
              </div>
              <button
                type="button"
                onClick={onGoHome}
                className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[42px] rounded-lg text-white text-[14px] font-bold hover:brightness-110 transition-all cursor-pointer whitespace-nowrap shrink-0"
                style={{
                  background: 'linear-gradient(180deg, #0D366E 0%, #07234B 100%)',
                }}
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>Back to Report Generator</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Section 3: Expanded Selected Profile Card */}
      <div ref={profileDetailRef}>
        {selectedProfile === 'yashwanth' && (
          <section className="bg-white rounded-xl shadow-[0_3px_16px_rgba(8,37,82,0.08)] border border-[#E1E6EF] overflow-hidden">
            {/* Executive Navy Profile Header */}
            <div
              className="relative px-6 sm:px-8 py-7 sm:py-8 text-white"
              style={{
                background:
                  'linear-gradient(100deg, #07224B 0%, #0C3166 60%, #103C79 100%)',
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedProfile(null)}
                aria-label="Close profile"
                className="absolute top-4 right-4 p-2 rounded-lg border border-white/25 text-white/90 hover:bg-white/15 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pr-8 sm:pr-10">
                <div className="w-[126px] sm:w-[144px] aspect-[3/4] rounded-lg overflow-hidden border-2 border-white/90 bg-[#0D2E5E] shrink-0 shadow-[0_6px_20px_rgba(0,0,0,0.28)]">
                  {!photoErrors.yashwanth ? (
                    <img
                      src="/assets/extracted/developer_yashwanth.jpg"
                      alt="Busi Reddy Yashwanth Reddy, Technical Youth Trainer at Magic Bus India Foundation"
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setPhotoErrors((prev) => ({ ...prev, yashwanth: true }))
                      }
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[#0B2D5C] text-white">
                      <span className="text-[28px] font-extrabold tracking-tight">
                        BY
                      </span>
                      <span className="text-[11px] text-[#CBD5E1] mt-1">
                        Trainer Profile
                      </span>
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-2.5">
                  <p className="text-[12px] font-semibold tracking-[0.06em] text-[#FCD116]">
                    Developer Profile &middot; Official Magic Bus Trainer Record
                  </p>

                  <div>
                    <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight leading-tight text-white">
                      Busi Reddy Yashwanth Reddy
                    </h2>
                    <p className="text-[15px] sm:text-[16.5px] font-semibold text-[#E2ECF8] mt-1">
                      Technical Youth Trainer &mdash; Magic Bus India Foundation
                      (Infosys Project)
                    </p>
                  </div>

                  <p className="text-[13.5px] text-[#C5D8F2] leading-relaxed">
                    AI Full Stack Development &middot; MERN Stack &middot; Python
                    &middot; Data Analysis &middot; AI/ML
                  </p>

                  <div className="pt-2 border-t border-white/15 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px] text-[#E8F0FA]">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#FCD116] shrink-0" />
                      <span>Tirupati, Andhra Pradesh, India</span>
                    </span>
                    <span className="text-white/35 hidden sm:inline" aria-hidden="true">
                      |
                    </span>
                    <span>Livelihood &ndash; Connect With Work</span>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <a
                      href="mailto:busi.reddy@magicbusindia.org"
                      className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg bg-white text-[#072754] text-[13.5px] font-bold hover:bg-[#F1F5FA] transition-colors whitespace-nowrap shrink-0"
                    >
                      <Mail className="w-4 h-4 shrink-0" />
                      <span>busi.reddy@magicbusindia.org</span>
                    </a>

                    <a
                      href="https://www.linkedin.com/in/busi-reddy-yashwanth-reddy/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg bg-[#FCD116] text-[#07224B] text-[13.5px] font-bold hover:brightness-105 transition-all whitespace-nowrap shrink-0"
                    >
                      <svg
                        className="w-4 h-4 fill-current shrink-0"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M6.94 8.5H3.56V19.5H6.94V8.5ZM5.25 3.5C4.14 3.5 3.25 4.39 3.25 5.5C3.25 6.6 4.14 7.5 5.25 7.5C6.35 7.5 7.25 6.6 7.25 5.5C7.25 4.39 6.35 3.5 5.25 3.5ZM20.44 13.02C20.44 9.88 18.76 8.22 16.16 8.22C14.37 8.22 13.48 9.21 13.02 9.93V8.5H9.65C9.7 9.48 9.65 19.5 9.65 19.5H13.02V13.36C13.02 13.02 13.05 12.69 13.15 12.45C13.42 11.78 14.03 11.09 15.07 11.09C16.41 11.09 17.06 12.11 17.06 13.6V19.5H20.44V13.02Z" />
                      </svg>
                      <span>LinkedIn Profile</span>
                    </a>

                    <a
                      href="/assets/aistudio/Yashwanth_Reddy_Trainer_Profile_1fdb648d.pdf"
                      download="Busi_Reddy_Yashwanth_Reddy_Trainer_Profile.pdf"
                      className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg border border-white/30 text-white text-[13.5px] font-semibold hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Download className="w-4 h-4 shrink-0" />
                      <span>Download Profile PDF</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* 4-Column Quantitative Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 border-b border-[#E3E8F0] bg-[#F8FAFD]">
              {YASHWANTH_STATS.map((stat, idx) => (
                <div
                  key={stat.label}
                  className={`px-5 py-4 text-center ${
                    idx > 0 ? 'border-l border-[#E3E8F0]' : ''
                  } ${idx >= 2 ? 'border-t md:border-t-0 border-[#E3E8F0]' : ''}`}
                >
                  <div className="text-[20px] sm:text-[22px] font-extrabold text-[#0A254E] tabular-nums leading-tight">
                    {stat.value}
                  </div>
                  <div className="text-[12.5px] font-medium text-[#475569] mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 sm:p-8 space-y-8">
              <div className="space-y-2.5">
                <h3 className="text-[15px] font-extrabold text-[#0A254E] tracking-tight pb-2 border-b border-[#D7E0EE]">
                  Professional Summary
                </h3>
                <p className="text-[14.5px] leading-relaxed text-[#334155] max-w-4xl">
                  Dedicated and passionate technical trainer who began training peers,
                  juniors, and seniors during the 2nd year of B.Tech and has since
                  grown into a full-time{' '}
                  <strong className="font-bold text-[#0A254E]">
                    Technical Youth Trainer at Magic Bus India Foundation
                  </strong>{' '}
                  for the{' '}
                  <strong className="font-bold text-[#0A254E]">
                    Infosys Project
                  </strong>
                  . Hands-on experience in delivering practical, project-oriented
                  training in{' '}
                  <strong className="font-semibold text-[#0A254E]">
                    MERN Stack Development, Python Programming, Data Analysis, AI/ML,
                    and AI Engineering
                  </strong>
                  . Has trained{' '}
                  <strong className="font-semibold text-[#0A254E]">300+ students</strong>{' '}
                  across multiple domains, including two years of remote classes in AI
                  Full Stack Development for B.Tech students, committed to building
                  job-ready skills among youth.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-[15px] font-extrabold text-[#0A254E] tracking-tight pb-2 border-b border-[#D7E0EE]">
                  Current Role
                </h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                  <div>
                    <dt className="text-[12px] font-semibold text-[#64748B]">
                      Designation
                    </dt>
                    <dd className="text-[14.5px] font-bold text-[#0A254E] mt-0.5">
                      Technical Youth Trainer
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold text-[#64748B]">
                      Organisation
                    </dt>
                    <dd className="text-[14.5px] font-bold text-[#0A254E] mt-0.5">
                      Magic Bus India Foundation
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold text-[#64748B]">
                      Project &amp; Department
                    </dt>
                    <dd className="text-[14.5px] font-bold text-[#0A254E] mt-0.5">
                      Infosys Project &middot; Livelihood Operations (Connect With Work)
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold text-[#64748B]">
                      Date of Joining
                    </dt>
                    <dd className="text-[14.5px] font-semibold text-[#1E293B] mt-0.5 tabular-nums">
                      26 August 2026
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold text-[#64748B]">
                      Division
                    </dt>
                    <dd className="text-[14.5px] font-semibold text-[#1E293B] mt-0.5">
                      Livelihood
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold text-[#64748B]">
                      Location
                    </dt>
                    <dd className="text-[14.5px] font-semibold text-[#1E293B] mt-0.5">
                      Tirupati, Andhra Pradesh, India
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="space-y-3">
                <h3 className="text-[15px] font-extrabold text-[#0A254E] tracking-tight pb-2 border-b border-[#D7E0EE]">
                  Areas of Expertise
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
                  {YASHWANTH_EXPERTISE.map((item) => (
                    <div
                      key={item.title}
                      className="pb-3 border-b border-[#EEF2F7] last:border-b-0 md:[&:nth-last-child(-n+2)]:border-b-0"
                    >
                      <h4 className="text-[14.5px] font-bold text-[#0A254E]">
                        {item.title}
                      </h4>
                      <p className="text-[13.5px] text-[#475569] mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[15px] font-extrabold text-[#0A254E] tracking-tight pb-2 border-b border-[#D7E0EE]">
                  Training Experience
                </h3>
                <div className="divide-y divide-[#EEF2F7]">
                  {YASHWANTH_EXPERIENCE.map((exp) => (
                    <div key={exp.role} className="py-4 first:pt-1 last:pb-0">
                      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                        <h4 className="text-[15px] font-bold text-[#0A254E]">
                          {exp.role}
                        </h4>
                        <span className="text-[13px] font-semibold text-[#475569] tabular-nums whitespace-nowrap shrink-0">
                          {exp.period}
                        </span>
                      </div>
                      <p className="text-[13.5px] italic text-[#475569] mt-0.5">
                        {exp.organization}
                      </p>
                      <ul className="mt-2 space-y-1 text-[13.5px] text-[#334155] list-disc pl-5 leading-relaxed">
                        {exp.highlights.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[#E6ECF5] flex flex-wrap items-center justify-between gap-4">
                <div className="text-[13px] text-[#64748B]">
                  Developed for trainers of Magic Bus India Foundation &middot; Infosys
                  Project
                </div>
                <button
                  type="button"
                  onClick={onGoHome}
                  className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[42px] rounded-lg text-white text-[14px] font-bold hover:brightness-110 transition-all cursor-pointer whitespace-nowrap shrink-0"
                  style={{
                    background: 'linear-gradient(180deg, #0D366E 0%, #07234B 100%)',
                  }}
                >
                  <ArrowLeft className="w-4 h-4 shrink-0" />
                  <span>Back to Report Generator</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {selectedProfile === 'praveen' && (
          <section className="bg-white rounded-xl shadow-[0_3px_16px_rgba(8,37,82,0.08)] border border-[#E1E6EF] overflow-hidden">
            {/* Executive Navy Profile Header */}
            <div
              className="relative px-6 sm:px-8 py-7 sm:py-8 text-white"
              style={{
                background:
                  'linear-gradient(100deg, #07224B 0%, #0C3166 60%, #103C79 100%)',
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedProfile(null)}
                aria-label="Close profile"
                className="absolute top-4 right-4 p-2 rounded-lg border border-white/25 text-white/90 hover:bg-white/15 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pr-8 sm:pr-10">
                <button
                  type="button"
                  onClick={() =>
                    !photoErrors.praveen &&
                    setLightboxPhoto({
                      src: '/assets/aistudio/Clean-Shaven_Corporate_Headshot_afefe89d.png',
                      name: 'Praveen Kumar P',
                      role: 'Training Officer · Magic Bus India Foundation',
                    })
                  }
                  title="Click to view full high-resolution portrait"
                  className="w-[136px] sm:w-[164px] aspect-[3/4] rounded-lg overflow-hidden border-2 border-white/95 bg-white shrink-0 shadow-[0_8px_24px_rgba(0,0,0,0.3)] cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-[#FCD116] transition-transform hover:scale-[1.02]"
                >
                  {!photoErrors.praveen ? (
                    <img
                      src="/assets/aistudio/Clean-Shaven_Corporate_Headshot_afefe89d.png"
                      alt="Praveen Kumar P, Training Officer at Magic Bus India Foundation"
                      loading="eager"
                      decoding="sync"
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setPhotoErrors((prev) => ({ ...prev, praveen: true }))
                      }
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[#0B2D5C] text-white">
                      <span className="text-[36px] font-extrabold tracking-tight text-[#FCD116]">
                        PK
                      </span>
                      <span className="text-[11px] font-semibold text-[#D6E6FF] mt-1">
                        Training Officer
                      </span>
                    </div>
                  )}
                </button>

                <div className="min-w-0 flex-1 space-y-2.5">
                  <p className="text-[12px] font-semibold tracking-[0.06em] text-[#FCD116]">
                    Training Officer &middot; Magic Bus India Foundation
                  </p>

                  <div>
                    <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight leading-tight text-white">
                      Praveen Kumar P
                    </h2>
                    <p className="text-[15px] sm:text-[16.5px] font-semibold text-[#E2ECF8] mt-1">
                      Training Officer &mdash; Magic Bus India Foundation
                    </p>
                  </div>

                  <p className="text-[13.5px] text-[#C5D8F2] leading-relaxed">
                    Life Skills &middot; Employability Skills &middot; Communication
                    &middot; Problem-Solving &middot; Youth Mentoring
                  </p>

                  <div className="pt-2 border-t border-white/15 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px] text-[#E8F0FA]">
                    <span>Three-District Program Lead</span>
                    <span className="text-white/35 hidden sm:inline" aria-hidden="true">
                      |
                    </span>
                    <span>English, Telugu, Hindi, Tamil &amp; Kannada</span>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <a
                      href="/assets/aistudio/Profile_of_Praveen_c71389c4.pdf"
                      download="Praveen_Kumar_P_Profile.pdf"
                      className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg bg-[#FCD116] text-[#07224B] text-[13.5px] font-bold hover:brightness-105 transition-all whitespace-nowrap shrink-0"
                    >
                      <Download className="w-4 h-4 shrink-0" />
                      <span>Download Profile PDF</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* 4-Column Quantitative Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 border-b border-[#E3E8F0] bg-[#F8FAFD]">
              {PRAVEEN_STATS.map((stat, idx) => (
                <div
                  key={stat.label}
                  className={`px-5 py-4 text-center ${
                    idx > 0 ? 'border-l border-[#E3E8F0]' : ''
                  } ${idx >= 2 ? 'border-t md:border-t-0 border-[#E3E8F0]' : ''}`}
                >
                  <div className="text-[20px] sm:text-[22px] font-extrabold text-[#0A254E] tabular-nums leading-tight">
                    {stat.value}
                  </div>
                  <div className="text-[12.5px] font-medium text-[#475569] mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 sm:p-8 space-y-8">
              <div className="space-y-2.5">
                <h3 className="text-[15px] font-extrabold text-[#0A254E] tracking-tight pb-2 border-b border-[#D7E0EE]">
                  Professional Summary
                </h3>
                <p className="text-[14.5px] leading-relaxed text-[#334155] max-w-4xl">
                  <strong className="font-bold text-[#0A254E]">Praveen Kumar P</strong>{' '}
                  is a{' '}
                  <strong className="font-bold text-[#0A254E]">
                    Training Officer at Magic Bus India Foundation
                  </strong>{' '}
                  with <strong className="font-semibold text-[#0A254E]">14 years</strong>{' '}
                  of experience preparing young people for work and life. He has trained{' '}
                  <strong className="font-semibold text-[#0A254E]">20,000 youth</strong>{' '}
                  aged 18 to 25 in life skills, employability skills, and communication.
                  Praveen combines classroom teaching, activity-based learning, and field
                  sessions to build confidence, practical skills, and a positive mindset.
                  He has led a three-district programme and helped improve placement
                  outcomes for the youth he trains. He delivers sessions in five
                  languages.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-[15px] font-extrabold text-[#0A254E] tracking-tight pb-2 border-b border-[#D7E0EE]">
                  Current Role &amp; Delivery Reach
                </h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                  <div>
                    <dt className="text-[12px] font-semibold text-[#64748B]">
                      Designation
                    </dt>
                    <dd className="text-[14.5px] font-bold text-[#0A254E] mt-0.5">
                      Training Officer
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold text-[#64748B]">
                      Organisation
                    </dt>
                    <dd className="text-[14.5px] font-bold text-[#0A254E] mt-0.5">
                      Magic Bus India Foundation
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold text-[#64748B]">
                      Core Focus
                    </dt>
                    <dd className="text-[14.5px] font-bold text-[#0A254E] mt-0.5">
                      Life Skills, Employability &amp; Youth Mentoring
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold text-[#64748B]">
                      Experience
                    </dt>
                    <dd className="text-[14.5px] font-semibold text-[#1E293B] mt-0.5">
                      14 Years in Youth Development
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold text-[#64748B]">
                      Program Scope
                    </dt>
                    <dd className="text-[14.5px] font-semibold text-[#1E293B] mt-0.5">
                      Three-District Program Lead
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold text-[#64748B]">
                      Languages
                    </dt>
                    <dd className="text-[14.5px] font-semibold text-[#1E293B] mt-0.5">
                      English, Telugu, Hindi, Tamil, Kannada
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="space-y-3">
                <h3 className="text-[15px] font-extrabold text-[#0A254E] tracking-tight pb-2 border-b border-[#D7E0EE]">
                  Core Expertise
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
                  {PRAVEEN_EXPERTISE.map((item) => (
                    <div
                      key={item.title}
                      className="pb-3 border-b border-[#EEF2F7] last:border-b-0"
                    >
                      <h4 className="text-[14.5px] font-bold text-[#0A254E]">
                        {item.title}
                      </h4>
                      <p className="text-[13.5px] text-[#475569] mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                <h3 className="text-[15px] font-extrabold text-[#0A254E] tracking-tight pb-2 border-b border-[#D7E0EE]">
                  Training Approach
                </h3>
                <p className="text-[14.5px] leading-relaxed text-[#334155] max-w-4xl">
                  Praveen believes a trainer can change how young people think about
                  themselves and their future. He builds each session around
                  participation, so learners practise skills instead of only hearing
                  about them. He adapts his delivery to the audience, using classroom
                  sessions, activity-based learning, workshops, field sessions, and
                  online training. He trains in English, Telugu, Hindi, Tamil, and
                  Kannada, which lets him reach learners in the language they understand
                  best.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <h3 className="text-[15px] font-extrabold text-[#0A254E] tracking-tight pb-2 border-b border-[#D7E0EE]">
                    Experience Highlights
                  </h3>
                  <ul className="space-y-2 text-[13.5px] text-[#334155] list-disc pl-5 leading-relaxed">
                    {PRAVEEN_EXPERIENCE_HIGHLIGHTS.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[15px] font-extrabold text-[#0A254E] tracking-tight pb-2 border-b border-[#D7E0EE] flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[#0B3C82]" />
                    <span>Education &amp; Certifications</span>
                  </h3>
                  <ul className="space-y-2 text-[13.5px] text-[#334155] list-disc pl-5 leading-relaxed">
                    {PRAVEEN_CERTIFICATIONS.map((cert) => (
                      <li key={cert}>{cert}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-[15px] font-extrabold text-[#0A254E] tracking-tight pb-2 border-b border-[#D7E0EE]">
                  Impact &amp; Achievements
                </h3>
                <ul className="space-y-1.5 text-[14px] text-[#334155] list-disc pl-5 leading-relaxed">
                  {PRAVEEN_IMPACT.map((point) => (
                    <li key={point} className="font-semibold text-[#0A254E]">
                      {point}
                    </li>
                  ))}
                </ul>
                <p className="pt-2 text-[14px] italic text-[#475569] leading-relaxed max-w-4xl">
                  &ldquo;Praveen helps young people gain the skills, confidence and
                  mindset they need to move into work. Organizations gain a dependable
                  trainer who delivers practical results at scale.&rdquo;
                </p>
              </div>

              <div className="pt-4 border-t border-[#E6ECF5] flex flex-wrap items-center justify-between gap-4">
                <div className="text-[13px] text-[#64748B]">
                  Magic Bus India Foundation &middot; Training Officer Profile
                </div>
                <button
                  type="button"
                  onClick={onGoHome}
                  className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[42px] rounded-lg text-white text-[14px] font-bold hover:brightness-110 transition-all cursor-pointer whitespace-nowrap shrink-0"
                  style={{
                    background: 'linear-gradient(180deg, #0D366E 0%, #07234B 100%)',
                  }}
                >
                  <ArrowLeft className="w-4 h-4 shrink-0" />
                  <span>Back to Report Generator</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {selectedProfile === 'devendra' && (
          <section className="bg-white rounded-xl shadow-[0_3px_16px_rgba(8,37,82,0.08)] border border-[#E1E6EF] overflow-hidden">
            {/* Executive Navy Profile Header */}
            <div
              className="relative px-6 sm:px-8 py-7 sm:py-8 text-white"
              style={{
                background:
                  'linear-gradient(100deg, #07224B 0%, #0C3166 60%, #103C79 100%)',
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedProfile(null)}
                aria-label="Close profile"
                className="absolute top-4 right-4 p-2 rounded-lg border border-white/25 text-white/90 hover:bg-white/15 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pr-8 sm:pr-10">
                <button
                  type="button"
                  onClick={() =>
                    !photoErrors.devendra &&
                    setLightboxPhoto({
                      src: '/assets/aistudio/Warm_Professional_Portrait_84ce1413.png',
                      name: 'Mangali Devendra',
                      role: 'Technical Youth Trainer · Magic Bus India Foundation',
                    })
                  }
                  title="Click to view full high-resolution portrait"
                  className="w-[136px] sm:w-[164px] aspect-[3/4] rounded-lg overflow-hidden border-2 border-white/95 bg-white shrink-0 shadow-[0_8px_24px_rgba(0,0,0,0.3)] cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-[#FCD116] transition-transform hover:scale-[1.02]"
                >
                  {!photoErrors.devendra ? (
                    <img
                      src="/assets/aistudio/Warm_Professional_Portrait_84ce1413.png"
                      alt="Mangali Devendra, Technical Youth Trainer at Magic Bus India Foundation"
                      loading="eager"
                      decoding="sync"
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setPhotoErrors((prev) => ({ ...prev, devendra: true }))
                      }
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[#0B2D5C] text-white">
                      <span className="text-[28px] font-extrabold tracking-tight">
                        MD
                      </span>
                      <span className="text-[11px] text-[#CBD5E1] mt-1">
                        Trainer Profile
                      </span>
                    </div>
                  )}
                </button>

                <div className="min-w-0 flex-1 space-y-2.5">
                  <p className="text-[12px] font-semibold tracking-[0.06em] text-[#FCD116]">
                    Official Magic Bus Trainer Record &middot; Connect With Work
                  </p>

                  <div>
                    <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight leading-tight text-white">
                      Mangali Devendra
                    </h2>
                    <p className="text-[15px] sm:text-[16.5px] font-semibold text-[#E2ECF8] mt-1">
                      Technical Youth Trainer &mdash; Magic Bus India Foundation
                      (Connect With Work)
                    </p>
                  </div>

                  <p className="text-[13.5px] text-[#C5D8F2] leading-relaxed">
                    Livelihood Operations (MB_LIV_OPS) &middot; Connect With Work
                    (MB_LH_OPS_CWW)
                  </p>

                  <div className="pt-2 border-t border-white/15 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px] text-[#E8F0FA]">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#FCD116] shrink-0" />
                      <span>Tirupati, Andhra Pradesh, India</span>
                    </span>
                    <span className="text-white/35 hidden sm:inline" aria-hidden="true">
                      |
                    </span>
                    <span>Division: Livelihood (MB_DIV_LIV)</span>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <a
                      href="mailto:mangali.devendra@magicbusindia.org"
                      className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg bg-white text-[#072754] text-[13.5px] font-bold hover:bg-[#F1F5FA] transition-colors whitespace-nowrap shrink-0"
                    >
                      <Mail className="w-4 h-4 shrink-0" />
                      <span>mangali.devendra@magicbusindia.org</span>
                    </a>

                    <a
                      href="/assets/aistudio/Mangali_Devendra_Profile_Download_94b8b288.pdf"
                      download="Mangali_Devendra_Trainer_Profile.pdf"
                      className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg bg-[#FCD116] text-[#07224B] text-[13.5px] font-bold hover:brightness-105 transition-all whitespace-nowrap shrink-0"
                    >
                      <Download className="w-4 h-4 shrink-0" />
                      <span>Download Profile PDF</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* 4-Column Quantitative Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 border-b border-[#E3E8F0] bg-[#F8FAFD]">
              {DEVENDRA_STATS.map((stat, idx) => (
                <div
                  key={stat.label}
                  className={`px-5 py-4 text-center ${
                    idx > 0 ? 'border-l border-[#E3E8F0]' : ''
                  } ${idx >= 2 ? 'border-t md:border-t-0 border-[#E3E8F0]' : ''}`}
                >
                  <div className="text-[20px] sm:text-[22px] font-extrabold text-[#0A254E] tabular-nums leading-tight">
                    {stat.value}
                  </div>
                  <div className="text-[12.5px] font-medium text-[#475569] mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 sm:p-8 space-y-8">
              <div className="space-y-2.5">
                <h3 className="text-[15px] font-extrabold text-[#0A254E] tracking-tight pb-2 border-b border-[#D7E0EE]">
                  Overview
                </h3>
                <p className="text-[14.5px] leading-relaxed text-[#334155] max-w-4xl">
                  <strong className="font-bold text-[#0A254E]">Mangali Devendra</strong>{' '}
                  serves as a{' '}
                  <strong className="font-bold text-[#0A254E]">
                    Technical Youth Trainer
                  </strong>{' '}
                  with{' '}
                  <strong className="font-bold text-[#0A254E]">
                    Magic Bus India Foundation
                  </strong>{' '}
                  under the <strong className="font-semibold text-[#0A254E]">Livelihood</strong>{' '}
                  business unit and{' '}
                  <strong className="font-semibold text-[#0A254E]">
                    Connect With Work (MB_LH_OPS_CWW)
                  </strong>{' '}
                  department in Tirupati, Andhra Pradesh, India.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-[15px] font-extrabold text-[#0A254E] tracking-tight pb-2 border-b border-[#D7E0EE]">
                  Official Profile Summary
                </h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                  <div>
                    <dt className="text-[12px] font-semibold text-[#64748B]">
                      Employee ID
                    </dt>
                    <dd className="text-[14.5px] font-bold text-[#0A254E] mt-0.5 tabular-nums">
                      43297
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold text-[#64748B]">
                      Designation
                    </dt>
                    <dd className="text-[14.5px] font-bold text-[#0A254E] mt-0.5">
                      Technical Youth Trainer
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold text-[#64748B]">
                      Company
                    </dt>
                    <dd className="text-[14.5px] font-bold text-[#0A254E] mt-0.5">
                      Magic Bus India Foundation
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold text-[#64748B]">
                      Email ID
                    </dt>
                    <dd className="text-[14px] font-semibold text-[#1E293B] mt-0.5 break-all">
                      mangali.devendra@magicbusindia.org
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold text-[#64748B]">
                      Current Office Location
                    </dt>
                    <dd className="text-[14.5px] font-semibold text-[#1E293B] mt-0.5">
                      Tirupati, Andhra Pradesh, India
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold text-[#64748B]">
                      Date of Joining
                    </dt>
                    <dd className="text-[14.5px] font-semibold text-[#1E293B] mt-0.5 tabular-nums">
                      15/06/2026
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold text-[#64748B]">
                      Division
                    </dt>
                    <dd className="text-[14.5px] font-semibold text-[#1E293B] mt-0.5">
                      Livelihood (MB_DIV_LIV)
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold text-[#64748B]">
                      Business Unit
                    </dt>
                    <dd className="text-[14.5px] font-semibold text-[#1E293B] mt-0.5">
                      Livelihood
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold text-[#64748B]">
                      Department Level 1
                    </dt>
                    <dd className="text-[14.5px] font-semibold text-[#1E293B] mt-0.5">
                      Livelihood Operations (MB_LIV_OPS)
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold text-[#64748B]">
                      Department Level 2
                    </dt>
                    <dd className="text-[14.5px] font-semibold text-[#1E293B] mt-0.5">
                      Connect With Work (MB_LH_OPS_CWW)
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold text-[#64748B]">
                      Band &amp; Grade
                    </dt>
                    <dd className="text-[14.5px] font-semibold text-[#1E293B] mt-0.5">
                      Junior Management &middot; Grade 3b
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold text-[#64748B]">
                      Employee Type &amp; Blood Group
                    </dt>
                    <dd className="text-[14.5px] font-semibold text-[#1E293B] mt-0.5">
                      Employee (Probation) &middot; Blood Group: O+
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="pt-4 border-t border-[#E6ECF5] flex flex-wrap items-center justify-between gap-4">
                <div className="text-[13px] text-[#64748B]">
                  Magic Bus India Foundation &middot; Official Trainer Profile
                </div>
                <button
                  type="button"
                  onClick={onGoHome}
                  className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[42px] rounded-lg text-white text-[14px] font-bold hover:brightness-110 transition-all cursor-pointer whitespace-nowrap shrink-0"
                  style={{
                    background: 'linear-gradient(180deg, #0D366E 0%, #07234B 100%)',
                  }}
                >
                  <ArrowLeft className="w-4 h-4 shrink-0" />
                  <span>Back to Report Generator</span>
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* High-Resolution Portrait Preview Lightbox */}
      {lightboxPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${lightboxPhoto.name} portrait`}
          onClick={() => setLightboxPhoto(null)}
          className="fixed inset-0 z-50 bg-[#041835]/80 backdrop-blur-[2px] flex items-center justify-center p-4 sm:p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-[440px] w-full bg-white rounded-xl overflow-hidden shadow-[0_24px_60px_rgba(4,24,53,0.45)] border border-white/20"
          >
            <button
              type="button"
              onClick={() => setLightboxPhoto(null)}
              aria-label="Close portrait preview"
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-[#07224B]/85 text-white hover:bg-[#07224B] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="bg-[#F8FAFD]">
              <img
                src={lightboxPhoto.src}
                alt={lightboxPhoto.name}
                loading="eager"
                decoding="sync"
                referrerPolicy="no-referrer"
                className="w-full max-h-[75vh] object-contain"
              />
            </div>
            <div
              className="px-5 py-3.5 text-white"
              style={{
                background: 'linear-gradient(90deg, #072754 0%, #0C366F 100%)',
              }}
            >
              <p className="text-[15px] font-extrabold leading-tight">
                {lightboxPhoto.name}
              </p>
              <p className="text-[12.5px] text-[#D6E6FF] mt-0.5">
                {lightboxPhoto.role}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
