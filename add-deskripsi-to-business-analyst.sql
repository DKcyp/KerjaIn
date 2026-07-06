-- Add deskripsi column to business_analyst table
ALTER TABLE public.business_analyst 
ADD COLUMN "deskripsi" TEXT;

-- Add comment for the new column
COMMENT ON COLUMN public.business_analyst."deskripsi" IS 'Deskripsi atau penjelasan detail tentang business analysis';