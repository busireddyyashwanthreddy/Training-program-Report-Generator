import React from 'react';
import { ComputedConclusionPreview, DayPhotosMap } from '../types/report';
import { A4_PAGE_HEIGHT, A4_PAGE_WIDTH } from '../utils/exportPdf';

const DOCUMENT_FONT_FAMILY = "'Source Sans 3', 'Segoe UI', Arial, sans-serif";

const PAGE_BASE_STYLE: React.CSSProperties = {
  position: 'relative',
  width: `${A4_PAGE_WIDTH}px`,
  height: `${A4_PAGE_HEIGHT}px`,
  minHeight: `${A4_PAGE_HEIGHT}px`,
  backgroundColor: '#FFFFFF',
  overflow: 'hidden',
  boxSizing: 'border-box',
  fontFamily: DOCUMENT_FONT_FAMILY,
  color: '#111827',
};

const WEEK_1_TOPICS = [
  {
    day: 'Day 1: Fundamentals of AI',
    desc: 'Definition, types, future importance, industry impacts, essential technical skills, student empowerment, and new job opportunities.',
  },
  {
    day: 'Day 2: Concepts of AI',
    desc: 'Detailed explanations of Machine Learning (ML), Deep Learning (DL), Natural Language Processing (NLP), and Large Language Models (LLMs).',
  },
  {
    day: 'Day 3: Generative AI',
    desc: 'Introduction to Gen AI tools, Perplexity, inner workings of generative systems, smart searching, and basic prompt engineering.',
  },
  {
    day: 'Day 4: ChatGPT Deep Dive',
    desc: 'Introduction to ChatGPT, understanding its capabilities, and exploring real-world use cases.',
  },
  {
    day: 'Day 5: Prompt Practice',
    desc: 'In-class interactive workshop focused entirely on mastering prompt engineering.',
  },
  {
    day: 'Day 6: Excel Analysis Using ChatGPT',
    desc: 'In-class practical session on leveraging ChatGPT for data analysis in Microsoft Excel.',
  },
];

const WEEK_2_TOPICS = [
  {
    day: 'Day 7: Presentations',
    desc: 'Creating and refining presentations using ChatGPT workflows.',
  },
  {
    day: 'Day 8: Personal Readiness',
    desc: 'Understanding digital identity, evaluating control over our digital lives, and exploring the importance of digital agency.',
  },
  {
    day: 'Day 9: Professional Readiness',
    desc: 'Working smarter with AI, building optimized resumes, preparing for job interviews, and automation for everyday work.',
  },
  {
    day: 'Day 10: Future Readiness',
    desc: 'Exploring "Tech For Good" frameworks, its applications, and real-world Indian case studies.',
  },
  {
    day: 'Day 11: Chatbots',
    desc: 'Conceptual explanation of chatbots followed by a practical session on building your own chatbot.',
  },
  {
    day: 'Day 12: Closing Session',
    desc: 'Student project showcases, final evaluations, and a comprehensive course summary.',
  },
];

const EMPLOYABILITY_SKILLS = [
  {
    category: '1. Self & Mindset',
    skills: 'Self-awareness, Growth Mindset, Adaptability & Flexibility, Stress Management',
  },
  {
    category: '2. Communication',
    skills: 'Communication, Language Proficiency, Listening, Workplace Vocabulary',
  },
  {
    category: '3. Thinking Skills',
    skills:
      'Problem-Solving, Logical Reasoning, Numerical Reasoning, Decision Making, Critical Thinking',
  },
  {
    category: '4. Interpersonal Skills',
    skills: 'Interpersonal Skills, Networking, Negotiation, Team/Group Interaction',
  },
  {
    category: '5. Workplace Effectiveness',
    skills:
      'Time Management, Professional Behaviour, Workplace Protocols, Workplace Rights',
  },
  {
    category: '6. Career Readiness',
    skills: 'Career Awareness, Sector Awareness, Interview Preparation, Mock Interviews',
  },
  {
    category: '7. Professional Etiquette',
    skills: 'Telephone Etiquette, Email Etiquette, First Impressions',
  },
  {
    category: '8. Personal & Financial Readiness',
    skills: 'Personal Finance Management, Future Planning, Workplace Financial Awareness',
  },
];

