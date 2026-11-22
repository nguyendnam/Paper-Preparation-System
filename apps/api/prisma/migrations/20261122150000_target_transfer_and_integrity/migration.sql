-- SubmissionTarget: deadline source (BR-15), archive reason and link to the previous target (Workflow B)
ALTER TABLE "SubmissionTarget"
  ADD COLUMN "deadlineSource" TEXT,
  ADD COLUMN "archiveReason" TEXT,
  ADD COLUMN "previousTargetId" UUID;

-- Requirement: needs-evidence flag (BR-17) and provenance of a controlled copy (BR-12)
ALTER TABLE "Requirement"
  ADD COLUMN "needsEvidence" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "copiedFromId" UUID;

-- Task: provenance of a controlled copy (BR-13)
ALTER TABLE "Task"
  ADD COLUMN "copiedFromId" UUID;

-- BR-03: at most one ACTIVE target per paper (MVP). Prisma cannot express partial unique indexes.
CREATE UNIQUE INDEX "SubmissionTarget_one_active_per_paper"
  ON "SubmissionTarget" ("paperId")
  WHERE "status" = 'ACTIVE';
