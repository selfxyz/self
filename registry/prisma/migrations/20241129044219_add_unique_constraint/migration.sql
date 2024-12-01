/*
  Warnings:

  - A unique constraint covering the columns `[id]` on the table `csca_masterlist` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `dsc_masterlist` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "csca_masterlist_id_key" ON "csca_masterlist"("id");

-- CreateIndex
CREATE UNIQUE INDEX "dsc_masterlist_id_key" ON "dsc_masterlist"("id");
