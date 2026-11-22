/**
 * Demo data for local development only.
 *
 * All conference names and URLs are FICTIONAL (example.org) on purpose: real
 * conference conditions must be verified from official sources before use.
 *
 *   pnpm --filter @paper/api db:seed            # create demo data (idempotent)
 *   pnpm --filter @paper/api db:seed -- --reset # remove demo data and create it again
 *
 * Demo accounts (password: Demo@12345)
 *   an@demo.local     MAIN_AUTHOR
 *   binh@demo.local   CO_AUTHOR
 *   chi@demo.local    VERIFIER
 *   dung@demo.local   SUPERVISOR
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DAY = 86_400_000;
const inDays = (n: number) => new Date(Date.now() + n * DAY);

/** Removes everything created by this seed (and nothing else). */
async function reset() {
  const group = await prisma.researchGroup.findFirst({
    where: { name: 'Nhóm nghiên cứu Demo', members: { some: { user: { email: { endsWith: '@demo.local' } } } } },
  });

  if (group) {
    await prisma.submissionTarget.deleteMany({ where: { paper: { groupId: group.id } } });
    await prisma.paper.deleteMany({ where: { groupId: group.id } });
    await prisma.researchGroup.delete({ where: { id: group.id } });
  }
  await prisma.user.deleteMany({ where: { email: { endsWith: '@demo.local' } } });
  console.log('Demo data removed.');
}

