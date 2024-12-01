-- CreateTable
CREATE TABLE "dsc_masterlist" (
    "id" TEXT NOT NULL,
    "issuer" TEXT,
    "hashAlgorithm" TEXT,
    "signatureAlgorithm" TEXT,
    "validity" JSONB,
    "subjectKeyIdentifier" TEXT,
    "publicKeyDetails" JSONB,
    "rawPem" TEXT,
    "rawTxt" TEXT,
    "pk_modulus" TEXT,
    "pk_exponent" TEXT,
    "pk_bits" TEXT,
    "pk_curve" TEXT,
    "pk_hashAlgorithm" TEXT,
    "pk_mgf" TEXT,
    "pk_saltLength" TEXT,

    CONSTRAINT "dsc_masterlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "csca_masterlist" (
    "id" TEXT NOT NULL,
    "issuer" TEXT,
    "hashAlgorithm" TEXT,
    "signatureAlgorithm" TEXT,
    "validity" JSONB,
    "subjectKeyIdentifier" TEXT,
    "publicKeyDetails" JSONB,
    "rawPem" TEXT,
    "rawTxt" TEXT,
    "pk_modulus" TEXT,
    "pk_exponent" TEXT,
    "pk_bits" TEXT,
    "pk_curve" TEXT,
    "pk_hashAlgorithm" TEXT,
    "pk_mgf" TEXT,
    "pk_saltLength" TEXT,

    CONSTRAINT "csca_masterlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dsc_masterlist_pk_modulus_idx" ON "dsc_masterlist"("pk_modulus");

-- CreateIndex
CREATE INDEX "dsc_masterlist_pk_bits_idx" ON "dsc_masterlist"("pk_bits");

-- CreateIndex
CREATE INDEX "dsc_masterlist_pk_curve_idx" ON "dsc_masterlist"("pk_curve");

-- CreateIndex
CREATE INDEX "dsc_masterlist_hashAlgorithm_idx" ON "dsc_masterlist"("hashAlgorithm");

-- CreateIndex
CREATE INDEX "dsc_masterlist_signatureAlgorithm_idx" ON "dsc_masterlist"("signatureAlgorithm");

-- CreateIndex
CREATE INDEX "dsc_masterlist_subjectKeyIdentifier_idx" ON "dsc_masterlist"("subjectKeyIdentifier");

-- CreateIndex
CREATE INDEX "csca_masterlist_pk_modulus_idx" ON "csca_masterlist"("pk_modulus");

-- CreateIndex
CREATE INDEX "csca_masterlist_pk_bits_idx" ON "csca_masterlist"("pk_bits");

-- CreateIndex
CREATE INDEX "csca_masterlist_pk_curve_idx" ON "csca_masterlist"("pk_curve");

-- CreateIndex
CREATE INDEX "csca_masterlist_hashAlgorithm_idx" ON "csca_masterlist"("hashAlgorithm");

-- CreateIndex
CREATE INDEX "csca_masterlist_signatureAlgorithm_idx" ON "csca_masterlist"("signatureAlgorithm");

-- CreateIndex
CREATE INDEX "csca_masterlist_subjectKeyIdentifier_idx" ON "csca_masterlist"("subjectKeyIdentifier");