/**
 * Page 2: Static, read-only 12-Days Course Curriculum (matches reference PDF Page 2 verbatim).
 */
export const CurriculumPage: React.FC = () => {
  return (
    <div
      style={{
        ...PAGE_BASE_STYLE,
        padding: '44px 44px 36px 44px',
        fontFamily: DOCUMENT_FONT_FAMILY,
        color: '#0F172A',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          fontSize: '16.5px',
          fontWeight: 700,
          color: '#000000',
          marginBottom: '26px',
        }}
      >
        12-Days Course Curriculum
      </div>

      <div
        style={{
          fontSize: '12.5px',
          fontWeight: 700,
          color: '#000000',
          marginBottom: '8px',
        }}
      >
        Day-Wise Topics
      </div>

      <div
        style={{
          fontSize: '12px',
          fontWeight: 700,
          color: '#000000',
          marginBottom: '8px',
        }}
      >
        Week 1: AI Fundamentals &amp; Core Tools
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '14px' }}>
        {WEEK_1_TOPICS.map((item) => (
          <div
            key={item.day}
            style={{
              fontSize: '11.5px',
              lineHeight: 1.55,
              color: '#111827',
              textAlign: 'justify',
            }}
          >
            <span style={{ fontWeight: 700, color: '#000000' }}>
              &bull; {item.day}
            </span>{' '}
            &ndash; {item.desc}
          </div>
        ))}
      </div>

      <div
        style={{
          fontSize: '12px',
          fontWeight: 700,
          color: '#000000',
          marginBottom: '8px',
        }}
      >
        Week 2: Professional, Digital, &amp; Future Readiness
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {WEEK_2_TOPICS.map((item) => (
          <div
            key={item.day}
            style={{
              fontSize: '11.5px',
              lineHeight: 1.55,
              color: '#111827',
              textAlign: 'justify',
            }}
          >
            <span style={{ fontWeight: 700, color: '#000000' }}>
              &bull; {item.day}
            </span>{' '}
            &ndash; {item.desc}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Page 3: Static, read-only Employability Skill Categories (matches reference PDF Page 3 verbatim).
 */
export const SkillsPage: React.FC = () => {
  return (
    <div
      style={{
        ...PAGE_BASE_STYLE,
        padding: '48px 46px 40px 46px',
        fontFamily: DOCUMENT_FONT_FAMILY,
        color: '#0F172A',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          fontSize: '15.5px',
          fontWeight: 700,
          color: '#000000',
          marginBottom: '18px',
        }}
      >
        Employability Skill Categories
      </div>

      {/* Double-line formal Word-style table matching reference PDF Page 3 */}
      <div
        style={{
          border: '1.5px solid #000000',
          padding: '2px',
          backgroundColor: '#FFFFFF',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: '2px',
            backgroundColor: '#FFFFFF',
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  width: '39%',
                  border: '1px solid #000000',
                  padding: '7px 10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#000000',
                  textAlign: 'center',
                }}
              >
                Category
              </th>
              <th
                style={{
                  width: '61%',
                  border: '1px solid #000000',
                  padding: '7px 10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#000000',
                  textAlign: 'left',
                }}
              >
                Skills
              </th>
            </tr>
          </thead>
          <tbody>
            {EMPLOYABILITY_SKILLS.map((row) => (
              <tr key={row.category}>
                <td
                  style={{
                    border: '1px solid #000000',
                    padding: '6px 9px',
                    fontSize: '11.5px',
                    lineHeight: 1.42,
                    color: '#000000',
                    verticalAlign: 'top',
                    textAlign: 'left',
                  }}
                >
                  {row.category}
                </td>
                <td
                  style={{
                    border: '1px solid #000000',
                    padding: '6px 9px',
                    fontSize: '11.5px',
                    lineHeight: 1.42,
                    color: '#000000',
                    verticalAlign: 'top',
                    textAlign: 'justify',
                  }}
                >
                  {row.skills}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Paragraph below table */}
      <div
        style={{
          marginTop: '24px',
          fontSize: '11.5px',
          lineHeight: 1.65,
          color: '#111827',
          textAlign: 'justify',
        }}
      >
        This 12-day AI curriculum guides students from basic artificial intelligence concepts
        to practical, career-ready skills. It covers core definitions, technical subsets (ML,
        DL, NLP), and generative AI tools like ChatGPT and Perplexity. Students will gain
        hands-on experience in prompt engineering, Excel data analysis, and chatbot creation,
        while also exploring digital agency, career readiness, and the ethical use of
        technology for social good.
      </div>
    </div>
  );
};

interface TrainingPhotosPageProps {
  days: [number, number, number];
  dayPhotos: DayPhotosMap;
  showMainTitle?: boolean;
}

/**
 * Pages 4–7: Day-wise Training Photos (3 days x 2 photos = 6 images per page).
 * Matches exact reference PDF styling: red centered heading on Page 4, dark teal DAY-X headers,
 * and crisp olive-green borders around each photo frame.
 */
export const TrainingPhotosPage: React.FC<TrainingPhotosPageProps> = ({
  days,
  dayPhotos,
  showMainTitle = false,
}) => {
  const frameHeight = showMainTitle ? 182 : 196;

  return (
    <div
      style={{
        ...PAGE_BASE_STYLE,
        padding: showMainTitle ? '24px 28px 22px 28px' : '28px 28px 24px 28px',
        fontFamily: DOCUMENT_FONT_FAMILY,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {showMainTitle && (
        <div
          style={{
            textAlign: 'center',
            color: '#CC0000',
            fontSize: '14.5px',
            fontWeight: 800,
            marginBottom: '12px',
            lineHeight: 1.2,
          }}
        >
          Training Photos of 12 days
        </div>
      )}

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        {days.map((dayNum) => {
          const pair = dayPhotos[dayNum] || ['', ''];
          return (
            <div key={dayNum} style={{ width: '100%' }}>
              <div
                style={{
                  color: '#0E5066',
                  fontSize: '13px',
                  fontWeight: 800,
                  marginBottom: '6px',
                  paddingLeft: '26px',
                  letterSpacing: '0.2px',
                  lineHeight: 1.2,
                }}
              >
                DAY-{dayNum}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '14px',
                  width: '100%',
                }}
              >
                {[0, 1].map((slotIdx) => {
                  const src = pair[slotIdx];
                  return (
                    <div
                      key={slotIdx}
                      style={{
                        width: '100%',
                        height: `${frameHeight}px`,
                        border: '1.5px solid #769E4A',
                        backgroundColor: src ? '#FFFFFF' : '#F8FAFC',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxSizing: 'border-box',
                      }}
                    >
                      {src ? (
                        <img
                          src={src}
                          alt={`Day ${dayNum} Training Photo ${slotIdx + 1}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            display: 'block',
                            backgroundColor: '#FFFFFF',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            textAlign: 'center',
                            padding: '10px',
                            color: '#94A3B8',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          DAY-{dayNum} &middot; Photo {slotIdx + 1}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface ConclusionPageProps {
  conclusion: ComputedConclusionPreview;
}

/**
 * Page 8: Conclusion & Acknowledgment (matches reference PDF Page 8 serif formatting,
 * supporting individual contact blocks for both Primary Trainer and Co-Trainer).
 */
export const ConclusionPage: React.FC<ConclusionPageProps> = ({ conclusion }) => {
  const trainers = conclusion.trainer2
    ? [
        { label: 'Trainer', ...conclusion.trainer1 },
        { label: 'Co-Trainer', ...conclusion.trainer2 },
      ]
    : [{ label: 'Trainer', ...conclusion.trainer1 }];

  return (
    <div
      style={{
        ...PAGE_BASE_STYLE,
        padding: '56px 52px 44px 52px',
        fontFamily: DOCUMENT_FONT_FAMILY,
        fontStyle: 'italic',
        color: '#000000',
      }}
    >
      {/* Centered Bold Italic Red Heading */}
      <div
        style={{
          textAlign: 'center',
          color: '#D1121A',
          fontSize: '17px',
          fontWeight: 700,
          fontStyle: 'italic',
          marginBottom: '18px',
          lineHeight: 1.3,
        }}
      >
        Conclusion &amp; Acknowledgment
      </div>

      {/* Exact Reference Paragraph with Dynamic Bold-Italic Names */}
      <div
        style={{
          fontSize: '13px',
          lineHeight: 1.82,
          fontStyle: 'italic',
          color: '#000000',
          textAlign: 'left',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
        }}
      >
        I sincerely thank{' '}
        <span style={{ fontWeight: 700 }}>
          {conclusion.collegeHeadName}, {conclusion.collegeHeadDesignation}
        </span>
        ,{' '}
        <span style={{ fontWeight: 700 }}>
          {conclusion.managerName}, {conclusion.managerDesignation} &ndash;{' '}
          {conclusion.teamName}
        </span>
        , the <span style={{ fontWeight: 700 }}>College Management</span>,{' '}
        <span style={{ fontWeight: 700 }}>Magic Bus Team</span>, faculty members, and all
        participants for their valuable{' '}
        <span style={{ fontWeight: 700 }}>
          support, guidance, and active participation
        </span>{' '}
        in making this Training Program a successful one.
      </div>

      {/* Trainer & Co-Trainer Individual Contact Blocks */}
      <div
        style={{
          marginTop: '22px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        {trainers.map((trainer, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '7px',
              fontSize: '13px',
              fontStyle: 'italic',
              fontWeight: 700,
              lineHeight: 1.5,
            }}
          >
            {/* Name Row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
              <span style={{ width: '88px', flexShrink: 0, color: '#000000' }}>Name</span>
              <span style={{ width: '16px', flexShrink: 0, color: '#000000' }}>:</span>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  color: '#000000',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                }}
              >
                {trainer.name}
              </span>
            </div>

            {/* Email ID Row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
              <span style={{ width: '88px', flexShrink: 0, color: '#000000' }}>
                Email ID
              </span>
              <span style={{ width: '16px', flexShrink: 0, color: '#000000' }}>:</span>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  color: '#1155CC',
                  textDecoration: 'underline',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                }}
              >
                {trainer.email}
              </span>
            </div>

            {/* Mobile NO Row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
              <span style={{ width: '88px', flexShrink: 0, color: '#000000' }}>
                Mobile NO
              </span>
              <span style={{ width: '16px', flexShrink: 0, color: '#000000' }}>:</span>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  color: '#000000',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                }}
              >
                {trainer.mobile}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Foundation & Team Sign-off */}
      <div
        style={{
          marginTop: '24px',
          fontSize: '13.5px',
          fontStyle: 'italic',
          fontWeight: 700,
          color: '#000000',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
        }}
      >
        Infosys Foundation, {conclusion.teamName}
      </div>
    </div>
  );
};

interface DocumentAttachmentPageProps {
  heading: string;
  image: string;
}

/**
 * Pages 9–12+ (Appreciation Letter, Feedback Form, Attendance Sheet, MOE Letter, & Optional Extra Pages).
 * Centered bold red uppercase heading with a crisp green-bordered frame occupying 80% of the A4 page.
 */
export const DocumentAttachmentPage: React.FC<DocumentAttachmentPageProps> = ({
  heading,
  image,
}) => {
  return (
    <div
      style={{
        ...PAGE_BASE_STYLE,
        padding: '32px 34px 32px 34px',
        fontFamily: DOCUMENT_FONT_FAMILY,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Centered Bold Red Uppercase Heading */}
      <div
        style={{
          textAlign: 'center',
          fontFamily: DOCUMENT_FONT_FAMILY,
          color: '#D1121A',
          fontSize: '17px',
          fontWeight: 700,
          letterSpacing: '0.4px',
          textTransform: 'uppercase',
          marginBottom: '20px',
          lineHeight: 1.25,
          maxWidth: '100%',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
        }}
      >
        {heading || 'ATTACHMENT'}
      </div>

      {/* 80% Page Height Green-Bordered Document Frame (612px / 764px = 80.1%) */}
      <div
        style={{
          width: '472px',
          height: '612px',
          border: '1.5px solid #769E4A',
          backgroundColor: image ? '#FFFFFF' : '#F8FAFC',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          padding: image ? '4px' : '24px',
        }}
      >
        {image ? (
          <img
            src={image}
            alt={heading}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        ) : (
          <div
            style={{
              textAlign: 'center',
              fontFamily: DOCUMENT_FONT_FAMILY,
              color: '#94A3B8',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#64748B' }}>
              {heading}
            </div>
            <div style={{ fontSize: '12px', marginTop: '6px' }}>
              Upload scanned image from the Documents tab (fits 80% of page)
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