async function main() {
  if (process.argv.includes('--reset')) await reset();

  if (await prisma.user.findUnique({ where: { email: 'an@demo.local' } })) {
    console.log('Demo data already present – nothing to do.');
    return;
  }

  const passwordHash = await bcrypt.hash('Demo@12345', 10);

  const [an, binh, chi, dung] = await Promise.all(
    [
      ['an@demo.local', 'Nguyễn Văn An'],
      ['binh@demo.local', 'Trần Thị Bình'],
      ['chi@demo.local', 'Lê Minh Chi'],
      ['dung@demo.local', 'Phạm Quốc Dũng'],
    ].map(([email, displayName]) =>
      prisma.user.create({ data: { email, displayName, passwordHash } }),
    ),
  );

  const group = await prisma.researchGroup.create({
    data: {
      name: 'Nhóm nghiên cứu Demo',
      members: {
        create: [
          { userId: an.id, role: 'MAIN_AUTHOR' },
          { userId: binh.id, role: 'CO_AUTHOR' },
          { userId: chi.id, role: 'VERIFIER' },
          { userId: dung.id, role: 'SUPERVISOR' },
        ],
      },
    },
  });

  const paper = await prisma.paper.create({
    data: {
      groupId: group.id,
      createdById: an.id,
      title: 'A Lightweight Approach to Tracking Conference Submission Readiness',
      abstract:
        'Bài báo mẫu dùng để minh họa hệ thống: đề xuất cách tổ chức yêu cầu của hội nghị, công việc và minh chứng cho nhóm tác giả nhỏ.',
      researchArea: 'Software Engineering',
      manuscriptUrl: 'https://example.org/drafts/readiness-paper',
      notes: 'Dữ liệu minh họa – không phải bản thảo thật.',
      authors: {
        create: [
          { fullName: an.displayName, email: an.email, affiliation: 'Demo University', position: 1, isCorresponding: true },
          { fullName: binh.displayName, email: binh.email, affiliation: 'Demo University', position: 2 },
        ],
      },
    },
  });

  // ---- Archived (previous) target: shows Target History / Workflow B ----------------------
  const oldTarget = await prisma.submissionTarget.create({
    data: {
      paperId: paper.id,
      conferenceName: 'Demo International Workshop on Research Tooling',
      acronym: 'DemoWorkshop',
      conferenceYear: 2026,
      track: 'Short paper',
      cfpUrl: 'https://example.org/demo-workshop/cfp',
      authorGuidelinesUrl: 'https://example.org/demo-workshop/authors',
      timezone: 'UTC',
      fullPaperDeadline: inDays(-30),
      deadlineSource: 'https://example.org/demo-workshop/dates',
      status: 'ARCHIVED',
      archivedAt: inDays(-20),
      archivedById: an.id,
      archiveReason: 'Nhóm quyết định hướng tới hội nghị lớn hơn (DemoConf).',
    },
  });

  const oldReq = await prisma.requirement.create({
    data: {
      targetId: oldTarget.id,
      description: 'Bài nộp tối đa 4 trang, không tính tài liệu tham khảo.',
      type: 'MANDATORY',
      sourceType: 'CFP',
      sourceUrl: 'https://example.org/demo-workshop/cfp',
      sourceSection: 'Submission format',
      needsEvidence: true,
      status: 'VERIFIED',
    },
  });
  const oldEvidence = await prisma.evidence.create({
    data: {
      requirementId: oldReq.id,
      type: 'NOTE',
      description: 'Bản thảo v3 dài 4 trang (đã kiểm tra bằng bản PDF biên dịch).',
      versionReference: 'draft-v3.pdf',
      createdById: binh.id,
    },
  });
  await prisma.verification.create({
    data: {
      requirementId: oldReq.id,
      evidenceId: oldEvidence.id,
      verifierId: chi.id,
      result: 'PASSED',
      note: 'Đối chiếu với giới hạn trang trong CFP.',
    },
  });
  await prisma.task.create({
    data: {
      targetId: oldTarget.id,
      title: 'Rút gọn bản thảo xuống 4 trang',
      status: 'DONE',
      assigneeId: binh.id,
      createdById: an.id,
      dueAt: inDays(-32),
      requirementLinks: { create: [{ requirementId: oldReq.id }] },
    },
  });

  // ---- Active target ------------------------------------------------------------------------
  const target = await prisma.submissionTarget.create({
    data: {
      paperId: paper.id,
      previousTargetId: oldTarget.id,
      conferenceName: 'Demo Conference on Software Engineering',
      acronym: 'DemoConf',
      edition: '12th',
      conferenceYear: 2027,
      track: 'Research track',
      cfpUrl: 'https://example.org/democonf/cfp',
      authorGuidelinesUrl: 'https://example.org/democonf/authors',
      timezone: 'Etc/GMT+12',
      abstractDeadline: inDays(11),
      fullPaperDeadline: inDays(18),
      notificationDate: inDays(75),
      deadlineSource: 'https://example.org/democonf/dates (Anywhere on Earth)',
    },
  });

  const mk = (
    description: string,
    type: 'MANDATORY' | 'OPTIONAL' | 'RECOMMENDED',
    status: 'NOT_REVIEWED' | 'NEEDS_ACTION' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'NOT_APPLICABLE',
    extra: { sourceSection?: string; condition?: string; needsEvidence?: boolean; sourceType?: 'CFP' | 'AUTHOR_GUIDELINES' } = {},
  ) =>
    prisma.requirement.create({
      data: {
        targetId: target.id,
        description,
        type,
        status,
        sourceType: extra.sourceType ?? 'CFP',
        sourceUrl:
          (extra.sourceType ?? 'CFP') === 'CFP'
            ? 'https://example.org/democonf/cfp'
            : 'https://example.org/democonf/authors',
        sourceSection: extra.sourceSection ?? null,
        condition: extra.condition ?? null,
        needsEvidence: extra.needsEvidence ?? false,
      },
    });

  const rPages = await mk('Bài nộp tối đa 10 trang, không tính tài liệu tham khảo.', 'MANDATORY', 'PENDING_VERIFICATION', {
    sourceSection: 'Submission format',
    needsEvidence: true,
  });
  const rTemplate = await mk('Sử dụng template chính thức của hội nghị.', 'MANDATORY', 'VERIFIED', {
    sourceType: 'AUTHOR_GUIDELINES',
    sourceSection: 'Templates',
  });
  const rAnon = await mk('Bài nộp phải ẩn danh (double-blind): không lộ tên tác giả hoặc đơn vị.', 'MANDATORY', 'NEEDS_ACTION', {
    sourceSection: 'Review process',
    needsEvidence: true,
  });
  const rOriginal = await mk('Bài chưa được công bố hoặc nộp đồng thời ở nơi khác.', 'MANDATORY', 'NOT_REVIEWED', {
    sourceSection: 'Originality',
  });
  const rData = await mk('Tuyên bố về tính sẵn có của dữ liệu và mã nguồn.', 'RECOMMENDED', 'NOT_REVIEWED', {
    sourceType: 'AUTHOR_GUIDELINES',
  });
  await mk('Nộp kèm tài liệu bổ sung (artifact) để đánh giá.', 'OPTIONAL', 'NOT_APPLICABLE', {
    condition: 'Chỉ áp dụng cho bài thuộc nhóm Artifact Evaluation – không áp dụng với Research track.',
  });
  await mk('Bài báo cáo kết quả thực nghiệm có mô tả tập dữ liệu đã dùng.', 'MANDATORY', 'NOT_REVIEWED', {
    condition: 'Cần rà soát: CFP chưa nêu rõ với track này.',
  });

  await prisma.task.create({
    data: {
      targetId: target.id,
      title: 'Chuyển bản thảo sang template DemoConf',
      description: 'Dùng template LaTeX chính thức.',
      status: 'DONE',
      assigneeId: binh.id,
      createdById: an.id,
      dueAt: inDays(-2),
      requirementLinks: { create: [{ requirementId: rTemplate.id }] },
    },
  });

  await prisma.task.create({
    data: {
      targetId: target.id,
      title: 'Rút gọn nội dung xuống tối đa 10 trang',
      status: 'DONE',
      assigneeId: binh.id,
      createdById: an.id,
      dueAt: inDays(-1),
      requirementLinks: { create: [{ requirementId: rPages.id }] },
    },
  });

  await prisma.task.create({
    data: {
      targetId: target.id,
      title: 'Ẩn danh bản thảo (tên tác giả, acknowledgements, link repo)',
      status: 'IN_PROGRESS',
      assigneeId: binh.id,
      createdById: an.id,
      dueAt: inDays(5),
      requirementLinks: { create: [{ requirementId: rAnon.id }] },
    },
  });

  await prisma.task.create({
    data: {
      targetId: target.id,
      title: 'Hoàn thiện phần Evaluation và bảng kết quả',
      status: 'BLOCKED',
      description: 'Đang chờ kết quả chạy thực nghiệm bổ sung.',
      assigneeId: an.id,
      createdById: an.id,
      dueAt: inDays(-3),
    },
  });

  await prisma.task.create({
    data: {
      targetId: target.id,
      title: 'Rà soát CFP: xác định yêu cầu về dữ liệu/artifact',
      status: 'TODO',
      assigneeId: an.id,
      createdById: an.id,
      dueAt: inDays(3),
      requirementLinks: { create: [{ requirementId: rData.id }, { requirementId: rOriginal.id }] },
    },
  });

  await prisma.evidence.create({
    data: {
      requirementId: rPages.id,
      type: 'VERSION_REFERENCE',
      description: 'Bản PDF biên dịch có 9 trang nội dung + 2 trang tài liệu tham khảo.',
      versionReference: 'draft-v7.pdf (cập nhật hôm nay)',
      sourceUrl: 'https://example.org/drafts/readiness-paper',
      createdById: binh.id,
    },
  });

  console.log('Seeded demo data. Sign in with an@demo.local / Demo@12345');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
