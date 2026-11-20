import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import type {
  AttendanceSheetData,
  CyberSecurityAttendanceData,
  CyberSecurityReportData,
  ReportFormData,
} from '../types/report.ts';

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(),
    email: text('email').notNull(),
    passwordHash: text('password_hash'),
    displayName: text('display_name'),
    photoUrl: text('photo_url'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('users_email_idx').on(table.email)]
);

export const trainingReports = pgTable(
  'training_reports',
  {
    id: text('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    collegeOrganization: text('college_organization').notNull().default(''),
    batchId: text('batch_id').notNull().default(''),
    trainerName: text('trainer_name').notNull().default(''),
    reportData: jsonb('report_data').$type<Partial<ReportFormData>>().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('training_reports_user_updated_idx').on(table.userId, table.updatedAt),
  ]
);

export const activeDrafts = pgTable('active_drafts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  activeReportId: text('active_report_id'),
  reportData: jsonb('report_data').$type<Partial<ReportFormData>>().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const savedAttendanceSheets = pgTable(
  'saved_attendance_sheets',
  {
    id: text('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    sheetType: text('sheet_type').notNull(), // '12days' | 'cyber' | 'cyber_report'
    title: text('title').notNull().default(''),
    sheetData: jsonb('sheet_data')
      .$type<AttendanceSheetData | CyberSecurityAttendanceData | CyberSecurityReportData>()
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('saved_attendance_sheets_user_updated_idx').on(
      table.userId,
      table.updatedAt
    ),
    index('saved_attendance_sheets_user_type_idx').on(
      table.userId,
      table.sheetType
    ),
  ]
);

export const usersRelations = relations(users, ({ many, one }) => ({
  reports: many(trainingReports),
  attendanceSheets: many(savedAttendanceSheets),
  activeDraft: one(activeDrafts, {
    fields: [users.id],
    references: [activeDrafts.userId],
  }),
}));

export const trainingReportsRelations = relations(trainingReports, ({ one }) => ({
  author: one(users, {
    fields: [trainingReports.userId],
    references: [users.id],
  }),
}));

export const savedAttendanceSheetsRelations = relations(
  savedAttendanceSheets,
  ({ one }) => ({
    owner: one(users, {
      fields: [savedAttendanceSheets.userId],
      references: [users.id],
    }),
  })
);

export const activeDraftsRelations = relations(activeDrafts, ({ one }) => ({
  owner: one(users, {
    fields: [activeDrafts.userId],
    references: [users.id],
  }),
}));
