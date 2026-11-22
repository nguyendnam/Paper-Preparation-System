-- CreateEnum
CREATE TYPE "GroupRole" AS ENUM ('MAIN_AUTHOR', 'CO_AUTHOR', 'VERIFIER', 'SUPERVISOR');

-- CreateEnum
CREATE TYPE "TargetStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RequirementType" AS ENUM ('MANDATORY', 'OPTIONAL', 'RECOMMENDED');

-- CreateEnum
CREATE TYPE "RequirementStatus" AS ENUM ('NOT_REVIEWED', 'NEEDS_ACTION', 'PENDING_VERIFICATION', 'VERIFIED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "RequirementSourceType" AS ENUM ('CFP', 'AUTHOR_GUIDELINES', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('NOTE', 'URL', 'FILE', 'VERSION_REFERENCE');

-- CreateEnum
CREATE TYPE "VerificationResult" AS ENUM ('PASSED', 'FAILED', 'NEEDS_REVISION');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchGroup" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMembership" (
    "id" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "GroupRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paper" (
    "id" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "abstract" TEXT,
    "researchArea" TEXT,
    "manuscriptUrl" TEXT,
    "notes" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperAuthor" (
    "id" UUID NOT NULL,
    "paperId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "affiliation" TEXT,
    "position" INTEGER NOT NULL,
    "isCorresponding" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PaperAuthor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionTarget" (
    "id" UUID NOT NULL,
    "paperId" UUID NOT NULL,
    "conferenceName" TEXT NOT NULL,
    "acronym" TEXT,
    "edition" TEXT,
    "conferenceYear" INTEGER,
    "track" TEXT,
    "cfpUrl" TEXT,
    "authorGuidelinesUrl" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "abstractDeadline" TIMESTAMP(3),
    "fullPaperDeadline" TIMESTAMP(3),
    "notificationDate" TIMESTAMP(3),
    "status" "TargetStatus" NOT NULL DEFAULT 'ACTIVE',
    "archivedAt" TIMESTAMP(3),
    "archivedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubmissionTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requirement" (
    "id" UUID NOT NULL,
    "targetId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "type" "RequirementType" NOT NULL,
    "sourceType" "RequirementSourceType" NOT NULL,
    "sourceUrl" TEXT,
    "sourceSection" TEXT,
    "condition" TEXT,
    "status" "RequirementStatus" NOT NULL DEFAULT 'NOT_REVIEWED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Requirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" UUID NOT NULL,
    "targetId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assigneeId" UUID,
    "createdById" UUID NOT NULL,
    "dueAt" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskRequirement" (
    "taskId" UUID NOT NULL,
    "requirementId" UUID NOT NULL,

    CONSTRAINT "TaskRequirement_pkey" PRIMARY KEY ("taskId","requirementId")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" UUID NOT NULL,
    "requirementId" UUID NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "description" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "fileName" TEXT,
    "filePath" TEXT,
    "versionReference" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" UUID NOT NULL,
    "requirementId" UUID NOT NULL,
    "evidenceId" UUID,
    "verifierId" UUID NOT NULL,
    "result" "VerificationResult" NOT NULL,
    "note" TEXT,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_tokenHash_key" ON "UserSession"("tokenHash");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

-- CreateIndex
CREATE INDEX "GroupMembership_userId_idx" ON "GroupMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMembership_groupId_userId_key" ON "GroupMembership"("groupId", "userId");

-- CreateIndex
CREATE INDEX "Paper_groupId_createdAt_idx" ON "Paper"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "PaperAuthor_paperId_position_idx" ON "PaperAuthor"("paperId", "position");

-- CreateIndex
CREATE INDEX "SubmissionTarget_paperId_status_idx" ON "SubmissionTarget"("paperId", "status");

-- CreateIndex
CREATE INDEX "SubmissionTarget_fullPaperDeadline_idx" ON "SubmissionTarget"("fullPaperDeadline");

-- CreateIndex
CREATE INDEX "Requirement_targetId_status_idx" ON "Requirement"("targetId", "status");

-- CreateIndex
CREATE INDEX "Requirement_targetId_type_idx" ON "Requirement"("targetId", "type");

-- CreateIndex
CREATE INDEX "Task_targetId_status_idx" ON "Task"("targetId", "status");

-- CreateIndex
CREATE INDEX "Task_assigneeId_status_idx" ON "Task"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "Task_dueAt_idx" ON "Task"("dueAt");

-- CreateIndex
CREATE INDEX "TaskRequirement_requirementId_idx" ON "TaskRequirement"("requirementId");

-- CreateIndex
CREATE INDEX "Evidence_requirementId_createdAt_idx" ON "Evidence"("requirementId", "createdAt");

-- CreateIndex
CREATE INDEX "Verification_requirementId_verifiedAt_idx" ON "Verification"("requirementId", "verifiedAt");

-- CreateIndex
CREATE INDEX "Verification_evidenceId_idx" ON "Verification"("evidenceId");

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ResearchGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paper" ADD CONSTRAINT "Paper_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ResearchGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paper" ADD CONSTRAINT "Paper_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperAuthor" ADD CONSTRAINT "PaperAuthor_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionTarget" ADD CONSTRAINT "SubmissionTarget_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionTarget" ADD CONSTRAINT "SubmissionTarget_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "SubmissionTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "SubmissionTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskRequirement" ADD CONSTRAINT "TaskRequirement_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskRequirement" ADD CONSTRAINT "TaskRequirement_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Ensure each Paper has at most one ACTIVE SubmissionTarget
CREATE UNIQUE INDEX "one_active_target_per_paper"
ON "SubmissionTarget" ("paperId")
WHERE "status" = 'ACTIVE';