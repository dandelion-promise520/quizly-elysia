-- AlterTable
CREATE SEQUENCE blank_id_seq;
ALTER TABLE "Blank" ALTER COLUMN "id" SET DEFAULT nextval('blank_id_seq');
ALTER SEQUENCE blank_id_seq OWNED BY "Blank"."id";

-- AlterTable
CREATE SEQUENCE option_id_seq;
ALTER TABLE "Option" ALTER COLUMN "id" SET DEFAULT nextval('option_id_seq');
ALTER SEQUENCE option_id_seq OWNED BY "Option"."id";

-- AlterTable
CREATE SEQUENCE question_id_seq;
ALTER TABLE "Question" ALTER COLUMN "id" SET DEFAULT nextval('question_id_seq');
ALTER SEQUENCE question_id_seq OWNED BY "Question"."id";
