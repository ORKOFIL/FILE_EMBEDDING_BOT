ALTER TABLE "document_chunks" ADD COLUMN "is_summary" BOOLEAN NOT NULL DEFAULT false;

-- 'simple' конфігурація, бо в стандартному Postgres немає української стемізації
ALTER TABLE "document_chunks"
  ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', "content")) STORED;

CREATE INDEX "document_chunks_search_vector_idx" ON "document_chunks" USING GIN ("search_vector");
