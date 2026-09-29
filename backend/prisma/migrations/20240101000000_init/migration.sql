-- CreateTable
CREATE TABLE "LearningSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New Session',
    "language" TEXT NOT NULL DEFAULT 'python',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeState" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT '',
    "language" TEXT NOT NULL DEFAULT 'python',
    "stdin" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastExecStatus" TEXT,
    "lastExecOutput" TEXT,
    "lastExecStderr" TEXT,
    "lastExecTime" TEXT,
    "lastExecMemory" TEXT,
    "lastExecAt" TIMESTAMP(3),

    CONSTRAINT "CodeState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearningSession_userId_idx" ON "LearningSession"("userId");

-- CreateIndex
CREATE INDEX "LearningSession_userId_updatedAt_idx" ON "LearningSession"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_idx" ON "ChatMessage"("sessionId");

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_createdAt_idx" ON "ChatMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CodeState_sessionId_key" ON "CodeState"("sessionId");

-- CreateIndex
CREATE INDEX "CodeState_sessionId_idx" ON "CodeState"("sessionId");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LearningSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeState" ADD CONSTRAINT "CodeState_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LearningSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
