CREATE TABLE public.homework_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  homework_id UUID NOT NULL REFERENCES public.homeworks(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  comment TEXT,
  grade INTEGER,
  teacher_comment TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(homework_id, student_id)
);

ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own submissions"
ON public.homework_submissions FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Teachers view submissions for own homeworks"
ON public.homework_submissions FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.homeworks WHERE homeworks.id = homework_submissions.homework_id AND homeworks.created_by = auth.uid()));

CREATE POLICY "Students create own submissions"
ON public.homework_submissions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students update own submissions"
ON public.homework_submissions FOR UPDATE
TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Teachers update submissions for own homeworks"
ON public.homework_submissions FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.homeworks WHERE homeworks.id = homework_submissions.homework_id AND homeworks.created_by = auth.uid()));

CREATE TRIGGER update_homework_submissions_updated_at
BEFORE UPDATE ON public.homework_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();